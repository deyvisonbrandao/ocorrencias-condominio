import { HttpContext } from '@angular/common/http';
import { computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CodigoErroCondominio, CondominioPublico, slugValido } from '@ocorrencias/contratos';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { ESPERA_ANTES_DO_SKELETON_MS } from '../../shared/components/estados/skeleton';
import { lerErroApi } from '../../shared/utils/erro-api';
import { NOME_PRODUTO } from '../config/marca';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { CondominiosPublicoService } from './condominios-publico.service';

export const TITULO_CONDOMINIO_NAO_ENCONTRADO = 'Condomínio não encontrado';

export type EstadoCondominio =
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'pronto'; readonly condominio: CondominioPublico }
  | { readonly tipo: 'nao-encontrado' }
  | { readonly tipo: 'erro' };

export interface CondominioDaRota {
  readonly slug: Signal<string>;
  readonly estado: Signal<EstadoCondominio>;
  readonly condominio: Signal<CondominioPublico | null>;
  readonly esperaLonga: Signal<boolean>;
  recarregar(): void;
}

export function condominioDaRota(): CondominioDaRota {
  const rota = inject(ActivatedRoute);
  const api = inject(CondominiosPublicoService);
  const titulo = inject(Title);

  const tentativas = new BehaviorSubject<void>(undefined);
  const parametros = toSignal(rota.paramMap, { requireSync: true });

  const buscar = (slug: string): Observable<EstadoCondominio> => {
    if (!slugValido(slug)) {
      return of({ tipo: 'nao-encontrado' });
    }
    return api.buscarPorSlug(slug, new HttpContext().set(SEM_TOAST_DE_ERRO, true)).pipe(
      map((condominio): EstadoCondominio => ({ tipo: 'pronto', condominio })),
      catchError((erro: unknown) =>
        of<EstadoCondominio>(
          lerErroApi(erro)?.code === CodigoErroCondominio.CONDOMINIO_NAO_ENCONTRADO
            ? { tipo: 'nao-encontrado' }
            : { tipo: 'erro' },
        ),
      ),
      startWith<EstadoCondominio>({ tipo: 'carregando' }),
    );
  };

  const estado = toSignal(
    rota.paramMap.pipe(
      switchMap((parametro) =>
        tentativas.pipe(switchMap(() => buscar(parametro.get('slug') ?? ''))),
      ),
    ),
    { initialValue: { tipo: 'carregando' } satisfies EstadoCondominio },
  );

  effect(() => {
    if (estado().tipo === 'nao-encontrado') {
      titulo.setTitle(`${TITULO_CONDOMINIO_NAO_ENCONTRADO} · ${NOME_PRODUTO}`);
    }
  });

  return {
    slug: computed(() => parametros().get('slug') ?? ''),
    estado,
    condominio: computed(() => {
      const atual = estado();
      return atual.tipo === 'pronto' ? atual.condominio : null;
    }),
    esperaLonga: toSignal(timer(ESPERA_ANTES_DO_SKELETON_MS).pipe(map(() => true)), {
      initialValue: false,
    }),
    recarregar: () => tentativas.next(),
  };
}
