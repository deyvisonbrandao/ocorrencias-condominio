import { Component, computed, input } from '@angular/core';
import { ICONES, NomeIcone } from './icones';

export type TamanhoIcone = 14 | 16 | 20 | 24;

@Component({
  selector: 'ui-icone',
  host: {
    class: 'inline-flex shrink-0',
    '[attr.role]': 'rotulo() ? "img" : null',
    '[attr.aria-label]': 'rotulo() || null',
    '[attr.aria-hidden]': 'rotulo() ? null : "true"',
  },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      aria-hidden="true"
      [attr.width]="tamanho()"
      [attr.height]="tamanho()"
    >
      @for (d of tracos(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class Icone {
  readonly nome = input.required<NomeIcone>();
  readonly tamanho = input<TamanhoIcone>(20);
  readonly rotulo = input<string>();

  protected readonly tracos = computed(() => ICONES[this.nome()]);
}
