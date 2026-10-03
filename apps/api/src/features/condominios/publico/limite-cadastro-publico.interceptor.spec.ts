import {
  HttpStatus,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, of } from 'rxjs';
import { ErroApi } from '../../../core/http/erro-api.js';
import { LimiteCadastroPublicoInterceptor } from './limite-cadastro-publico.interceptor.js';

function contextoComIp(ip: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip }) as Request,
    }),
  } as ExecutionContext;
}

function proximo(
  observavel: Observable<unknown> = of(undefined),
): CallHandler {
  return { handle: () => observavel };
}

describe('LimiteCadastroPublicoInterceptor', () => {
  it('limita tentativas por IP e mantém o formato de erro 429', () => {
    const interceptor = new LimiteCadastroPublicoInterceptor();
    const handler = proximo();

    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
      interceptor
        .intercept(contextoComIp('192.0.2.1'), handler)
        .subscribe();
    }

    let erro: unknown;
    try {
      interceptor.intercept(contextoComIp('192.0.2.1'), handler);
    } catch (erroCapturado) {
      erro = erroCapturado;
    }
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect((erro as ErroApi).getResponse()).toEqual({
      statusCode: 429,
      code: 'MUITAS_REQUISICOES',
      message: 'Muitas requisições. Tente de novo em instantes.',
    });

    const outraOrigem = interceptor
      .intercept(contextoComIp('192.0.2.2'), handler)
      .subscribe();
    outraOrigem.unsubscribe();
  });

  it('limita o número de cadastros simultâneos e libera a vaga ao terminar', () => {
    const interceptor = new LimiteCadastroPublicoInterceptor();
    const contexto = contextoComIp('192.0.2.1');
    const handler = proximo(new Observable(() => undefined));

    const primeira = interceptor.intercept(contexto, handler).subscribe();
    const segunda = interceptor.intercept(contexto, handler).subscribe();

    expect(() => interceptor.intercept(contexto, handler)).toThrow(ErroApi);

    primeira.unsubscribe();
    const terceira = interceptor.intercept(contexto, handler).subscribe();
    terceira.unsubscribe();
    segunda.unsubscribe();
  });
});
