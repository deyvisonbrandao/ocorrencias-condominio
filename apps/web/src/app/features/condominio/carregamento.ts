import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CondominioAdmin } from '@ocorrencias/contratos';
import { catchError, map, merge, Observable, of, startWith, switchMap, take, takeWhile, timer } from 'rxjs';
import { ESPERA_ANTES_DO_SKELETON_MS } from '../../shared/components/estados/skeleton';

export const ESPERA_LONGA_MS = 10_000;

export type FaseDaEspera = 'curta' | 'skeleton' | 'longa';

export type EstadoCarregamento =
  | { readonly tipo: 'carregando'; readonly fase: FaseDaEspera }
  | { readonly tipo: 'pronto'; readonly condominio: CondominioAdmin }
  | { readonly tipo: 'erro' };

function esperando(fase: FaseDaEspera): EstadoCarregamento {
  return { tipo: 'carregando', fase };
}

export function carregarCondominio(
  tentativas: Observable<void>,
  obter: () => Observable<CondominioAdmin>,
): Signal<EstadoCarregamento> {
  return toSignal(
    tentativas.pipe(
      switchMap(() => {
        const espera = timer(ESPERA_ANTES_DO_SKELETON_MS, ESPERA_LONGA_MS - ESPERA_ANTES_DO_SKELETON_MS).pipe(
          take(2),
          map((indice) => esperando(indice === 0 ? 'skeleton' : 'longa')),
          startWith(esperando('curta')),
        );
        const resultado = obter().pipe(
          map((condominio): EstadoCarregamento => ({ tipo: 'pronto', condominio })),
          catchError(() => of<EstadoCarregamento>({ tipo: 'erro' })),
        );
        return merge(espera, resultado).pipe(takeWhile((estado) => estado.tipo === 'carregando', true));
      }),
    ),
    { initialValue: esperando('curta') },
  );
}
