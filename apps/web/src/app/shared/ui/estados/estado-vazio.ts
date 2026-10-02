import { Component, input } from '@angular/core';
import { Icone } from '../icone/icone';
import { NomeIcone } from '../icone/icones';

@Component({
  selector: 'ui-estado-vazio',
  imports: [Icone],
  host: {
    class:
      'flex flex-col items-center rounded-cartao border border-dashed border-gray-300 bg-superficie px-6 py-10 text-center',
  },
  template: `
    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-superficie-sutil text-texto-secundario">
      <ui-icone [nome]="icone()" [tamanho]="24" />
    </span>
    @if (nivel() === 2) {
      <h2 class="mt-4 text-base font-semibold text-texto">{{ titulo() }}</h2>
    } @else {
      <h3 class="mt-4 text-base font-semibold text-texto">{{ titulo() }}</h3>
    }
    @if (texto()) {
      <p class="mt-1 max-w-sm text-sm text-texto-secundario">{{ texto() }}</p>
    }
    <div class="mt-5 empty:hidden">
      <ng-content />
    </div>
  `,
})
export class EstadoVazio {
  readonly icone = input.required<NomeIcone>();
  readonly titulo = input.required<string>();
  readonly texto = input<string>();
  readonly nivel = input<2 | 3>(2);
}
