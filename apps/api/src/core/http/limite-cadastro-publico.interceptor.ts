import {
  HttpStatus,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, defer, finalize } from 'rxjs';
import { ErroApi } from './erro-api.js';

const JANELA_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS_POR_IP = 30;
const MAX_CADASTROS_SIMULTANEOS = 2;
const MAX_IPS_REGISTRADOS = 10_000;

interface JanelaTentativas {
  iniciaEm: number;
  tentativas: number;
}

@Injectable()
export class LimiteCadastroPublicoInterceptor implements NestInterceptor {
  private readonly tentativasPorIp = new Map<string, JanelaTentativas>();
  private cadastrosSimultaneos = 0;

  intercept(
    contexto: ExecutionContext,
    proximo: CallHandler,
  ): Observable<unknown> {
    const requisicao = contexto.switchToHttp().getRequest<Request>();
    const ip = requisicao.ip || requisicao.socket.remoteAddress || 'unknown';
    const agora = Date.now();
    let janela = this.tentativasPorIp.get(ip);

    if (!janela || agora - janela.iniciaEm >= JANELA_MS) {
      if (!janela && this.tentativasPorIp.size >= MAX_IPS_REGISTRADOS) {
        this.removerJanelasExpiradas(agora);
        if (this.tentativasPorIp.size >= MAX_IPS_REGISTRADOS) {
          throw this.erroLimite();
        }
      }
      janela = { iniciaEm: agora, tentativas: 0 };
      this.tentativasPorIp.set(ip, janela);
    }

    if (
      janela.tentativas >= MAX_TENTATIVAS_POR_IP ||
      this.cadastrosSimultaneos >= MAX_CADASTROS_SIMULTANEOS
    ) {
      throw this.erroLimite();
    }

    janela.tentativas += 1;
    this.cadastrosSimultaneos += 1;

    return defer(() => proximo.handle()).pipe(
      finalize(() => {
        this.cadastrosSimultaneos -= 1;
      }),
    );
  }

  private removerJanelasExpiradas(agora: number): void {
    for (const [ip, janela] of this.tentativasPorIp) {
      if (agora - janela.iniciaEm >= JANELA_MS) {
        this.tentativasPorIp.delete(ip);
      }
    }
  }

  private erroLimite(): ErroApi {
    return new ErroApi(
      HttpStatus.TOO_MANY_REQUESTS,
      'MUITAS_REQUISICOES',
      'Muitas requisições. Tente de novo em instantes.',
    );
  }
}
