import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CodigoErroSessao } from '@ocorrencias/contratos';
import type { Request } from 'express';
import { ErroApi } from '../http/erro-api.js';

const METODOS_COM_EFEITO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SEC_FETCH_SITE_ACEITOS = new Set(['same-origin', 'none']);

function temCorpo(requisicao: Request): boolean {
  const tamanho = requisicao.headers['content-length'];
  return (
    requisicao.headers['transfer-encoding'] !== undefined ||
    (tamanho !== undefined && tamanho !== '0')
  );
}

// Defesa de CSRF além do SameSite=Lax (docs/adr/002, "Implementação"):
// - Sec-Fetch-Site recusa chamada de outra origem, inclusive de subdomínio irmão, que o Lax deixa passar;
// - corpo só em JSON, porque formulário HTML (urlencoded, multipart, text/plain) dispensa preflight de CORS.
@Injectable()
export class GuardaOrigem implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const requisicao = contexto.switchToHttp().getRequest<Request>();
    if (!METODOS_COM_EFEITO.has(requisicao.method)) {
      return true;
    }

    const site = requisicao.headers['sec-fetch-site'];
    if (typeof site === 'string' && !SEC_FETCH_SITE_ACEITOS.has(site)) {
      throw new ErroApi(
        HttpStatus.FORBIDDEN,
        CodigoErroSessao.ORIGEM_NAO_PERMITIDA,
        'Requisição de origem não permitida.',
      );
    }

    if (temCorpo(requisicao) && !requisicao.is('application/json')) {
      throw new ErroApi(
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        'TIPO_NAO_SUPORTADO',
        'Envie o corpo em JSON (Content-Type: application/json).',
      );
    }
    return true;
  }
}
