import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Post,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min, MinLength } from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppConfig } from '../src/core/config/app-config.js';
import { criarApp } from './criar-app.js';

class EcoDto {
  @IsString()
  @MinLength(3)
  titulo!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantidade!: number;
}

@Controller('teste-eco')
class EcoController {
  @Post()
  ecoar(@Body() dto: EcoDto) {
    return {
      titulo: dto.titulo,
      quantidade: dto.quantidade,
      instancia: dto instanceof EcoDto,
      tipoQuantidade: typeof dto.quantidade,
    };
  }

  @Get('falha')
  falhar(): never {
    throw new Error('detalhe interno: senha=hunter2');
  }
}

describe('pipeline HTTP (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarApp({ controllers: [EcoController] });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ValidationPipe global', () => {
    it('aceita corpo válido, instancia o DTO e converte tipos', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/v1/teste-eco')
        .send({ titulo: 'Vazamento', quantidade: '2' })
        .expect(201);

      expect(resposta.body).toEqual({
        titulo: 'Vazamento',
        quantidade: 2,
        instancia: true,
        tipoQuantidade: 'number',
      });
    });

    it('recusa campo fora do DTO', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/v1/teste-eco')
        .send({ titulo: 'Vazamento', quantidade: 1, condominioId: 'outro' })
        .expect(400);

      expect(resposta.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDACAO_FALHOU',
        message: 'Os dados enviados são inválidos.',
        details: [{ campo: 'condominioId', erros: [expect.any(String)] }],
      });
    });

    it('lista os campos inválidos em details', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/v1/teste-eco')
        .send({ titulo: 'ab', quantidade: 0 })
        .expect(400);

      expect(
        resposta.body.details.map((d: { campo: string }) => d.campo).sort(),
      ).toEqual(['quantidade', 'titulo']);
    });
  });

  describe('filtro de erros', () => {
    it('padroniza rota inexistente como 404', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/nao-existe')
        .expect(404);

      expect(resposta.body).toEqual({
        statusCode: 404,
        code: 'NAO_ENCONTRADO',
        message: 'Recurso não encontrado.',
      });
    });

    it('padroniza JSON malformado como 400', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/v1/teste-eco')
        .set('Content-Type', 'application/json')
        .send('{"titulo":')
        .expect(400);

      expect(resposta.body).toEqual({
        statusCode: 400,
        code: 'REQUISICAO_INVALIDA',
        message: 'A requisição é inválida.',
      });
    });

    it('não vaza a mensagem de erro inesperado', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/teste-eco/falha')
        .expect(500);

      expect(resposta.body).toEqual({
        statusCode: 500,
        code: 'ERRO_INTERNO',
        message: 'Erro interno. Tente de novo em instantes.',
      });
      expect(JSON.stringify(resposta.body)).not.toContain('hunter2');
    });
  });

  describe('Swagger', () => {
    it('serve a interface em /api/docs', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);

      expect(resposta.text).toContain('swagger-ui');
    });

    it('documenta o health com o prefixo da API e a autenticação por cookie', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(resposta.body.info.title).toBe('Ocorrências de Condomínio — API');
      expect(Object.keys(resposta.body.paths)).toContain('/api/v1/health');
      expect(
        resposta.body.paths['/api/v1/health'].get.responses,
      ).toHaveProperty('503');
      expect(
        resposta.body.components.securitySchemes['cookie-sessao'],
      ).toMatchObject({
        type: 'apiKey',
        in: 'cookie',
      });
    });
  });
});

describe('Swagger desligado (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarApp({
      ajustar: (builder) =>
        builder.overrideProvider(AppConfig).useFactory({
          factory: () =>
            new AppConfig(
              'production',
              3000,
              'mysql://u:p@localhost:3306/b',
              false,
              undefined,
            ),
        }),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('não expõe /api/docs', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(404);
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });
});
