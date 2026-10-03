import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { limparBanco, prismaDeTeste } from './banco.js';
import { criarApp } from './criar-app.js';
import {
  type CondominioDeTeste,
  cookieDaSessao,
  criarCondominio,
  criarUsuario,
  entrar,
  SENHA,
} from './sessao-fixtures.js';

const LOGIN = '/api/v1/auth/login';
const LOGOUT = '/api/v1/auth/logout';
const ME = '/api/v1/me';
const PAINEL = '/api/v1/admin/painel';

const TEL_SINDICO = '+5511911110001';
const TEL_SUBSINDICO = '+5511911110002';
const TEL_MORADOR = '+5511911110003';

const CREDENCIAL_INVALIDA = {
  statusCode: 401,
  code: 'CREDENCIAIS_INVALIDAS',
  message: 'Telefone ou senha inválidos.',
};
const NAO_AUTENTICADO = {
  statusCode: 401,
  code: 'NAO_AUTENTICADO',
  message: 'Sua sessão terminou. Entre de novo.',
};

describe('Sessão: login, logout, /me e papéis (e2e)', () => {
  let app: INestApplication<App>;
  let condominio: CondominioDeTeste;
  let sindicoId: string;
  let moradorId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
    condominio = await criarCondominio('jardim-a');
    sindicoId = (
      await criarUsuario(condominio.id, {
        telefone: TEL_SINDICO,
        papel: 'SINDICO',
        nome: 'Maria Síndica',
      })
    ).id;
    await criarUsuario(condominio.id, {
      telefone: TEL_SUBSINDICO,
      papel: 'SUBSINDICO',
    });
    moradorId = (
      await criarUsuario(condominio.id, {
        telefone: TEL_MORADOR,
        nome: 'João Morador',
      })
    ).id;
  });

  describe('POST /auth/login', () => {
    it('com credencial correta define o cookie httpOnly e devolve só dados mínimos', async () => {
      const resposta = await http()
        .post(LOGIN)
        .send({
          slug: 'jardim-a',
          telefone: '(11) 91111-0001',
          senha: SENHA,
        })
        .expect(200);

      expect(resposta.body).toEqual({
        nome: 'Maria Síndica',
        telefone: TEL_SINDICO,
        papel: 'SINDICO',
        status: 'ATIVO',
        senhaTemporaria: false,
        condominio: { nome: 'Condomínio jardim-a', slug: 'jardim-a' },
      });
      expect(JSON.stringify(resposta.body)).not.toMatch(/argon|hash|sessao=/i);
      expect(resposta.headers['cache-control']).toBe('no-store');

      const setCookie = ([] as string[]).concat(
        resposta.headers['set-cookie'] ?? [],
      );
      const linha = setCookie.find((l) => l.startsWith('sessao='))!;
      expect(linha).toMatch(/; HttpOnly/i);
      expect(linha).toMatch(/; SameSite=Lax/i);
      expect(linha).toMatch(/; Path=\//);
      expect(linha).toMatch(/; Max-Age=604800/);
      expect(linha).not.toMatch(/; Secure/i);

      const [, corpo] = cookieDaSessao(setCookie).slice(7).split('.');
      const claims = JSON.parse(Buffer.from(corpo, 'base64url').toString());
      expect(claims).toMatchObject({
        sub: sindicoId,
        cid: condominio.id,
        papel: 'SINDICO',
        sv: 1,
      });
      expect(claims.exp - claims.iat).toBe(604800);
    });

    it('informa senha temporária para o web forçar a troca', async () => {
      await prismaDeTeste().usuario.update({
        where: { id: moradorId },
        data: { senhaTemporaria: true },
      });
      const resposta = await http()
        .post(LOGIN)
        .send({ slug: 'jardim-a', telefone: TEL_MORADOR, senha: SENHA })
        .expect(200);

      expect(resposta.body.senhaTemporaria).toBe(true);
    });

    it('senha errada, telefone inexistente e slug inexistente respondem igual, sem cookie', async () => {
      const respostas = await Promise.all([
        http()
          .post(LOGIN)
          .send({
            slug: 'jardim-a',
            telefone: TEL_SINDICO,
            senha: 'errada-123',
          }),
        http()
          .post(LOGIN)
          .send({ slug: 'jardim-a', telefone: '+5511999999999', senha: SENHA }),
        http()
          .post(LOGIN)
          .send({ slug: 'nao-existe', telefone: TEL_SINDICO, senha: SENHA }),
        http()
          .post(LOGIN)
          .send({ slug: 'jardim-a', telefone: '123', senha: SENHA }),
      ]);

      for (const resposta of respostas) {
        expect(resposta.status).toBe(401);
        expect(resposta.body).toEqual(CREDENCIAL_INVALIDA);
        expect(resposta.headers['set-cookie']).toBeUndefined();
      }
    });

    it('condomínio inativo responde o mesmo 401 genérico', async () => {
      const inativo = await criarCondominio('inativo', 'INATIVO');
      await criarUsuario(inativo.id, {
        telefone: TEL_SINDICO,
        papel: 'SINDICO',
      });

      const resposta = await http()
        .post(LOGIN)
        .send({ slug: 'inativo', telefone: TEL_SINDICO, senha: SENHA })
        .expect(401);
      expect(resposta.body).toEqual(CREDENCIAL_INVALIDA);
    });

    it.each([
      [
        'PENDENTE',
        'CADASTRO_PENDENTE',
        'Seu cadastro ainda aguarda aprovação da administração.',
      ],
      [
        'RECUSADO',
        'CADASTRO_RECUSADO',
        'Seu cadastro não foi aprovado. Fale com a administração do condomínio.',
      ],
      [
        'INATIVO',
        'ACESSO_INATIVO',
        'Seu acesso está desativado. Fale com a administração do condomínio.',
      ],
    ] as const)(
      '%s com senha correta: 403 %s; com senha errada: 401 genérico',
      async (status, code, message) => {
        await prismaDeTeste().usuario.update({
          where: { id: moradorId },
          data: { status },
        });

        const certa = await http()
          .post(LOGIN)
          .send({ slug: 'jardim-a', telefone: TEL_MORADOR, senha: SENHA })
          .expect(403);
        expect(certa.body).toEqual({ statusCode: 403, code, message });
        expect(certa.headers['set-cookie']).toBeUndefined();

        const errada = await http()
          .post(LOGIN)
          .send({
            slug: 'jardim-a',
            telefone: TEL_MORADOR,
            senha: 'errada-123',
          })
          .expect(401);
        expect(errada.body).toEqual(CREDENCIAL_INVALIDA);
      },
    );

    it('corpo incompleto ou com campo extra responde 400', async () => {
      await http()
        .post(LOGIN)
        .send({ slug: 'jardim-a', telefone: TEL_SINDICO })
        .expect(400);
      const extra = await http()
        .post(LOGIN)
        .send({
          slug: 'jardim-a',
          telefone: TEL_SINDICO,
          senha: SENHA,
          condominioId: 'x',
        })
        .expect(400);
      expect(extra.body.code).toBe('VALIDACAO_FALHOU');
    });
  });

  describe('GET /me', () => {
    it('sem cookie responde 401 NAO_AUTENTICADO', async () => {
      const resposta = await http().get(ME).expect(401);
      expect(resposta.body).toEqual(NAO_AUTENTICADO);
    });

    it('com cookie adulterado responde 401 e apaga o cookie', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_MORADOR);
      const resposta = await http()
        .get(ME)
        .set('Cookie', `${cookie.slice(0, -2)}xx`)
        .expect(401);

      expect(resposta.headers['set-cookie']?.[0]).toMatch(
        /^sessao=;.*Expires=Thu, 01 Jan 1970/,
      );
    });

    it('com sessão devolve o usuário do token', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_MORADOR);
      const resposta = await http().get(ME).set('Cookie', cookie).expect(200);

      expect(resposta.body).toEqual({
        nome: 'João Morador',
        telefone: TEL_MORADOR,
        papel: 'MORADOR',
        status: 'ATIVO',
        senhaTemporaria: false,
        condominio: { nome: 'Condomínio jardim-a', slug: 'jardim-a' },
      });
      expect(resposta.headers['cache-control']).toBe('no-store');
    });

    it('versao_sessao incrementada invalida o token na hora', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_MORADOR);
      await http().get(ME).set('Cookie', cookie).expect(200);

      await prismaDeTeste().usuario.update({
        where: { id: moradorId },
        data: { versaoSessao: { increment: 1 } },
      });

      const resposta = await http().get(ME).set('Cookie', cookie).expect(401);
      expect(resposta.body).toEqual(NAO_AUTENTICADO);

      const nova = await entrar(app, 'jardim-a', TEL_MORADOR);
      await http().get(ME).set('Cookie', nova).expect(200);
    });

    it('usuário inativado depois do login perde a sessão', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_MORADOR);
      await prismaDeTeste().usuario.update({
        where: { id: moradorId },
        data: { status: 'INATIVO' },
      });

      await http().get(ME).set('Cookie', cookie).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('apaga o cookie com os mesmos atributos e responde 204, com ou sem sessão', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_MORADOR);

      const comSessao = await http()
        .post(LOGOUT)
        .set('Cookie', cookie)
        .expect(204);
      const linha = comSessao.headers['set-cookie']?.[0] ?? '';
      expect(linha).toMatch(/^sessao=;/);
      expect(linha).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(linha).toMatch(/; Path=\//);
      expect(linha).toMatch(/; HttpOnly/i);
      expect(linha).toMatch(/; SameSite=Lax/i);

      await http().post(LOGOUT).expect(204);
    });
  });

  describe('papéis', () => {
    it('morador recebe 403 em /admin/painel', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_MORADOR);
      const resposta = await http()
        .get(PAINEL)
        .set('Cookie', cookie)
        .expect(403);

      expect(resposta.body).toEqual({
        statusCode: 403,
        code: 'ACESSO_NEGADO',
        message: 'Você não tem acesso a essa página.',
      });
    });

    it.each([TEL_SINDICO, TEL_SUBSINDICO])(
      'admin (%s) acessa /admin/painel',
      async (telefone) => {
        const cookie = await entrar(app, 'jardim-a', telefone);
        const resposta = await http()
          .get(PAINEL)
          .set('Cookie', cookie)
          .expect(200);

        expect(resposta.body).toEqual({
          condominio: { nome: 'Condomínio jardim-a', slug: 'jardim-a' },
        });
      },
    );

    it('sem sessão, /admin/painel responde 401 antes do papel', async () => {
      await http().get(PAINEL).expect(401);
    });

    it('papel rebaixado no banco vale na hora, mesmo com o papel antigo no token', async () => {
      const cookie = await entrar(app, 'jardim-a', TEL_SUBSINDICO);
      await prismaDeTeste().usuario.updateMany({
        where: { telefone: TEL_SUBSINDICO },
        data: { papel: 'MORADOR', slotAdmin: null },
      });

      await http().get(PAINEL).set('Cookie', cookie).expect(403);
    });
  });

  describe('proteção de CSRF', () => {
    it('recusa POST de outro site pelo Sec-Fetch-Site', async () => {
      const resposta = await http()
        .post(LOGIN)
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ slug: 'jardim-a', telefone: TEL_SINDICO, senha: SENHA })
        .expect(403);
      expect(resposta.body.code).toBe('ORIGEM_NAO_PERMITIDA');
    });

    it('aceita POST da mesma origem', async () => {
      await http()
        .post(LOGIN)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ slug: 'jardim-a', telefone: TEL_SINDICO, senha: SENHA })
        .expect(200);
    });

    it('recusa corpo de formulário com 415', async () => {
      const resposta = await http()
        .post(LOGIN)
        .type('form')
        .send({ slug: 'jardim-a', telefone: TEL_SINDICO, senha: SENHA })
        .expect(415);
      expect(resposta.body.code).toBe('TIPO_NAO_SUPORTADO');
    });
  });

  describe('Swagger', () => {
    it('documenta as rotas de sessão e a autenticação por cookie', async () => {
      const { body } = await http().get('/api/docs-json').expect(200);

      expect(body.paths['/api/v1/auth/login'].post.responses).toHaveProperty(
        '401',
      );
      expect(body.paths['/api/v1/auth/login'].post.security).toBeUndefined();
      expect(body.paths['/api/v1/me'].get.security).toEqual([
        { 'cookie-sessao': [] },
      ]);
      expect(body.paths['/api/v1/admin/painel'].get.responses).toHaveProperty(
        '403',
      );
    });
  });
});
