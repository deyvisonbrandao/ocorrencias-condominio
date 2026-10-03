import type { INestApplication } from '@nestjs/common';
import { AppConfig } from './core/config/app-config.js';
import { FiltroErros } from './core/http/filtro-erros.js';
import { configurarSwagger } from './core/http/swagger.js';
import { criarValidationPipe } from './core/http/validacao.js';
import { middlewareContextoTenant } from './core/tenancy/middleware-contexto-tenant.js';

export const PREFIXO_API = 'api/v1';

export function configurarApp(app: INestApplication): void {
  app.use(middlewareContextoTenant);
  app.setGlobalPrefix(PREFIXO_API);
  app.useGlobalPipes(criarValidationPipe());
  app.useGlobalFilters(new FiltroErros());

  if (app.get(AppConfig).swaggerHabilitado) {
    configurarSwagger(app);
  }
}
