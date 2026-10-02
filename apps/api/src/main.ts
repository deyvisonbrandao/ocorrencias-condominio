import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp, PREFIXO_API } from './configurar-app.js';
import { AppConfig } from './core/config/app-config.js';
import { CAMINHO_SWAGGER } from './core/http/swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  configurarApp(app);
  app.enableShutdownHooks();

  const config = app.get(AppConfig);
  await app.listen(config.porta);

  const logger = new Logger('Bootstrap');
  logger.log(
    `API em http://localhost:${config.porta}/${PREFIXO_API} (${config.ambiente})`,
  );
  if (config.swaggerHabilitado) {
    logger.log(
      `Swagger em http://localhost:${config.porta}/${CAMINHO_SWAGGER}`,
    );
  }
}
await bootstrap();
