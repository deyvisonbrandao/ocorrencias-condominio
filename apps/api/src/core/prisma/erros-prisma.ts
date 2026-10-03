interface ErroP2002 {
  code: 'P2002';
  meta?: {
    target?: unknown;
    driverAdapterError?: { cause?: { constraint?: { index?: unknown } } };
  };
}

function ehP2002(erro: unknown): erro is ErroP2002 {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    (erro as { code?: unknown }).code === 'P2002'
  );
}

// Com driver adapter (Prisma 7), o índice violado vem em meta.driverAdapterError.cause.constraint.index, e meta.target fica vazio.
export function violouIndiceUnico(erro: unknown, indice: string): boolean {
  if (!ehP2002(erro)) {
    return false;
  }
  const doAdapter = erro.meta?.driverAdapterError?.cause?.constraint?.index;
  const alvo = erro.meta?.target;
  return (
    doAdapter === indice ||
    alvo === indice ||
    (Array.isArray(alvo) && alvo.includes(indice))
  );
}
