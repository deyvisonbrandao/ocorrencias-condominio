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
} from './sessao-fixtures.js';

const ROTA = '/api/v1/admin/condominio';
const SINDICO = '+5511933330001';
const SUBSINDICO = '+5511933330002';
const MORADOR = '+5511933330003';
const NOVOS = { nome: 'Residencial Aurora', cidade: 'Recife', uf: 'PE' };

describe('/admin/condominio (e2e)', () => {
  let app: INestApplication<App>;
  let a: CondominioDeTeste;
  let b: CondominioDeTeste;
  let sindicoA: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
    a = await criarCondominio('cond-a');
    b = await criarCondominio('cond-b');
    sindicoA = (
      await criarUsuario(a.id, { telefone: SINDICO, papel: 'SINDICO' })
    ).id;
    await criarUsuario(a.id, { telefone: SUBSINDICO, papel: 'SUBSINDICO' });
    await criarUsuario(a.id, { telefone: MORADOR });
    await criarUsuario(b.id, { telefone: SINDICO, papel: 'SINDICO' });
  });

  const auditorias = () =>
    prismaDeTeste().auditoriaAdmin.findMany({
      where: { acao: 'CONDOMINIO_ATUALIZADO' },
      select: { condominioId: true, atorId: true, alvoId: true, dados: true },
    });

  describe('GET', () => {
    it('síndico lê o próprio condomínio, com cidade e UF nulas antes do preenchimento', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      const resposta = await http().get(ROTA).set('Cookie', cookie).expect(200);

      expect(resposta.headers['cache-control']).toBe('no-store');
      expect(resposta.body).toEqual({
        nome: 'Condomínio cond-a',
        slug: 'cond-a',
        cidade: null,
        uf: null,
      });
    });

    it('subsíndico lê', async () => {
      const cookie = await entrar(app, 'cond-a', SUBSINDICO);
      await http()
        .get(ROTA)
        .set('Cookie', cookie)
        .expect(200)
        .expect(({ body }) => expect(body.slug).toBe('cond-a'));
    });

    it('morador recebe 403 e sem sessão 401', async () => {
      const cookie = await entrar(app, 'cond-a', MORADOR);
      await http()
        .get(ROTA)
        .set('Cookie', cookie)
        .expect(403)
        .expect(({ body }) => expect(body.code).toBe('ACESSO_NEGADO'));
      await http()
        .get(ROTA)
        .expect(401)
        .expect(({ body }) => expect(body.code).toBe('NAO_AUTENTICADO'));
    });
  });

  describe('PUT', () => {
    it('síndico edita nome, cidade e UF; o nome novo aparece na rota pública e a auditoria guarda o de/para', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      await http()
        .put(ROTA)
        .set('Cookie', cookie)
        .send({ ...NOVOS, cidade: '  Recife ' })
        .expect(200, { ...NOVOS, slug: 'cond-a' });

      await http()
        .get(ROTA)
        .set('Cookie', cookie)
        .expect(200, { ...NOVOS, slug: 'cond-a' });
      await http()
        .get('/api/v1/public/condominios/cond-a')
        .expect(200, { nome: NOVOS.nome, slug: 'cond-a' });

      expect(await auditorias()).toEqual([
        {
          condominioId: a.id,
          atorId: sindicoA,
          alvoId: null,
          dados: {
            de: { nome: 'Condomínio cond-a', cidade: null, uf: null },
            para: NOVOS,
          },
        },
      ]);
    });

    it('reenviar os mesmos dados não grava auditoria nova', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      await http().put(ROTA).set('Cookie', cookie).send(NOVOS).expect(200);
      await http().put(ROTA).set('Cookie', cookie).send(NOVOS).expect(200);
      expect(await auditorias()).toHaveLength(1);
    });

    it('PUTs simultâneos com os mesmos dados gravam uma auditoria só', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      const respostas = await Promise.all(
        Array.from({ length: 4 }, () =>
          http().put(ROTA).set('Cookie', cookie).send(NOVOS),
        ),
      );

      expect(respostas.map((r) => r.status)).toEqual([200, 200, 200, 200]);
      expect(await auditorias()).toHaveLength(1);
    });

    it('PUTs simultâneos com dados diferentes: cada um vê o estado gravado pelo anterior', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      const nomes = ['Nome 1', 'Nome 2', 'Nome 3', 'Nome 4'];
      const respostas = await Promise.all(
        nomes.map((nome) =>
          http()
            .put(ROTA)
            .set('Cookie', cookie)
            .send({ ...NOVOS, nome }),
        ),
      );
      expect(respostas.map((r) => r.status)).toEqual([200, 200, 200, 200]);

      const registros = (await auditorias()).map(
        (x) => x.dados as { de: { nome: string }; para: { nome: string } },
      );
      expect(registros).toHaveLength(nomes.length);

      // Serializado, o de/para forma uma cadeia única do nome original até o nome final, sem repetir o "de".
      const seguinte = new Map(registros.map((r) => [r.de.nome, r.para.nome]));
      expect(seguinte.size).toBe(registros.length);
      let nome = 'Condomínio cond-a';
      for (let passo = 0; passo < registros.length; passo++) {
        expect(seguinte.has(nome)).toBe(true);
        nome = seguinte.get(nome)!;
      }
      const final = await prismaDeTeste().condominio.findUniqueOrThrow({
        where: { id: a.id },
        select: { nome: true },
      });
      expect(final.nome).toBe(nome);
    });

    it('subsíndico e morador recebem 403 e nada muda', async () => {
      for (const telefone of [SUBSINDICO, MORADOR]) {
        const cookie = await entrar(app, 'cond-a', telefone);
        await http()
          .put(ROTA)
          .set('Cookie', cookie)
          .send(NOVOS)
          .expect(403)
          .expect(({ body }) => expect(body.code).toBe('ACESSO_NEGADO'));
      }
      await expect(
        prismaDeTeste().condominio.findUnique({
          where: { id: a.id },
          select: { nome: true, cidade: true, uf: true },
        }),
      ).resolves.toEqual({ nome: 'Condomínio cond-a', cidade: null, uf: null });
      expect(await auditorias()).toEqual([]);
    });

    it('slug no corpo responde 400 e o endereço não muda', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      const resposta = await http()
        .put(ROTA)
        .set('Cookie', cookie)
        .send({ ...NOVOS, slug: 'outro-endereco' })
        .expect(400);

      expect(resposta.body).toMatchObject({
        code: 'VALIDACAO_FALHOU',
        details: [
          {
            campo: 'slug',
            erros: [
              'O endereço não pode ser alterado: os QR codes impressos deixariam de funcionar.',
            ],
          },
        ],
      });
      await expect(
        prismaDeTeste().condominio.findUnique({
          where: { id: a.id },
          select: { nome: true, slug: true },
        }),
      ).resolves.toEqual({ nome: 'Condomínio cond-a', slug: 'cond-a' });
    });

    it('UF fora das 27 e campos obrigatórios respondem 400 por campo', async () => {
      const cookie = await entrar(app, 'cond-a', SINDICO);
      const ufInvalida = await http()
        .put(ROTA)
        .set('Cookie', cookie)
        .send({ ...NOVOS, uf: 'XX' })
        .expect(400);
      expect(ufInvalida.body.details).toEqual([
        { campo: 'uf', erros: ['Escolha a UF.'] },
      ]);

      const vazio = await http()
        .put(ROTA)
        .set('Cookie', cookie)
        .send({ nome: ' ', cidade: '' })
        .expect(400);
      expect(
        vazio.body.details.map((d: { campo: string }) => d.campo).sort(),
      ).toEqual(['cidade', 'nome', 'uf']);
    });

    it('só alcança o condomínio da sessão: o mesmo telefone síndico em B não altera A', async () => {
      const cookieB = await entrar(app, 'cond-b', SINDICO);
      await http()
        .put(ROTA)
        .set('Cookie', cookieB)
        .send({ nome: 'Novo B', cidade: 'Natal', uf: 'RN' })
        .expect(200, {
          nome: 'Novo B',
          slug: 'cond-b',
          cidade: 'Natal',
          uf: 'RN',
        });

      const cookieA = await entrar(app, 'cond-a', SINDICO);
      await http().get(ROTA).set('Cookie', cookieA).expect(200, {
        nome: 'Condomínio cond-a',
        slug: 'cond-a',
        cidade: null,
        uf: null,
      });
      await http()
        .get('/api/v1/public/condominios/cond-a')
        .expect(200, { nome: 'Condomínio cond-a', slug: 'cond-a' });
      expect((await auditorias()).map((x) => x.condominioId)).toEqual([b.id]);
    });
  });
});
