export const Papel = {
  SINDICO: 'SINDICO',
  SUBSINDICO: 'SUBSINDICO',
  MORADOR: 'MORADOR',
} as const;
export type Papel = (typeof Papel)[keyof typeof Papel];

export const StatusUsuario = {
  PENDENTE: 'PENDENTE',
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
  RECUSADO: 'RECUSADO',
} as const;
export type StatusUsuario = (typeof StatusUsuario)[keyof typeof StatusUsuario];
