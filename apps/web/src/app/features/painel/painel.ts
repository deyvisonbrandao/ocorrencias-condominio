import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PainelAdmin } from '@ocorrencias/contratos';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { SessaoService } from '../../core/services/sessao.service';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { ESPERA_ANTES_DO_SKELETON_MS, Skeleton } from '../../shared/components/estados/skeleton';
import { PainelService } from './services/painel.service';

type EstadoPainel =
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'pronto'; readonly painel: PainelAdmin }
  | { readonly tipo: 'erro' };

interface Passo {
  readonly rotulo: string;
  readonly rota: string;
}

const PASSOS_COMUNS: readonly Passo[] = [
  { rotulo: 'Compartilhe o link ou o QR code', rota: '/admin/condominio' },
  { rotulo: 'Aprove os cadastros', rota: '/admin/moradores' },
];

const PASSO_DO_SINDICO: Passo = { rotulo: 'Convide um subsíndico (opcional)', rota: '/admin/equipe' };

@Component({
  selector: 'app-painel',
  imports: [RouterLink, EstadoErro, Skeleton],
  template: `
    <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">Painel</h1>
    @switch (estado().tipo) {
      @case ('carregando') {
        @if (esperaLonga()) {
          <ui-skeleton class="mt-6" forma="detalhe" [quantidade]="1" />
        }
      }
      @case ('erro') {
        <ui-estado-erro class="mt-6" titulo="Não foi possível carregar o painel." (tentarDeNovo)="tentarDeNovo()" />
      }
      @case ('pronto') {
        <p class="mt-1 text-base text-texto-secundario">{{ painel()?.condominio?.nome }}</p>
        <section
          class="mt-6 rounded-cartao border border-borda bg-superficie p-4 md:p-6"
          aria-labelledby="primeiros-passos"
        >
          <h2 id="primeiros-passos" class="text-lg font-semibold">Primeiros passos</h2>
          <ol class="mt-4 space-y-2">
            @for (passo of passos(); track passo.rota) {
              <li class="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-sm font-semibold text-primaria tabular-nums"
                >
                  {{ $index + 1 }}
                </span>
                <a
                  [routerLink]="passo.rota"
                  class="inline-flex min-h-toque items-center text-base font-medium text-primaria hover:underline"
                >
                  {{ passo.rotulo }}
                </a>
              </li>
            }
          </ol>
        </section>
      }
    }
  `,
})
export class Painel {
  private readonly api = inject(PainelService);
  private readonly sessao = inject(SessaoService);
  private readonly tentativas = new BehaviorSubject<void>(undefined);

  protected readonly estado = toSignal(
    this.tentativas.pipe(switchMap(() => this.carregar())),
    { initialValue: { tipo: 'carregando' } satisfies EstadoPainel },
  );
  protected readonly painel = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'pronto' ? estado.painel : null;
  });
  protected readonly passos = computed(() =>
    this.sessao.usuario()?.papel === 'SINDICO' ? [...PASSOS_COMUNS, PASSO_DO_SINDICO] : PASSOS_COMUNS,
  );
  protected readonly esperaLonga = toSignal(timer(ESPERA_ANTES_DO_SKELETON_MS).pipe(map(() => true)), {
    initialValue: false,
  });

  protected tentarDeNovo(): void {
    this.tentativas.next();
  }

  private carregar(): Observable<EstadoPainel> {
    return this.api.obter().pipe(
      map((painel): EstadoPainel => ({ tipo: 'pronto', painel })),
      catchError(() => of<EstadoPainel>({ tipo: 'erro' })),
      startWith<EstadoPainel>({ tipo: 'carregando' }),
    );
  }
}
