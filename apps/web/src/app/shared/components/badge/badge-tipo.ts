import { booleanAttribute, Component, computed, input } from '@angular/core';
import { TipoOcorrencia } from '@ocorrencias/contratos';
import { TIPO_OCORRENCIA } from '../../utils/dominio';
import { Icone } from '../icone/icone';

@Component({
  selector: 'ui-badge-tipo',
  imports: [Icone],
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-full border border-borda bg-superficie px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap text-texto-secundario"
    >
      <ui-icone [nome]="apresentacao().icone" [tamanho]="14" />
      {{ curto() ? apresentacao().rotuloCurto : apresentacao().rotulo }}
    </span>
  `,
})
export class BadgeTipo {
  readonly tipo = input.required<TipoOcorrencia>();
  readonly curto = input(true, { transform: booleanAttribute });

  protected readonly apresentacao = computed(() => TIPO_OCORRENCIA[this.tipo()]);
}
