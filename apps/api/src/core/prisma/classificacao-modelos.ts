import { Prisma } from '../../generated/prisma/client.js';

// escopado: tabela de dado de condomínio, filtrada por condominioId.
// raiz: o próprio condomínio, filtrado pelo id igual ao do contexto.
// global: sem dono, passa sem filtro.
export type Classificacao = 'escopado' | 'raiz' | 'global';

export const CAMPO_CONDOMINIO = 'condominioId';

export const CLASSIFICACAO_MODELOS: Readonly<
  Record<Prisma.ModelName, Classificacao>
> = {
  Condominio: 'raiz',
  Usuario: 'escopado',
  AuditoriaAdmin: 'escopado',
};

export function camposEscalares(modelo: string): ReadonlySet<string> {
  const enumeracao = (Prisma as unknown as Record<string, unknown>)[
    `${modelo}ScalarFieldEnum`
  ];
  if (typeof enumeracao !== 'object' || enumeracao === null) {
    throw new Error(`Modelo ${modelo} sem ScalarFieldEnum no client gerado`);
  }
  return new Set(Object.values(enumeracao as Record<string, string>));
}
