import type { INestApplication, Type } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';

interface OpcoesApp {
  controllers?: Type[];
  ajustar?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

export async function criarApp(
  opcoes: OpcoesApp = {},
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: opcoes.controllers ?? [],
  });
  const modulo = await (
    opcoes.ajustar ? opcoes.ajustar(builder) : builder
  ).compile();

  const app = modulo.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configurarApp(app);
  await app.init();
  return app;
}
