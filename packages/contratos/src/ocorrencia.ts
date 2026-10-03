export const TipoOcorrencia = {
  MANUTENCAO_AREA_COMUM: 'MANUTENCAO_AREA_COMUM',
  RECLAMACAO_BARULHO: 'RECLAMACAO_BARULHO',
  DUVIDA_REGRAS: 'DUVIDA_REGRAS',
  SUGESTAO_MELHORIA: 'SUGESTAO_MELHORIA',
  COMUNICADO_MUDANCA_OBRA: 'COMUNICADO_MUDANCA_OBRA',
} as const;
export type TipoOcorrencia = (typeof TipoOcorrencia)[keyof typeof TipoOcorrencia];

export const StatusOcorrencia = {
  ABERTA: 'ABERTA',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  RESOLVIDA: 'RESOLVIDA',
  ARQUIVADA: 'ARQUIVADA',
  DUPLICADA: 'DUPLICADA',
} as const;
export type StatusOcorrencia = (typeof StatusOcorrencia)[keyof typeof StatusOcorrencia];

export const Urgencia = {
  BAIXA: 'BAIXA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA',
} as const;
export type Urgencia = (typeof Urgencia)[keyof typeof Urgencia];

export const OrigemOcorrencia = {
  MORADOR: 'MORADOR',
  ADMIN: 'ADMIN',
} as const;
export type OrigemOcorrencia = (typeof OrigemOcorrencia)[keyof typeof OrigemOcorrencia];
