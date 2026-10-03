import { Component, computed, input } from '@angular/core';
import { Urgencia } from '@ocorrencias/contratos';
import { ROTULO_NAO_TRIADA, URGENCIA } from '../../utils/dominio';

interface Barra {
  readonly x: number;
  readonly y: number;
  readonly altura: number;
}

const BARRAS: readonly Barra[] = [
  { x: 0.5, y: 11, altura: 4 },
  { x: 5.25, y: 8, altura: 7 },
  { x: 10, y: 5, altura: 10 },
  { x: 14.75, y: 2, altura: 13 },
];

@Component({
  selector: 'ui-badge-urgencia',
  template: `
    @if (apresentacao(); as urgencia) {
      <span
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap"
        [class]="urgencia.classes"
      >
        <svg class="h-3.5 w-4" viewBox="0 0 19 16" aria-hidden="true" focusable="false">
          @for (barra of barras; track $index) {
            @if ($index < urgencia.nivel) {
              <rect [attr.x]="barra.x" [attr.y]="barra.y" width="3.5" [attr.height]="barra.altura" rx="1" fill="currentColor" />
            } @else {
              <rect
                [attr.x]="barra.x + 0.5"
                [attr.y]="barra.y + 0.5"
                width="2.5"
                [attr.height]="barra.altura - 1"
                rx="0.75"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
              />
            }
          }
        </svg>
        <span class="sr-only">Urgência </span>{{ urgencia.rotulo }}
      </span>
    } @else {
      <span
        class="inline-flex items-center rounded-full border border-dashed border-borda-controle bg-superficie px-2.5 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap text-texto-secundario"
      >
        {{ rotuloNaoTriada }}
      </span>
    }
  `,
})
export class BadgeUrgencia {
  readonly urgencia = input.required<Urgencia | null>();

  protected readonly barras = BARRAS;
  protected readonly rotuloNaoTriada = ROTULO_NAO_TRIADA;
  protected readonly apresentacao = computed(() => {
    const urgencia = this.urgencia();
    return urgencia ? URGENCIA[urgencia] : null;
  });
}
