import { AsyncLocalStorage } from 'node:async_hooks';

interface EstadoTenant {
  condominioId?: string;
}

export class SemContextoTenantError extends Error {
  constructor(detalhe: string) {
    super(`Sem contexto de condomínio: ${detalhe}`);
    this.name = 'SemContextoTenantError';
  }
}

const armazenamento = new AsyncLocalStorage<EstadoTenant>();

function validarId(condominioId: string): void {
  if (typeof condominioId !== 'string' || condominioId.trim() === '') {
    throw new SemContextoTenantError('condominioId vazio');
  }
}

function recusarTroca(atual: string | undefined, novo: string): void {
  if (atual !== undefined && atual !== novo) {
    throw new SemContextoTenantError(
      'a requisição já está vinculada a outro condomínio',
    );
  }
}

export const ContextoTenant = {
  iniciarRequisicao<T>(fn: () => T): T {
    return armazenamento.run({}, fn);
  },

  // O await dentro do run é necessário: a PrismaPromise é preguiçosa e só consulta no then. Sem ele,
  // `executar(id, () => prisma.x.findMany())` consultaria fora do contexto.
  executar<T>(condominioId: string, fn: () => T | PromiseLike<T>): Promise<T> {
    validarId(condominioId);
    recusarTroca(armazenamento.getStore()?.condominioId, condominioId);
    return armazenamento.run({ condominioId }, async () => await fn());
  },

  vincular(condominioId: string): void {
    validarId(condominioId);
    const estado = armazenamento.getStore();
    if (!estado) {
      throw new SemContextoTenantError(
        'a requisição não passou pelo middleware de contexto',
      );
    }
    recusarTroca(estado.condominioId, condominioId);
    estado.condominioId = condominioId;
  },

  obter(): string | undefined {
    return armazenamento.getStore()?.condominioId;
  },

  exigir(): string {
    const condominioId = armazenamento.getStore()?.condominioId;
    if (condominioId === undefined) {
      throw new SemContextoTenantError(
        'acesso a dado de condomínio fora de ContextoTenant.executar ou de rota autenticada',
      );
    }
    return condominioId;
  },
};
