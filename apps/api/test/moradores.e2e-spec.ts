import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { limparBanco, prismaDeTeste } from './banco.js';
import { criarApp } from './criar-app.js';
import {
  type CondominioDeTeste,
  criarCondominio,
  criarUsuario,
  entrar,
  SENHA,
} from './sessao-fixtures.js';

const BASE = '/api/v1/admin/moradores';
const LOGIN = '/api/v1/auth/login';
const ME = '/api/v1/me';

const TEL_SINDICO = '+5511933330001';
const TEL_SUBSINDICO = '+5511933330002';
const TEL_JOAO = '+5511933330010';
const TEL_ANA = '+5511933330011';
const TEL_CARLA = '+5511933330012';
const TEL_DIEGO = '+5511933330013';
const TEL_EVA = '+5511933330014';

const ID_INEXISTENTE = '0199a5c2-0000-7000-8000-000000000000';

describe('Gestão de moradores (e2e)', () => {
  let app: INestApplication<App>;
  let a: CondominioDeTeste;
  let sindicoId: string;
  let subsindicoId: string;
  let joao: string;
  let ana: string;
  let carla: string;
  let diego: string;
  let eva: string;
  let cookieSindico: string;

  const http = () => request(app.getHttpServer());
  const comoSindico = {
    get: (url: string) => http().get(url).set('Cookie', cookieSindico),
    post: (url: string, corpo?: object) =>
      http()
        .post(url)
        .set('Cookie', cookieSindico)
        .send(corpo ?? {}),
  };

  async function auditorias(alvoId: string) {
    return prismaDeTeste().auditoriaAdmin.findMany({
      where: { alvoId },
      orderBy: { criadoEm: 'asc' },
      select: { acao: true, atorId: true, dados: true, condominioId: true },
    });
  }

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
    a = await criarCondominio('cond-moradores');
    sindicoId = (
      await criarUsuario(a.id, {
        telefone: TEL_SINDICO,
        papel: 'SINDICO',
        bloco: 'A',
        apto: '101',
      })
    ).id;
    subsindicoId = (
      await criarUsuario(a.id, {
        telefone: TEL_SUBSINDICO,
        papel: 'SUBSINDICO',
      })
    ).id;
    const base = Date.parse('2026-10-01T12:00:00.000Z');
    const em = (minutos: number) => new Date(base + minutos * 60_000);
    joao = (
      await criarUsuario(a.id, {
        telefone: TEL_JOAO,
        nome: 'João Pereira',
        status: 'PENDENTE',
        bloco: 'B',
        apto: '302',
        criadoEm: em(1),
      })
    ).id;
    ana = (
      await criarUsuario(a.id, {
        telefone: TEL_ANA,
        nome: 'Ana Lima',
        status: 'PENDENTE',
        bloco: 'C',
        apto: '302',
        criadoEm: em(2),
      })
    ).id;
    carla = (
      await criarUsuario(a.id, {
        telefone: TEL_CARLA,
        nome: 'Carla Dias',
        status: 'ATIVO',
        bloco: 'B',
        apto: '101',
        criadoEm: em(3),
      })
    ).id;
    diego = (
      await criarUsuario(a.id, {
        telefone: TEL_DIEGO,
        nome: 'Diego_Souza 100%',
        status: 'INATIVO',
        bloco: 'D',
        apto: '1',
        criadoEm: em(4),
      })
    ).id;
    eva = (
      await criarUsuario(a.id, {
        telefone: TEL_EVA,
        nome: 'Eva Rocha',
        status: 'RECUSADO',
        bloco: 'E',
        apto: '2',
        criadoEm: em(5),
      })
    ).id;
    cookieSindico = await entrar(app, 'cond-moradores', TEL_SINDICO);
  });

  describe('GET /admin/moradores', () => {
    it('lista só papel MORADOR, do mais recente ao mais antigo, sem dados sensíveis', async () => {
      const resposta = await comoSindico.get(BASE).expect(200);

      expect(resposta.headers['cache-control']).toBe('no-store');
      expect(resposta.body.proximoCursor).toBeNull();
      expect(resposta.body.itens.map((m: { id: string }) => m.id)).toEqual([
        eva,
        diego,
        carla,
        ana,
        joao,
      ]);
      expect(resposta.body.itens[4]).toEqual({
        id: joao,
        nome: 'João Pereira',
        telefone: TEL_JOAO,
        bloco: 'B',
        apto: '302',
        status: 'PENDENTE',
        criadoEm: '2026-10-01T12:01:00.000Z',
        motivoRecusa: null,
      });
      const texto = JSON.stringify(resposta.body);
      expect(texto).not.toContain(sindicoId);
      expect(texto).not.toContain(subsindicoId);
      expect(texto).not.toMatch(/senha|argon|versao|slot/i);
    });

    it('filtra por um ou mais status (abas da UI)', async () => {
      const pendentes = await comoSindico
        .get(`${BASE}?status=PENDENTE`)
        .expect(200);
      expect(pendentes.body.itens.map((m: { id: string }) => m.id)).toEqual([
        ana,
        joao,
      ]);

      const terceiraAba = await comoSindico
        .get(`${BASE}?status=RECUSADO,INATIVO`)
        .expect(200);
      expect(
        terceiraAba.body.itens.map((m: { id: string; status: string }) => [
          m.id,
          m.status,
        ]),
      ).toEqual([
        [eva, 'RECUSADO'],
        [diego, 'INATIVO'],
      ]);

      const repetido = await comoSindico
        .get(`${BASE}?status=RECUSADO&status=INATIVO`)
        .expect(200);
      expect(repetido.body).toEqual(terceiraAba.body);

      const invalido = await comoSindico
        .get(`${BASE}?status=ADMIN`)
        .expect(400);
      expect(invalido.body.code).toBe('VALIDACAO_FALHOU');
    });

    it('busca por nome, bloco e apto sem diferenciar maiúsculas e acentos', async () => {
      const ids = async (q: string, status?: string) => {
        const consulta = new URLSearchParams({ q });
        if (status) consulta.set('status', status);
        const resposta = await comoSindico
          .get(`${BASE}?${consulta.toString()}`)
          .expect(200);
        return resposta.body.itens.map((m: { id: string }) => m.id);
      };

      expect(await ids('joao')).toEqual([joao]);
      expect(await ids('LIMA')).toEqual([ana]);
      expect(await ids('302')).toEqual([ana, joao]);
      expect(await ids('b 302')).toEqual([joao]);
      expect(await ids('302', 'ATIVO')).toEqual([]);
      expect(await ids('%')).toEqual([diego]);
      expect(await ids('_')).toEqual([diego]);
      expect(await ids('\\')).toEqual([]);
      expect(await ids('zzz')).toEqual([]);
    });

    it('pagina por cursor sem repetir nem pular itens', async () => {
      const vistos: string[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      do {
        const url: string = cursor
          ? `${BASE}?limite=2&cursor=${encodeURIComponent(cursor)}`
          : `${BASE}?limite=2`;
        const resposta = await comoSindico.get(url).expect(200);
        vistos.push(...resposta.body.itens.map((m: { id: string }) => m.id));
        cursor = resposta.body.proximoCursor;
        paginas += 1;
      } while (cursor && paginas < 10);

      expect(paginas).toBe(3);
      expect(vistos).toEqual([eva, diego, carla, ana, joao]);
    });

    it('cursor adulterado responde 400 CURSOR_INVALIDO', async () => {
      const resposta = await comoSindico
        .get(`${BASE}?cursor=adulterado`)
        .expect(400);
      expect(resposta.body.code).toBe('CURSOR_INVALIDO');
    });

    it('GET /contagem conta só moradores, por status', async () => {
      const resposta = await comoSindico.get(`${BASE}/contagem`).expect(200);
      expect(resposta.body).toEqual({
        pendentes: 2,
        ativos: 1,
        recusados: 1,
        inativos: 1,
      });
    });
  });

  describe('aprovar', () => {
    it('o morador aprovado consegue entrar e a ação fica auditada', async () => {
      await http()
        .post(LOGIN)
        .send({ slug: 'cond-moradores', telefone: TEL_JOAO, senha: SENHA })
        .expect(403);

      const resposta = await comoSindico
        .post(`${BASE}/${joao}/aprovar`)
        .expect(200);
      expect(resposta.body).toMatchObject({
        id: joao,
        status: 'ATIVO',
        motivoRecusa: null,
      });

      const cookie = await entrar(app, 'cond-moradores', TEL_JOAO);
      const me = await http().get(ME).set('Cookie', cookie).expect(200);
      expect(me.body).toMatchObject({ papel: 'MORADOR', status: 'ATIVO' });

      expect(await auditorias(joao)).toEqual([
        {
          acao: 'MORADOR_APROVADO',
          atorId: sindicoId,
          condominioId: a.id,
          dados: { statusAnterior: 'PENDENTE', statusNovo: 'ATIVO' },
        },
      ]);
      const contagem = await comoSindico.get(`${BASE}/contagem`).expect(200);
      expect(contagem.body.pendentes).toBe(1);
    });

    it('o subsíndico também modera, e fica como ator na auditoria', async () => {
      const cookie = await entrar(app, 'cond-moradores', TEL_SUBSINDICO);
      await http()
        .post(`${BASE}/${joao}/aprovar`)
        .set('Cookie', cookie)
        .expect(200);
      await http()
        .post(`${BASE}/${carla}/inativar`)
        .set('Cookie', cookie)
        .expect(200);
      await http().get(BASE).set('Cookie', cookie).expect(200);

      expect((await auditorias(joao))[0].atorId).toBe(subsindicoId);
      expect((await auditorias(carla))[0].atorId).toBe(subsindicoId);
    });
  });

  describe('recusar', () => {
    it('exige motivo', async () => {
      const semMotivo = await comoSindico
        .post(`${BASE}/${joao}/recusar`)
        .expect(400);
      expect(semMotivo.body.details).toEqual([
        expect.objectContaining({
          campo: 'motivo',
          erros: expect.arrayContaining(['Informe o motivo.']),
        }),
      ]);
      const vazio = await comoSindico
        .post(`${BASE}/${joao}/recusar`, { motivo: '   ' })
        .expect(400);
      expect(vazio.body.details).toEqual([
        { campo: 'motivo', erros: ['Informe o motivo.'] },
      ]);
      await comoSindico
        .post(`${BASE}/${joao}/recusar`, { motivo: 'x'.repeat(501) })
        .expect(400);
      await comoSindico
        .post(`${BASE}/${joao}/recusar`, { motivo: 'ok', extra: 1 })
        .expect(400);

      expect(await auditorias(joao)).toEqual([]);
    });

    it('recusa com motivo, mostra o motivo na lista e bloqueia o login', async () => {
      const resposta = await comoSindico
        .post(`${BASE}/${joao}/recusar`, {
          motivo: '  Apto 302 do bloco B não existe.  ',
        })
        .expect(200);
      expect(resposta.body).toMatchObject({
        status: 'RECUSADO',
        motivoRecusa: 'Apto 302 do bloco B não existe.',
      });

      const lista = await comoSindico
        .get(`${BASE}?status=RECUSADO`)
        .expect(200);
      expect(
        lista.body.itens.map((m: { id: string; motivoRecusa: string }) => [
          m.id,
          m.motivoRecusa,
        ]),
      ).toEqual([
        [eva, null],
        [joao, 'Apto 302 do bloco B não existe.'],
      ]);

      const login = await http()
        .post(LOGIN)
        .send({ slug: 'cond-moradores', telefone: TEL_JOAO, senha: SENHA })
        .expect(403);
      expect(login.body.code).toBe('CADASTRO_RECUSADO');
    });

    it('depois de voltar a PENDENTE (recadastro da #7), o motivo antigo some e uma nova recusa vale', async () => {
      await comoSindico
        .post(`${BASE}/${joao}/recusar`, { motivo: 'Motivo antigo' })
        .expect(200);
      await prismaDeTeste().usuario.update({
        where: { id: joao },
        data: { status: 'PENDENTE' },
      });

      const pendentes = await comoSindico
        .get(`${BASE}?status=PENDENTE&q=joao`)
        .expect(200);
      expect(pendentes.body.itens[0].motivoRecusa).toBeNull();

      await comoSindico
        .post(`${BASE}/${joao}/recusar`, { motivo: 'Motivo novo' })
        .expect(200);
      const recusados = await comoSindico
        .get(`${BASE}?status=RECUSADO&q=joao`)
        .expect(200);
      expect(recusados.body.itens[0].motivoRecusa).toBe('Motivo novo');
    });
  });

  describe('inativar e reativar', () => {
    it('o morador inativado perde a sessão na próxima requisição e volta ao ser reativado', async () => {
      const cookieCarla = await entrar(app, 'cond-moradores', TEL_CARLA);
      await http().get(ME).set('Cookie', cookieCarla).expect(200);

      await comoSindico.post(`${BASE}/${carla}/inativar`).expect(200);

      const caiu = await http().get(ME).set('Cookie', cookieCarla).expect(401);
      expect(caiu.body.code).toBe('NAO_AUTENTICADO');
      const login = await http()
        .post(LOGIN)
        .send({ slug: 'cond-moradores', telefone: TEL_CARLA, senha: SENHA })
        .expect(403);
      expect(login.body.code).toBe('ACESSO_INATIVO');

      const reativada = await comoSindico
        .post(`${BASE}/${carla}/reativar`)
        .expect(200);
      expect(reativada.body.status).toBe('ATIVO');

      await http().get(ME).set('Cookie', cookieCarla).expect(401);
      const novo = await entrar(app, 'cond-moradores', TEL_CARLA);
      await http().get(ME).set('Cookie', novo).expect(200);

      expect((await auditorias(carla)).map((r) => r.acao)).toEqual([
        'USUARIO_INATIVADO',
        'USUARIO_REATIVADO',
      ]);
    });
  });

  describe('transições inválidas', () => {
    it.each([
      ['aprovar', 'carla', 'ATIVO'],
      ['recusar', 'carla', 'ATIVO'],
      ['inativar', 'joao', 'PENDENTE'],
      ['reativar', 'eva', 'RECUSADO'],
      ['aprovar', 'eva', 'RECUSADO'],
      ['inativar', 'diego', 'INATIVO'],
      ['reativar', 'carla', 'ATIVO'],
    ] as const)(
      '%s em %s (%s) responde 409 com o status atual, sem auditar',
      async (acao, quem, statusAtual) => {
        const id = { joao, carla, diego, eva }[quem];
        const resposta = await comoSindico
          .post(
            `${BASE}/${id}/${acao}`,
            acao === 'recusar' ? { motivo: 'x' } : {},
          )
          .expect(409);
        expect(resposta.body).toEqual({
          statusCode: 409,
          code: 'TRANSICAO_MORADOR_INVALIDA',
          message:
            'Esta ação não está mais disponível para este morador. Recarregue para ver o status atual.',
          details: { statusAtual },
        });
        expect(await auditorias(id)).toEqual([]);
      },
    );

    it('aprovar e recusar ao mesmo tempo: só uma vence', async () => {
      const respostas = await Promise.all([
        comoSindico.post(`${BASE}/${joao}/aprovar`),
        comoSindico.post(`${BASE}/${joao}/recusar`, { motivo: 'Duplicado' }),
        comoSindico.post(`${BASE}/${joao}/aprovar`),
      ]);

      const status = respostas.map((r) => r.status).sort((x, y) => x - y);
      expect(status).toEqual([200, 409, 409]);
      const registros = await auditorias(joao);
      expect(registros).toHaveLength(1);
      const final = await prismaDeTeste().usuario.findUniqueOrThrow({
        where: { id: joao },
        select: { status: true },
      });
      expect(final.status).toBe(
        registros[0].acao === 'MORADOR_APROVADO' ? 'ATIVO' : 'RECUSADO',
      );
    });
  });

  describe('acesso e isolamento', () => {
    it('morador recebe 403 em todas as rotas; sem sessão, 401', async () => {
      const cookieCarla = await entrar(app, 'cond-moradores', TEL_CARLA);
      for (const [metodo, url] of [
        ['get', BASE],
        ['get', `${BASE}/contagem`],
        ['post', `${BASE}/${joao}/aprovar`],
        ['post', `${BASE}/${joao}/recusar`],
        ['post', `${BASE}/${carla}/inativar`],
        ['post', `${BASE}/${diego}/reativar`],
      ] as const) {
        const resposta = await http()
          [metodo](url)
          .set('Cookie', cookieCarla)
          .send({ motivo: 'x' })
          .expect(403);
        expect(resposta.body.code).toBe('ACESSO_NEGADO');
        await http()[metodo](url).send({ motivo: 'x' }).expect(401);
      }
      expect(await auditorias(joao)).toEqual([]);
    });

    it('síndico, subsíndico, id inexistente ou fora do formato respondem 404', async () => {
      for (const id of [sindicoId, subsindicoId, ID_INEXISTENTE, 'nao-e-id']) {
        const resposta = await comoSindico
          .post(`${BASE}/${id}/inativar`)
          .expect(404);
        expect(resposta.body).toEqual({
          statusCode: 404,
          code: 'MORADOR_NAO_ENCONTRADO',
          message: 'Morador não encontrado.',
        });
      }
    });

    it('morador de outro condomínio é invisível: 404 igual a inexistente e fora da lista', async () => {
      const b = await criarCondominio('cond-outro');
      const deB = (
        await criarUsuario(b.id, {
          telefone: TEL_JOAO,
          nome: 'João de B',
          status: 'PENDENTE',
        })
      ).id;

      for (const acao of ['aprovar', 'recusar', 'inativar', 'reativar']) {
        const resposta = await comoSindico
          .post(
            `${BASE}/${deB}/${acao}`,
            acao === 'recusar' ? { motivo: 'x' } : {},
          )
          .expect(404);
        expect(resposta.body.code).toBe('MORADOR_NAO_ENCONTRADO');
      }

      const lista = await comoSindico.get(`${BASE}?q=joao`).expect(200);
      expect(lista.body.itens.map((m: { id: string }) => m.id)).toEqual([joao]);
      const contagem = await comoSindico.get(`${BASE}/contagem`).expect(200);
      expect(contagem.body.pendentes).toBe(2);

      const intacto = await prismaDeTeste().usuario.findUniqueOrThrow({
        where: { id: deB },
        select: { status: true },
      });
      expect(intacto.status).toBe('PENDENTE');
      expect(await auditorias(deB)).toEqual([]);
    });
  });
});
