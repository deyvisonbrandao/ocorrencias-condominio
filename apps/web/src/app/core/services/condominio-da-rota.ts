import { HttpContext } from '@angular/common/http';
import { computed, effect, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { CodigoErroCondominio, CondominioPublico, slugValido } from '@ocorrencias/contratos';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { ESPERA_ANTES_DO_SKELETON_MS } from '../../shared/components/estados/skeleton';
import { lerErroApi } from '../../shared/utils/erro-api';
import { NOME_PRODUTO } from '../config/marca';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { CondominiosPublicoService } from './condominios-publico.service';

export const TITULO_CONDOMINIO_NAO_ENCONTRADO = 'Condomínio não encontrado';

export const CHAVE_CONDOMINIO_NO_ESTADO = 'condominio';

export type EstadoCondominio =
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'pronto'; readonly condominio: CondominioPublico }
  | { readonly tipo: 'nao-encontrado' }
  | { readonly tipo: 'erro' };

export interface OpcoesCondominioDaRota {
  readonly tituloComCondominio?: boolean;
  readonly aceitarDoEstadoDaNavegacao?: boolean;
}

export interface CondominioDaRota {
  readonly slug: Signal<string>;
  readonly estado: Signal<EstadoCondominio>;
  readonly condominio: Signal<CondominioPublico | null>;
  readonly esperaLonga: Signal<boolean>;
  recarregar(): void;
}

function lerCondominio(valor: unknown): CondominioPublico | null {
  if (typeof valor !== 'object' || valor === null) {
    return null;
  }
  const { nome, slug } = valor as Record<string, unknown>;
  return typeof nome === 'string' && typeof slug === 'string' ? { nome, slug } : null;
}

export function condominioDaRota(opcoes: OpcoesCondominioDaRota = {}): CondominioDaRota {
  const { tituloComCondominio = true, aceitarDoEstadoDaNavegacao = false } = opcoes;
  const rota = inject(ActivatedRoute);
  const api = inject(CondominiosPublicoService);
  const titulo = inject(Title);

  let doEstado = aceitarDoEstadoDaNavegacao
    ? lerCondominio(inject(Router).currentNavigation()?.extras.state?.[CHAVE_CONDOMINIO_NO_ESTADO])
    : null;

  const tentativas = new BehaviorSubject<void>(undefined);
  const parametros = toSignal(rota.paramMap, { requireSync: true });

  const buscar = (slug: string): Observable<EstadoCondominio> => {
    if (!slugValido(slug)) {
      return of({ tipo: 'nao-encontrado' });
    }
    if (doEstado?.slug === slug) {
      const condominio = doEstado;
      doEstado = null;
      return of({ tipo: 'pronto', condominio });
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
    const atual = estado();
    if (atual.tipo === 'nao-encontrado') {
      titulo.setTitle(`${TITULO_CONDOMINIO_NAO_ENCONTRADO} · ${NOME_PRODUTO}`);
      return;
    }
    const tituloDaTela = rota.snapshot.title;
    if (atual.tipo === 'pronto' && tituloComCondominio && tituloDaTela) {
      titulo.setTitle(`${tituloDaTela} · ${atual.condominio.nome}`);
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
