import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { verificarSenha } from '../src/core/auth/senha.js';
import { limparBanco, prismaDeTeste } from './banco.js';
import { criarApp } from './criar-app.js';

const ROTA = '/api/v1/public/condominios';

function corpo(slug: string, ajustes: Record<string, unknown> = {}) {
  return {
    nome: 'Residencial Jardim das Flores',
    slug,
    sindico: {
      nome: 'Maria Souza',
      telefone: '(11) 91234-5678',
      email: '  Maria@Exemplo.com ',
      senha: 'senha-forte-1',
    },
    ...ajustes,
  };
}

describe('Condomínios públicos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  describe('POST /public/condominios', () => {
    it('cria o condomínio e o síndico ativos, com telefone em E.164 e senha com hash', async () => {
      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .send(corpo('jardim-das-flores'))
        .expect(201);

      expect(resposta.body).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        nome: 'Residencial Jardim das Flores',
        slug: 'jardim-das-flores',
      });
      expect(JSON.stringify(resposta.body)).not.toMatch(/senha|hash/i);

      const prisma = prismaDeTeste();
      const condominio = await prisma.condominio.findUniqueOrThrow({
        where: { id: resposta.body.id },
      });
      expect(condominio).toMatchObject({
        status: 'ATIVO',
        proximoNumeroOcorrencia: 1,
      });

      const usuarios = await prisma.usuario.findMany({
        where: { condominioId: condominio.id },
      });
      expect(usuarios).toHaveLength(1);
      const [sindico] = usuarios;
      expect(sindico).toMatchObject({
        nome: 'Maria Souza',
        telefone: '+5511912345678',
        email: 'maria@exemplo.com',
        papel: 'SINDICO',
        status: 'ATIVO',
        slotAdmin: 1,
        senhaTemporaria: false,
        versaoSessao: 1,
        bloco: null,
        apto: null,
      });
      expect(sindico.senhaHash).toMatch(/^\$argon2id\$/);
      await expect(
        verificarSenha(sindico.senhaHash, 'senha-forte-1'),
      ).resolves.toBe(true);
    });

    it.each([
      ['+55 (21) 98765-4321', '+5521987654321'],
      ['21987654321', '+5521987654321'],
      ['55 21 98765 4321', '+5521987654321'],
    ])('normaliza o telefone %s para %s', async (telefone, esperado) => {
      await request(app.getHttpServer())
        .post(ROTA)
        .send(
          corpo('tel-normalizado', {
            sindico: { nome: 'Ana', telefone, senha: 'senha-forte-1' },
          }),
        )
        .expect(201);

      const sindico = await prismaDeTeste().usuario.findFirstOrThrow({
        where: { condominio: { slug: 'tel-normalizado' } },
      });
      expect(sindico.telefone).toBe(esperado);
      expect(sindico.email).toBeNull();
    });

    it('recusa slug em uso com 409 SLUG_EM_USO, sem criar outro síndico', async () => {
      await request(app.getHttpServer())
        .post(ROTA)
        .send(corpo('repetido'))
        .expect(201);

      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .send(corpo('repetido', { nome: 'Outro condomínio' }))
        .expect(409);

      expect(resposta.body).toEqual({
        statusCode: 409,
        code: 'SLUG_EM_USO',
        message: 'Endereço já em uso. Tente outro.',
        details: { campo: 'slug' },
      });
      const prisma = prismaDeTeste();
      await expect(prisma.condominio.count()).resolves.toBe(1);
      await expect(prisma.usuario.count()).resolves.toBe(1);
    });

    it('na corrida pelo mesmo slug, um cria e o outro recebe 409', async () => {
      const enviar = () =>
        request(app.getHttpServer()).post(ROTA).send(corpo('disputado'));

      const status = (await Promise.all([enviar(), enviar()]))
        .map((r) => r.status)
        .sort((x, y) => x - y);

      expect(status).toEqual([201, 409]);
      await expect(prismaDeTeste().usuario.count()).resolves.toBe(1);
    });

    it.each([
      ['slug com maiúscula', corpo('Jardim'), 'slug'],
      ['slug curto', corpo('ab'), 'slug'],
      ['slug com hífen na ponta', corpo('-jardim'), 'slug'],
      ['slug com acento', corpo('jardim-são-paulo'), 'slug'],
      [
        'telefone fixo',
        corpo('tel-fixo', {
          sindico: {
            nome: 'Ana',
            telefone: '(11) 3123-4567',
            senha: 'senha-forte-1',
          },
        }),
        'sindico.telefone',
      ],
      [
        'senha curta',
        corpo('senha-curta', {
          sindico: { nome: 'Ana', telefone: '11912345678', senha: '1234567' },
        }),
        'sindico.senha',
      ],
      [
        'e-mail inválido',
        corpo('email-ruim', {
          sindico: {
            nome: 'Ana',
            telefone: '11912345678',
            email: 'ana@',
            senha: 'senha-forte-1',
          },
        }),
        'sindico.email',
      ],
      ['nome vazio', corpo('nome-vazio', { nome: '   ' }), 'nome'],
      ['sem síndico', corpo('sem-sindico', { sindico: undefined }), 'sindico'],
      [
        'papel enviado pelo cliente',
        corpo('papel', {
          sindico: {
            nome: 'Ana',
            telefone: '11912345678',
            senha: 'senha-forte-1',
            papel: 'MORADOR',
          },
        }),
        'sindico.papel',
      ],
      [
        'condominioId enviado pelo cliente',
        corpo('com-cid', { condominioId: 'outro' }),
        'condominioId',
      ],
    ])('recusa %s com 400 no campo certo', async (_, enviado, campo) => {
      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .send(enviado)
        .expect(400);

      expect(resposta.body.code).toBe('VALIDACAO_FALHOU');
      expect(
        resposta.body.details.map((d: { campo: string }) => d.campo),
      ).toContain(campo);
      await expect(prismaDeTeste().condominio.count()).resolves.toBe(0);
    });

    it('usa as mensagens da especificação de UI', async () => {
      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .send(
          corpo('Inválido', {
            sindico: { nome: 'Ana', telefone: '123', senha: 'curta' },
          }),
        )
        .expect(400);

      const erros = Object.fromEntries(
        resposta.body.details.map((d: { campo: string; erros: string[] }) => [
          d.campo,
          d.erros,
        ]),
      );
      expect(erros['slug']).toContain(
        'Use só letras minúsculas, números e hífen.',
      );
      expect(erros['sindico.telefone']).toContain(
        'Informe um celular com DDD, como (11) 91234-5678.',
      );
      expect(erros['sindico.senha']).toContain(
        'A senha precisa ter pelo menos 8 caracteres.',
      );
    });
  });

  describe('GET /public/condominios/:slug', () => {
    it('devolve só nome e slug do condomínio ativo, sem cache', async () => {
      await request(app.getHttpServer())
        .post(ROTA)
        .send(corpo('visivel'))
        .expect(201);

      const resposta = await request(app.getHttpServer())
        .get(`${ROTA}/visivel`)
        .expect(200);

      expect(resposta.body).toEqual({
        nome: 'Residencial Jardim das Flores',
        slug: 'visivel',
      });
      expect(resposta.headers['cache-control']).toBe('no-store');
    });

    it.each([['nao-existe'], ['FORMATO-INVALIDO'], ['a']])(
      'responde 404 CONDOMINIO_NAO_ENCONTRADO para %s',
      async (slug) => {
        const resposta = await request(app.getHttpServer())
          .get(`${ROTA}/${slug}`)
          .expect(404);

        expect(resposta.body).toEqual({
          statusCode: 404,
          code: 'CONDOMINIO_NAO_ENCONTRADO',
          message: 'Condomínio não encontrado.',
        });
      },
    );

    it('responde o mesmo 404 para condomínio inativo', async () => {
      await request(app.getHttpServer())
        .post(ROTA)
        .send(corpo('inativo'))
        .expect(201);
      await prismaDeTeste().condominio.update({
        where: { slug: 'inativo' },
        data: { status: 'INATIVO' },
      });

      const resposta = await request(app.getHttpServer())
        .get(`${ROTA}/inativo`)
        .expect(404);

      expect(resposta.body.code).toBe('CONDOMINIO_NAO_ENCONTRADO');
    });
  });

  it('documenta as rotas no Swagger', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const caminhos = resposta.body.paths;
    expect(
      caminhos['/api/v1/public/condominios'].post.responses,
    ).toHaveProperty('409');
    expect(
      caminhos['/api/v1/public/condominios/{slug}'].get.responses,
    ).toHaveProperty('404');
  });
});
