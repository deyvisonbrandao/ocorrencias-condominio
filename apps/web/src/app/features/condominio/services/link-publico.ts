import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';

export const ORIGEM_DO_APP = new InjectionToken<string>('ORIGEM_DO_APP', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).location.origin,
});

export function linkPublico(origem: string, slug: string): string {
  return `${origem.replace(/\/+$/, '')}/c/${encodeURIComponent(slug)}`;
}

export function textoCidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) {
    return `${cidade} – ${uf}`;
  }
  return cidade ?? uf ?? null;
}
