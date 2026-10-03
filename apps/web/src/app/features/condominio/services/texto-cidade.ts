export function textoCidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) {
    return `${cidade} – ${uf}`;
  }
  return cidade ?? uf ?? null;
}
