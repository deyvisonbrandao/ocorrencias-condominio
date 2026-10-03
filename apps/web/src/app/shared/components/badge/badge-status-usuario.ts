import { Component, computed, input } from '@angular/core';
import { StatusUsuario } from '@ocorrencias/contratos';
import { STATUS_USUARIO } from '../../utils/dominio';

@Component({
  selector: 'ui-badge-status-usuario',
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-5 font-semibold whitespace-nowrap"
      [class]="apresentacao().classes"
    >
      <span class="h-1.5 w-1.5 rounded-full" [class]="apresentacao().classePonto" aria-hidden="true"></span>
      {{ apresentacao().rotulo }}
    </span>
  `,
})
export class BadgeStatusUsuario {
  readonly status = input.required<StatusUsuario>();

  protected readonly apresentacao = computed(() => STATUS_USUARIO[this.status()]);
}
