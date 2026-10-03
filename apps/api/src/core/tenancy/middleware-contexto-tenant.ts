import type { NextFunction, Request, Response } from 'express';
import { ContextoTenant } from './contexto-tenant.js';

export function middlewareContextoTenant(
  _requisicao: Request,
  _resposta: Response,
  proximo: NextFunction,
): void {
  ContextoTenant.iniciarRequisicao(() => proximo());
}
