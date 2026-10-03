import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { verificarSenha } from '../src/core/auth/senha.js';
import { limparBanco, prismaDeTeste } from './banco.js';
import { criarApp } from './criar-app.js';
import {
  type CondominioDeTeste,
  criarCondominio,
  criarUsuario,
} from './sessao-fixtures.js';

const rota = (slug: string) => `/api/v1/public/condominios/${slug}/moradores`;
const LOGIN = '/api/v1/auth/login';
const TELEFONE = '+5511987654321';

function corpo(ajustes: Record<string, unknown> = {}) {
  return {
    nome: '  João Pereira ',
    telefone: '(11) 98765-4321',
    bloco: ' bloco b ',
    apto: 'Apto 302',
    email: ' Joao@Exemplo.com ',
    senha: 'senha-do-joao-1',
    ...ajustes,
  };
}

const TELEFONE_EM_USO = {
  statusCode: 409,
  code: 'TELEFONE_EM_USO',
  message: 'Este telefone já tem cadastro neste condomínio.',
  details: { campo: 'telefone' },
};

const NAO_ENCONTRADO = {
  statusCode: 404,
  code: 'CONDOMINIO_NAO_ENCONTRADO',
  message: 'Condomínio não encontrado.',
};

// Cada describe sobe a própria app: o limite de 30 cadastros por IP do interceptor vale por instância.
function prepararSuite() {
  let app: INestApplication<App>;
  const estado = { condominio: undefined as unknown as CondominioDeTeste };

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
    estado.condominio = await criarCondominio('jardim-a');
  });

  const http = () => request(app.getHttpServer());
  const cadastrar = (dados = corpo(), slug = 'jardim-a') =>
    http().post(rota(slug)).send(dados);
  return { http, cadastrar, estado };
}

describe('Cadastro do morador (e2e): regras', () => {
  const { http, cadastrar, estado } = prepararSuite();
  let condominio: CondominioDeTeste;

  beforeEach(() => {
    condominio = estado.condominio;
  });

  it('cria o morador PENDENTE com telefone, bloco, apto e e-mail normalizados, sem abrir sessão', async () => {
    const resposta = await cadastrar().expect(201);

    expect(resposta.body).toEqual({
      nome: 'João Pereira',
      status: 'PENDENTE',
      condominio: { nome: condominio.nome, slug: 'jardim-a' },
    });
    expect(resposta.headers['set-cookie']).toBeUndefined();
    expect(resposta.headers['cache-control']).toBe('no-store');

    const usuarios = await prismaDeTeste().usuario.findMany();
    expect(usuarios).toHaveLength(1);
    const [morador] = usuarios;
    expect(morador).toMatchObject({
      condominioId: condominio.id,
      nome: 'João Pereira',
      telefone: TELEFONE,
      email: 'joao@exemplo.com',
      bloco: 'B',
      apto: '302',
      papel: 'MORADOR',
      status: 'PENDENTE',
      senhaTemporaria: false,
      slotAdmin: null,
    });
    await expect(
      verificarSenha(morador.senhaHash, 'senha-do-joao-1'),
    ).resolves.toBe(true);
  });

  it('o login do morador recém-cadastrado responde 403 CADASTRO_PENDENTE', async () => {
    await cadastrar().expect(201);

    const resposta = await http()
      .post(LOGIN)
      .send({
        slug: 'jardim-a',
        telefone: '11987654321',
        senha: 'senha-do-joao-1',
      })
      .expect(403);

    expect(resposta.body).toEqual({
      statusCode: 403,
      code: 'CADASTRO_PENDENTE',
      message: 'Seu cadastro ainda aguarda aprovação da administração.',
    });
    expect(resposta.headers['set-cookie']).toBeUndefined();
  });

  it('telefone já cadastrado no mesmo condomínio, em outra formatação: 409 TELEFONE_EM_USO', async () => {
    await cadastrar().expect(201);

    const resposta = await cadastrar(
      corpo({ telefone: '+55 11 98765 4321', nome: 'Outra pessoa' }),
    ).expect(409);

    expect(resposta.body).toEqual(TELEFONE_EM_USO);
    const usuarios = await prismaDeTeste().usuario.findMany();
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].nome).toBe('João Pereira');
  });

  it.each([
    ['ATIVO', 'MORADOR'],
    ['INATIVO', 'MORADOR'],
    ['PENDENTE', 'MORADOR'],
    ['ATIVO', 'SINDICO'],
    ['RECUSADO', 'SUBSINDICO'],
  ] as const)(
    'telefone de %s com papel %s: 409, sem alterar o registro',
    async (status, papel) => {
      const { id } = await criarUsuario(condominio.id, {
        telefone: TELEFONE,
        status,
        papel,
        nome: 'Original',
      });

      const resposta = await cadastrar().expect(409);

      expect(resposta.body).toEqual(TELEFONE_EM_USO);
      const registro = await prismaDeTeste().usuario.findUniqueOrThrow({
        where: { id },
      });
      expect(registro).toMatchObject({ nome: 'Original', status, papel });
    },
  );

  it('o mesmo telefone em outro condomínio é um cadastro independente', async () => {
    const outro = await criarCondominio('jardim-b');
    await criarUsuario(condominio.id, { telefone: TELEFONE });

    await cadastrar(corpo(), 'jardim-b').expect(201);

    const doOutro = await prismaDeTeste().usuario.findMany({
      where: { condominioId: outro.id },
    });
    expect(doOutro).toHaveLength(1);
    expect(doOutro[0]).toMatchObject({
      telefone: TELEFONE,
      status: 'PENDENTE',
    });
    await expect(prismaDeTeste().usuario.count()).resolves.toBe(2);
  });

  it('recadastro de RECUSADO reabre o mesmo registro como PENDENTE, com dados e senha novos', async () => {
    const { id } = await criarUsuario(condominio.id, {
      telefone: TELEFONE,
      status: 'RECUSADO',
      nome: 'Nome antigo',
    });
    const antes = await prismaDeTeste().usuario.findUniqueOrThrow({
      where: { id },
    });

    const resposta = await cadastrar(
      corpo({ bloco: 'Torre 2', apto: '12', email: '' }),
    ).expect(201);

    expect(resposta.body).toEqual({
      nome: 'João Pereira',
      status: 'PENDENTE',
      condominio: { nome: condominio.nome, slug: 'jardim-a' },
    });
    const usuarios = await prismaDeTeste().usuario.findMany();
    expect(usuarios).toHaveLength(1);
    const [depois] = usuarios;
    expect(depois).toMatchObject({
      id,
      nome: 'João Pereira',
      telefone: TELEFONE,
      bloco: 'TORRE 2',
      apto: '12',
      email: null,
      papel: 'MORADOR',
      status: 'PENDENTE',
      versaoSessao: antes.versaoSessao + 1,
    });
    expect(depois.criadoEm).toEqual(antes.criadoEm);

    const login = (senha: string) =>
      http().post(LOGIN).send({ slug: 'jardim-a', telefone: TELEFONE, senha });
    await login('senha-forte-123').expect(401);
    const comSenhaNova = await login('senha-do-joao-1').expect(403);
    expect(comSenhaNova.body.code).toBe('CADASTRO_PENDENTE');
  });

  it('na corrida pelo mesmo telefone, um cria e o outro recebe 409', async () => {
    const status = (await Promise.all([cadastrar(), cadastrar()]))
      .map((r) => r.status)
      .sort((x, y) => x - y);

    expect(status).toEqual([201, 409]);
    await expect(prismaDeTeste().usuario.count()).resolves.toBe(1);
  });

  it.each([['nao-existe'], ['FORMATO-INVALIDO'], ['inativo']])(
    'slug %s responde o mesmo 404, sem revelar o status',
    async (slug) => {
      await criarCondominio('inativo', 'INATIVO');

      const resposta = await cadastrar(corpo(), slug).expect(404);

      expect(resposta.body).toEqual(NAO_ENCONTRADO);
      await expect(prismaDeTeste().usuario.count()).resolves.toBe(0);
    },
  );
});

