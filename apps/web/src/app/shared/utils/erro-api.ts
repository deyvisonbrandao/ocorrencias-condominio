import { HttpErrorResponse } from '@angular/common/http';

export interface CorpoErroApi {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

export function lerErroApi(erro: unknown): CorpoErroApi | null {
  const corpo: unknown = erro instanceof HttpErrorResponse ? erro.error : null;
  if (
    !ehObjeto(corpo) ||
    typeof corpo['statusCode'] !== 'number' ||
    typeof corpo['code'] !== 'string' ||
    typeof corpo['message'] !== 'string'
  ) {
    return null;
  }
  return {
    statusCode: corpo['statusCode'],
    code: corpo['code'],
    message: corpo['message'],
    details: corpo['details'],
  };
}

export function errosPorCampo(corpo: CorpoErroApi | null): Readonly<Record<string, string>> {
  if (!corpo) {
    return {};
  }
  const { details } = corpo;
  if (Array.isArray(details)) {
    const resultado: Record<string, string> = {};
    for (const item of details as unknown[]) {
      if (!ehObjeto(item) || typeof item['campo'] !== 'string' || !Array.isArray(item['erros'])) {
        continue;
      }
      const primeira: unknown = item['erros'][0];
      if (typeof primeira === 'string' && !(item['campo'] in resultado)) {
        resultado[item['campo']] = primeira;
      }
    }
    return resultado;
  }
  if (ehObjeto(details) && typeof details['campo'] === 'string') {
    return { [details['campo']]: corpo.message };
  }
  return {};
}
