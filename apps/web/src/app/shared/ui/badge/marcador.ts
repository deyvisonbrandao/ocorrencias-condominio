import { Component, input } from '@angular/core';
import { Icone } from '../icone/icone';

export type TipoMarcador = 'atrasada' | 'restrita';

@Component({
  selector: 'ui-marcador',
  imports: [Icone],
  template: `
    @switch (tipo()) {
      @case ('atrasada') {
        <span
          class="inline-flex items-center gap-1 rounded-full bg-atrasada-fundo px-2.5 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap text-atrasada-texto"
        >
          <ui-icone nome="relogio" [tamanho]="14" />
          Atrasada
        </span>
      }
      @case ('restrita') {
        <span
          class="inline-flex items-center gap-1 rounded-full border border-borda bg-superficie px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap text-texto-secundario"
        >
          <ui-icone nome="cadeado" [tamanho]="14" />
          Restrita
        </span>
      }
    }
  `,
})
export class Marcador {
  readonly tipo = input.required<TipoMarcador>();
}
