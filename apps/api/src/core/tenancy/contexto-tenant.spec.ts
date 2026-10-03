import { setTimeout as esperar } from 'node:timers/promises';
import { ContextoTenant, SemContextoTenantError } from './contexto-tenant.js';

describe('ContextoTenant', () => {
  it('fora de qualquer contexto, obter devolve undefined e exigir lança', () => {
    expect(ContextoTenant.obter()).toBeUndefined();
    expect(() => ContextoTenant.exigir()).toThrow(SemContextoTenantError);
  });

  it('executar expõe o condomínio ao código síncrono e assíncrono do bloco', async () => {
    const vistos = await ContextoTenant.executar('cond-a', async () => {
      const antes = ContextoTenant.exigir();
      await esperar(1);
      return [antes, ContextoTenant.exigir()];
    });

    expect(vistos).toEqual(['cond-a', 'cond-a']);
    expect(ContextoTenant.obter()).toBeUndefined();
  });

  it('não mistura condomínios de blocos concorrentes', async () => {
    const executarCom = (id: string, atraso: number) =>
      ContextoTenant.executar(id, async () => {
        await esperar(atraso);
        return ContextoTenant.exigir();
      });

    await expect(
      Promise.all([executarCom('cond-a', 5), executarCom('cond-b', 1)]),
    ).resolves.toEqual(['cond-a', 'cond-b']);
  });

  it('resolve dentro do contexto um thenable preguiçoso devolvido pelo bloco', async () => {
    const preguicoso = {
      // Imita a PrismaPromise, que só executa a consulta quando alguém chama then.
      // oxlint-disable-next-line unicorn/no-thenable
      then<R>(resolver: (valor: string | undefined) => R) {
        return Promise.resolve(resolver(ContextoTenant.obter()));
      },
    };

    await expect(
      ContextoTenant.executar('cond-a', () => preguicoso),
    ).resolves.toBe('cond-a');
  });

  it('recusa condominioId vazio', () => {
    expect(() => ContextoTenant.executar('', () => undefined)).toThrow(
      SemContextoTenantError,
    );
  });

  describe('vincular (uso pelo guard de autenticação)', () => {
    it('lança fora de uma requisição iniciada pelo middleware', () => {
      expect(() => ContextoTenant.vincular('cond-a')).toThrow(
        SemContextoTenantError,
      );
    });

    it('vale para o restante da requisição, inclusive depois de await', async () => {
      const guard = async () => {
        await esperar(1);
        ContextoTenant.vincular('cond-a');
      };

      const visto = await ContextoTenant.iniciarRequisicao(async () => {
        expect(ContextoTenant.obter()).toBeUndefined();
        await guard();
        await esperar(1);
        return ContextoTenant.exigir();
      });

      expect(visto).toBe('cond-a');
    });

    it('não troca o condomínio já vinculado', () => {
      ContextoTenant.iniciarRequisicao(() => {
        ContextoTenant.vincular('cond-a');
        ContextoTenant.vincular('cond-a');
        expect(() => ContextoTenant.vincular('cond-b')).toThrow(
          SemContextoTenantError,
        );
        expect(ContextoTenant.exigir()).toBe('cond-a');
      });
    });
  });
});
