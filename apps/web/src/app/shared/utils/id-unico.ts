let contador = 0;

export function idUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${contador}`;
}
