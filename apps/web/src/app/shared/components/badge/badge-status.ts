import { Component, computed, input } from '@angular/core';
import { StatusOcorrencia } from '@ocorrencias/contratos';
import { STATUS_OCORRENCIA } from '../../utils/dominio';

@Component({
  selector: 'ui-badge-status',
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
export class BadgeStatus {
  readonly status = input.required<StatusOcorrencia>();

  protected readonly apresentacao = computed(() => STATUS_OCORRENCIA[this.status()]);
}
