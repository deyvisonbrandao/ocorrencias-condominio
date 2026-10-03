export const CodigoErroPaginacao = {
  CURSOR_INVALIDO: 'CURSOR_INVALIDO',
} as const;
export type CodigoErroPaginacao =
  (typeof CodigoErroPaginacao)[keyof typeof CodigoErroPaginacao];
