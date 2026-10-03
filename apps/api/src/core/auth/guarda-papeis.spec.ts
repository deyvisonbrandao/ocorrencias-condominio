import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import type { Papel } from '@ocorrencias/contratos';
import { ErroApi } from '../http/erro-api.js';
import { Papeis } from './decoradores.js';
import { GuardaPapeis } from './guarda-papeis.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

@Papeis('SINDICO', 'SUBSINDICO')
class RotasAdmin {
  painel(this: void): void {}

  @Papeis('SINDICO')
  equipe(this: void): void {}
}

class RotasLivres {
  qualquer(this: void): void {}
}

function contexto(
  papel: Papel | undefined,
  handler: () => void,
  classe: new () => unknown,
): ExecutionContext {
  const usuario: UsuarioAutenticado | undefined = papel
    ? { id: 'u', condominioId: 'c', papel }
    : undefined;
  return {
    switchToHttp: () => ({ getRequest: () => ({ usuario }) }),
    getHandler: () => handler,
    getClass: () => classe,
  } as unknown as ExecutionContext;
}

describe('GuardaPapeis', () => {
  const guarda = new GuardaPapeis(new Reflector());

  it('@Papeis() registra o guard na rota', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RotasAdmin)).toEqual([
      GuardaPapeis,
    ]);
  });

  it.each([
    ['SINDICO', true],
    ['SUBSINDICO', true],
    ['MORADOR', false],
  ] as const)('papéis da classe: %s -> %s', (papel, liberado) => {
    const ctx = contexto(papel, RotasAdmin.prototype.painel, RotasAdmin);
    if (liberado) {
      expect(guarda.canActivate(ctx)).toBe(true);
    } else {
      expect(() => guarda.canActivate(ctx)).toThrow(ErroApi);
    }
  });

  it('o decorator do método prevalece sobre o da classe', () => {
    expect(
      guarda.canActivate(
        contexto('SINDICO', RotasAdmin.prototype.equipe, RotasAdmin),
      ),
    ).toBe(true);
    expect(() =>
      guarda.canActivate(
        contexto('SUBSINDICO', RotasAdmin.prototype.equipe, RotasAdmin),
      ),
    ).toThrow(ErroApi);
  });

  it('recusa com 403 ACESSO_NEGADO e sem usuário também recusa', () => {
    try {
      guarda.canActivate(
        contexto(undefined, RotasAdmin.prototype.painel, RotasAdmin),
      );
      expect.unreachable();
    } catch (erro) {
      expect((erro as ErroApi).getStatus()).toBe(403);
      expect((erro as ErroApi).getResponse()).toMatchObject({
        code: 'ACESSO_NEGADO',
      });
    }
  });

  it('rota sem @Papeis() passa', () => {
    expect(
      guarda.canActivate(
        contexto('MORADOR', RotasLivres.prototype.qualquer, RotasLivres),
      ),
    ).toBe(true);
  });
});
