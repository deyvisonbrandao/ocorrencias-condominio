export function linkPublico(origem: string, slug: string): string {
  return `${origem.replace(/\/+$/, '')}/c/${encodeURIComponent(slug)}`;
}