describe('Cadastro do morador (e2e): validação e contrato', () => {
  const { http, cadastrar } = prepararSuite();

  it.each([
    ['sem bloco', corpo({ bloco: undefined }), 'bloco'],
    ['bloco só com espaços', corpo({ bloco: '   ' }), 'bloco'],
    ['bloco longo', corpo({ bloco: 'X'.repeat(21) }), 'bloco'],
    ['sem apto', corpo({ apto: undefined }), 'apto'],
    ['apto longo', corpo({ apto: '1'.repeat(11) }), 'apto'],
    ['telefone fixo', corpo({ telefone: '(11) 3123-4567' }), 'telefone'],
    ['senha curta', corpo({ senha: '1234567' }), 'senha'],
    ['e-mail inválido', corpo({ email: 'joao@' }), 'email'],
    ['nome vazio', corpo({ nome: '  ' }), 'nome'],
    ['status enviado pelo cliente', corpo({ status: 'ATIVO' }), 'status'],
    ['papel enviado pelo cliente', corpo({ papel: 'SINDICO' }), 'papel'],
    [
      'condominioId enviado pelo cliente',
      corpo({ condominioId: 'outro' }),
      'condominioId',
    ],
  ])('recusa %s com 400 no campo certo', async (_, dados, campo) => {
    const resposta = await cadastrar(dados).expect(400);

    expect(resposta.body.code).toBe('VALIDACAO_FALHOU');
    expect(
      resposta.body.details.map((d: { campo: string }) => d.campo),
    ).toContain(campo);
    await expect(prismaDeTeste().usuario.count()).resolves.toBe(0);
  });

  it('usa as mensagens da especificação de UI', async () => {
    const resposta = await cadastrar(
      corpo({ bloco: '', apto: ' ', telefone: '123', senha: 'curta' }),
    ).expect(400);

    const erros = Object.fromEntries(
      resposta.body.details.map((d: { campo: string; erros: string[] }) => [
        d.campo,
        d.erros,
      ]),
    );
    expect(erros['bloco']).toContain('Informe o bloco.');
    expect(erros['apto']).toContain('Informe o apartamento.');
    expect(erros['telefone']).toContain(
      'Informe um celular com DDD, como (11) 91234-5678.',
    );
    expect(erros['senha']).toContain(
      'A senha precisa ter pelo menos 8 caracteres.',
    );
  });

  it('documenta a rota no Swagger', async () => {
    const resposta = await http().get('/api/docs-json').expect(200);

    const respostas =
      resposta.body.paths['/api/v1/public/condominios/{slug}/moradores'].post
        .responses;
    expect(Object.keys(respostas)).toEqual(
      expect.arrayContaining(['201', '400', '404', '409', '429']),
    );
  });
});

describe('Cadastro do morador (e2e): limite de tentativas', () => {
  const { cadastrar } = prepararSuite();

  it('aplica o limite do cadastro público por IP, com o 429 padrão', async () => {
    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
      await cadastrar(corpo({ bloco: '' })).expect(400);
    }

    const resposta = await cadastrar().expect(429);

    expect(resposta.body).toEqual({
      statusCode: 429,
      code: 'MUITAS_REQUISICOES',
      message: 'Muitas requisições. Tente de novo em instantes.',
    });
    await expect(prismaDeTeste().usuario.count()).resolves.toBe(0);
  });
});
