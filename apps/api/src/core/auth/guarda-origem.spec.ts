import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ErroApi } from '../http/erro-api.js';
import { GuardaOrigem } from './guarda-origem.js';

const JSON_COM_CORPO = { 'content-length': '20' };

function contexto(
  method: string,
  headers: Record<string, string>,
  tipo: string | false | null = 'application/json',
): ExecutionContext {
  const requisicao = {
    method,
    headers,
    is: () => tipo,
  } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => requisicao }),
  } as unknown as ExecutionContext;
}

function statusDe(fn: () => unknown): number | undefined {
  try {
    fn();
    return undefined;
  } catch (erro) {
    return (erro as ErroApi).getStatus();
  }
}

describe('GuardaOrigem', () => {
  const guarda = new GuardaOrigem();

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    '%s passa mesmo de outro site e sem JSON',
    (metodo) => {
      expect(
        guarda.canActivate(
          contexto(
            metodo,
            { 'sec-fetch-site': 'cross-site', ...JSON_COM_CORPO },
            false,
          ),
        ),
      ).toBe(true);
    },
  );

  it.each([
    ['same-origin', undefined],
    ['none', undefined],
    [undefined, undefined],
    ['cross-site', 403],
    ['same-site', 403],
  ])('POST com Sec-Fetch-Site=%s -> %s', (site, esperado) => {
    const headers: Record<string, string> = site
      ? { 'sec-fetch-site': site, ...JSON_COM_CORPO }
      : JSON_COM_CORPO;
    expect(statusDe(() => guarda.canActivate(contexto('POST', headers)))).toBe(
      esperado,
    );
  });

  it.each([
    ['formulário', { 'content-length': '20' }],
    ['corpo em chunks', { 'transfer-encoding': 'chunked' }],
  ])('%s fora de JSON responde 415', (_, headers) => {
    expect(
      statusDe(() => guarda.canActivate(contexto('PUT', headers, false))),
    ).toBe(415);
  });

  it.each([
    ['POST', {}],
    ['DELETE', { 'content-length': '0' }],
  ])('%s sem corpo passa sem Content-Type', (metodo, headers) => {
    expect(guarda.canActivate(contexto(metodo, headers, false))).toBe(true);
  });

  it('cross-site sem corpo também é recusado', () => {
    expect(
      statusDe(() =>
        guarda.canActivate(
          contexto('POST', { 'sec-fetch-site': 'cross-site' }, null),
        ),
      ),
    ).toBe(403);
  });
});
