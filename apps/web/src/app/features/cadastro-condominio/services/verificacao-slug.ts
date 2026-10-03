import { InjectionToken } from '@angular/core';
import { concat, distinctUntilChanged, map, Observable, of, switchMap, timer } from 'rxjs';
import { DisponibilidadeSlug } from '../../../core/services/condominios-publico.service';
import { slugValido } from '@ocorrencias/contratos';

export type EstadoSlug = 'ocioso' | 'verificando' | DisponibilidadeSlug;

export const ESPERA_VERIFICACAO_SLUG = new InjectionToken<number>('ESPERA_VERIFICACAO_SLUG', {
  factory: () => 400,
});

export function verificarSlug(
  slugs: Observable<string>,
  consultar: (slug: string) => Observable<DisponibilidadeSlug>,
  esperaMs: number,
): Observable<EstadoSlug> {
  return slugs.pipe(
    map((slug) => slug.trim()),
    distinctUntilChanged(),
    switchMap((slug) =>
      slugValido(slug)
        ? concat(
            of<EstadoSlug>('verificando'),
            timer(esperaMs).pipe(switchMap(() => consultar(slug))),
          )
        : of<EstadoSlug>('ocioso'),
    ),
  );
}
