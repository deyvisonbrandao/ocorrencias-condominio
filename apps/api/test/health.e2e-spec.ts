import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/core/prisma/prisma.service.js';
import { criarApp } from './criar-app.js';

describe('GET /api/v1/health (e2e)', () => {
  describe('com o banco no ar', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await criarApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('responde 200 depois de consultar o MySQL', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(resposta.body).toEqual({ status: 'ok', banco: 'ok' });
      expect(resposta.headers['cache-control']).toBe('no-store');
    });
  });

  describe('com o banco fora', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await criarApp({
        ajustar: (builder) =>
          builder.overrideProvider(PrismaService).useValue({
            bancoDisponivel: () => Promise.resolve(false),
            onModuleDestroy: () => Promise.resolve(),
          }),
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it('responde 503 no formato padrão de erro', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(503);

      expect(resposta.body).toEqual({
        statusCode: 503,
        code: 'BANCO_INDISPONIVEL',
        message: 'O banco de dados não está respondendo.',
        details: { banco: 'indisponivel' },
      });
    });
  });
});
