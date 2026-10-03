import { Component, computed, input } from '@angular/core';

export type FormaSkeleton = 'cartao' | 'linha-tabela' | 'detalhe';

@Component({
  selector: 'ui-skeleton',
  host: { class: 'block', 'aria-busy': 'true' },
  template: `
    <span class="sr-only">Carregando…</span>
    <div class="space-y-3 motion-safe:animate-pulse" aria-hidden="true">
      @for (item of itens(); track $index) {
        @switch (forma()) {
          @case ('cartao') {
            <div class="rounded-cartao border border-borda bg-superficie p-4">
              <div class="flex gap-2">
                <div class="h-5 w-24 rounded-full bg-superficie-sutil"></div>
                <div class="h-5 w-20 rounded-full bg-superficie-sutil"></div>
              </div>
              <div class="mt-3 h-4 w-3/4 rounded bg-superficie-sutil"></div>
              <div class="mt-2 h-3 w-full rounded bg-superficie-sutil"></div>
              <div class="mt-2 h-3 w-1/2 rounded bg-superficie-sutil"></div>
            </div>
          }
          @case ('linha-tabela') {
            <div class="flex items-center gap-4 border-b border-borda py-3">
              <div class="h-4 w-10 rounded bg-superficie-sutil"></div>
              <div class="h-4 flex-1 rounded bg-superficie-sutil"></div>
              <div class="h-5 w-24 rounded-full bg-superficie-sutil"></div>
              <div class="h-4 w-16 rounded bg-superficie-sutil"></div>
            </div>
          }
          @case ('detalhe') {
            <div class="space-y-3">
              <div class="h-6 w-2/3 rounded bg-superficie-sutil"></div>
              <div class="h-4 w-1/3 rounded bg-superficie-sutil"></div>
              <div class="h-24 w-full rounded-cartao bg-superficie-sutil"></div>
            </div>
          }
        }
      }
    </div>
  `,
})
export class Skeleton {
  readonly forma = input<FormaSkeleton>('cartao');
  readonly quantidade = input(3);

  protected readonly itens = computed(() => Array.from({ length: this.quantidade() }));
}
