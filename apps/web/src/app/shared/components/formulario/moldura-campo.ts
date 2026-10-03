import { booleanAttribute, Component, input } from '@angular/core';
import { Icone } from '../icone/icone';

@Component({
  selector: 'ui-moldura-campo',
  imports: [Icone],
  host: { class: 'block' },
  template: `
    <label [for]="idCampo()" class="block text-sm leading-5 font-semibold text-texto">
      {{ rotulo() }}
      @if (opcional()) {
        <span class="font-normal text-texto-secundario">(opcional)</span>
      }
    </label>
    @if (dica()) {
      <p [id]="idDica()" class="mt-0.5 text-sm text-texto-secundario">{{ dica() }}</p>
    }
    <div class="mt-2">
      <ng-content />
    </div>
    @if (erro()) {
      <p [id]="idErro()" class="mt-2 flex items-start gap-1.5 text-sm font-medium text-perigo">
        <ui-icone nome="alerta" [tamanho]="16" class="mt-0.5" />
        <span>{{ erro() }} <ng-content select="[acaoErro]" /></span>
      </p>
    }
  `,
})
export class MolduraCampo {
  readonly idCampo = input.required<string>();
  readonly idDica = input.required<string>();
  readonly idErro = input.required<string>();
  readonly rotulo = input.required<string>();
  readonly dica = input<string>();
  readonly erro = input<string | null>();
  readonly opcional = input(false, { transform: booleanAttribute });
}
