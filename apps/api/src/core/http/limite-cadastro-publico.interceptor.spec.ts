import {
  HttpStatus,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, of } from 'rxjs';
import { ErroApi } from './erro-api.js';
import {
  LimiteCadastroPublicoInterceptor,
  type LimitesCadastroPublico,
} from './limite-cadastro-publico.interceptor.js';

const JANELA_MS = 15 * 60 * 1000;

class LimiteDeTeste extends LimiteCadastroPublicoInterceptor {}

function criar(ajustes: Partial<LimitesCadastroPublico> = {}) {
  return new LimiteDeTeste({
    janelaMs: JANELA_MS,
    maxTentativasPorIp: 3,
    maxSimultaneos: 2,
    retryAfterConcorrenciaSegundos: 2,
    ...ajustes,
  });
}

function contexto(ip = '192.0.2.1', slug = 'jardim-a') {
  const cabecalhos: Record<string, string> = {};
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ ip, params: { slug } }) as unknown as Request,
      getResponse: () => ({
        setHeader: (nome: string, valor: string) => {
          cabecalhos[nome] = valor;
        },
      }),
    }),
  } as ExecutionContext;
  return { ctx, cabecalhos };
}

const concluido: CallHandler = { handle: () => of(undefined) };
const pendente: CallHandler = {
  handle: () => new Observable(() => undefined),
};

function erroDe(acao: () => unknown): ErroApi {
  try {
    acao();
  } catch (erro) {
    expect(erro).toBeInstanceOf(ErroApi);
    return erro as ErroApi;
  }
  throw new Error('esperava 429');
}

function esgotarIp(
  interceptor: LimiteCadastroPublicoInterceptor,
  ip: string,
  vezes: number,
): void {
  for (let i = 0; i < vezes; i += 1) {
    interceptor.intercept(contexto(ip).ctx, concluido).subscribe();
  }
}

describe('LimiteCadastroPublicoInterceptor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('limita tentativas por IP com o 429 padrão e Retry-After igual ao restante da janela', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    const interceptor = criar();
    esgotarIp(interceptor, '192.0.2.1', 3);

    vi.advanceTimersByTime(60_500);
    const { ctx, cabecalhos } = contexto('192.0.2.1');
    const erro = erroDe(() => interceptor.intercept(ctx, concluido));

    expect(erro.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(erro.getResponse()).toEqual({
      statusCode: 429,
      code: 'MUITAS_REQUISICOES',
      message: 'Muitas requisições. Tente de novo em instantes.',
    });
    expect(cabecalhos['Retry-After']).toBe(String(15 * 60 - 60));

    interceptor.intercept(contexto('192.0.2.2').ctx, concluido).subscribe();
  });

  it('libera o IP quando a janela termina', () => {
    vi.useFakeTimers();
    const interceptor = criar();
    esgotarIp(interceptor, '192.0.2.1', 3);
    expect(() => interceptor.intercept(contexto().ctx, concluido)).toThrow(
      ErroApi,
    );

    vi.advanceTimersByTime(JANELA_MS);

    interceptor.intercept(contexto().ctx, concluido).subscribe();
  });

  it('limita os simultâneos no total, com Retry-After curto, e libera a vaga ao terminar', () => {
    const interceptor = criar({ maxTentativasPorIp: 100 });
    const primeira = interceptor
      .intercept(contexto('192.0.2.1').ctx, pendente)
      .subscribe();
    const segunda = interceptor
      .intercept(contexto('192.0.2.2').ctx, pendente)
      .subscribe();

    const { ctx, cabecalhos } = contexto('192.0.2.3');
    erroDe(() => interceptor.intercept(ctx, pendente));
    expect(cabecalhos['Retry-After']).toBe('2');

    primeira.unsubscribe();
    interceptor.intercept(ctx, pendente).subscribe().unsubscribe();
    segunda.unsubscribe();
  });

  it('a recusa por simultâneos não conta como tentativa do IP', () => {
    const interceptor = criar({ maxTentativasPorIp: 2, maxSimultaneos: 1 });
    const ocupada = interceptor
      .intercept(contexto('192.0.2.9').ctx, pendente)
      .subscribe();
    for (let i = 0; i < 5; i += 1) {
      expect(() => interceptor.intercept(contexto().ctx, concluido)).toThrow(
        ErroApi,
      );
    }
    ocupada.unsubscribe();

    esgotarIp(interceptor, '192.0.2.1', 2);
  });

  describe('com limite por partição', () => {
    const porSlug = () =>
      criar({
        maxTentativasPorIp: 100,
        maxSimultaneos: 3,
        porParticao: {
          maxSimultaneos: 2,
          chave: (requisicao) => String(requisicao.params['slug']),
        },
      });

    it('uma partição cheia não bloqueia as outras', () => {
      const interceptor = porSlug();
      const a1 = interceptor
        .intercept(contexto('192.0.2.1', 'a').ctx, pendente)
        .subscribe();
      const a2 = interceptor
        .intercept(contexto('192.0.2.2', 'a').ctx, pendente)
        .subscribe();

      const { ctx, cabecalhos } = contexto('192.0.2.3', 'a');
      erroDe(() => interceptor.intercept(ctx, pendente));
      expect(cabecalhos['Retry-After']).toBe('2');

      const b1 = interceptor
        .intercept(contexto('192.0.2.3', 'b').ctx, pendente)
        .subscribe();

      a1.unsubscribe();
      a2.unsubscribe();
      b1.unsubscribe();
    });

    it('o teto global vale mesmo com vaga na partição', () => {
      const interceptor = porSlug();
      const ocupadas = ['a', 'a', 'b'].map((slug) =>
        interceptor
          .intercept(contexto('192.0.2.1', slug).ctx, pendente)
          .subscribe(),
      );

      expect(() =>
        interceptor.intercept(contexto('192.0.2.1', 'c').ctx, pendente),
      ).toThrow(ErroApi);

      ocupadas[2].unsubscribe();
      interceptor
        .intercept(contexto('192.0.2.1', 'c').ctx, pendente)
        .subscribe()
        .unsubscribe();
      ocupadas.forEach((s) => s.unsubscribe());
    });

    it('libera a vaga da partição quando o cadastro falha', () => {
      const interceptor = porSlug();
      const falha: CallHandler = {
        handle: () =>
          new Observable((assinante) => assinante.error(new Error('falhou'))),
      };
      for (let i = 0; i < 5; i += 1) {
        interceptor
          .intercept(contexto('192.0.2.1', 'a').ctx, falha)
          .subscribe({ error: () => undefined });
      }

      const a1 = interceptor
        .intercept(contexto('192.0.2.1', 'a').ctx, pendente)
        .subscribe();
      const a2 = interceptor
        .intercept(contexto('192.0.2.1', 'a').ctx, pendente)
        .subscribe();
      a1.unsubscribe();
      a2.unsubscribe();
    });
  });
});
