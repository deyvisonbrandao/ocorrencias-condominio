import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { nomeCookieSessao } from '../auth/sessao-jwt.js';
import { AppConfig } from '../config/app-config.js';

export const CAMINHO_SWAGGER = 'api/docs';
export const ESQUEMA_AUTH_COOKIE = 'cookie-sessao';

export function configurarSwagger(app: INestApplication): void {
  const titulo = 'Ocorrências de Condomínio — API';
  const nomeCookie = nomeCookieSessao(app.get(AppConfig).producao);
  const documento = new DocumentBuilder()
    .setTitle(titulo)
    .setDescription(
      [
        'API do SaaS de registro e acompanhamento de ocorrências de condomínio.',
        '',
        'Erros seguem sempre o formato `{ statusCode, code, message, details? }`: trate pelo `code`, exiba a `message`.',
        '',
        `Rotas autenticadas usam o cookie de sessão httpOnly \`${nomeCookie}\`, definido pelo login. ` +
          'Como esta documentação é servida pela própria API, o navegador envia o cookie no "Try it out" depois do login.',
      ].join('\n'),
    )
    .setVersion('v1')
    .addCookieAuth(
      nomeCookie,
      {
        type: 'apiKey',
        in: 'cookie',
        name: nomeCookie,
        description: 'Cookie de sessão definido pelo login.',
      },
      ESQUEMA_AUTH_COOKIE,
    )
    .build();

  SwaggerModule.setup(
    CAMINHO_SWAGGER,
    app,
    () => SwaggerModule.createDocument(app, documento),
    {
      customSiteTitle: titulo,
      swaggerOptions: {
        persistAuthorization: false,
        displayRequestDuration: true,
      },
    },
  );
}
