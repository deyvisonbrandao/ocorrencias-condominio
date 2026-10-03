import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, type Subscription } from 'rxjs';
import { ErroApi } from '../../../core/http/erro-api.js';
import {
  LIMITES_CADASTRO_MORADOR,
  LimiteCadastroMoradorInterceptor,
} from './limite-cadastro-morador.interceptor.js';

function contexto(slug: string, ip = '192.0.2.1'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, params: { slug } }) as unknown as Request,
      getResponse: () => ({ setHeader: () => undefined }),
    }),
  } as ExecutionContext;
}

const pendente: CallHandler = {
  handle: () => new Observable(() => undefined),
};

describe('LimiteCadastroMoradorInterceptor', () => {
  const abertas: Subscription[] = [];
  const ocupar = (
    interceptor: LimiteCadastroMoradorInterceptor,
    slug: string,
  ) =>
    abertas.push(interceptor.intercept(contexto(slug), pendente).subscribe());

  afterEach(() => {
    abertas.splice(0).forEach((s) => s.unsubscribe());
  });

  it('usa os números da ADR-002', () => {
    expect(LIMITES_CADASTRO_MORADOR).toMatchObject({
      janelaMs: 15 * 60 * 1000,
      maxTentativasPorIp: 200,
      maxSimultaneos: 16,
      maxSimultaneosPorCondominio: 4,
      retryAfterConcorrenciaSegundos: 2,
    });
  });

  it('conta os simultâneos por condomínio, sem diferenciar maiúsculas no slug', () => {
    const interceptor = new LimiteCadastroMoradorInterceptor();
    ['jardim-a', 'JARDIM-A', 'Jardim-A', 'jardim-a'].forEach((slug) =>
      ocupar(interceptor, slug),
    );

    expect(() => interceptor.intercept(contexto('jardim-a'), pendente)).toThrow(
      ErroApi,
    );
    ocupar(interceptor, 'jardim-b');
  });

  it('com 4 condomínios no teto, o quinto recebe 429 pelo teto global', () => {
    const interceptor = new LimiteCadastroMoradorInterceptor();
    for (const slug of ['a', 'b', 'c', 'd']) {
      for (let i = 0; i < 4; i += 1) {
        ocupar(interceptor, `cond-${slug}`);
      }
    }

    expect(() => interceptor.intercept(contexto('cond-e'), pendente)).toThrow(
      ErroApi,
    );
  });
});
