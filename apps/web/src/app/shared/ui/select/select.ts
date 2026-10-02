import { Component, computed, forwardRef, input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { classesControle } from '../formulario/classes-controle';
import { ControleDeValor } from '../formulario/controle-de-valor';
import { MolduraCampo } from '../formulario/moldura-campo';

export interface OpcaoSelect {
  readonly valor: string;
  readonly rotulo: string;
}

@Component({
  selector: 'ui-select',
  imports: [MolduraCampo],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
  host: { class: 'block' },
  template: `
    <ui-moldura-campo
      [idCampo]="idCampo"
      [idDica]="idDica"
      [idErro]="idErro"
      [rotulo]="rotulo()"
      [dica]="dica()"
      [erro]="erro()"
      [opcional]="opcional()"
    >
      <select
        [id]="idCampo"
        [disabled]="estaDesabilitado()"
        [attr.aria-invalid]="erro() ? 'true' : null"
        [attr.aria-describedby]="descritoPor()"
        [class]="classes()"
        (change)="aoAlterar($event)"
        (blur)="aoSair()"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="valor() === ''">{{ placeholder() }}</option>
        }
        @for (opcao of opcoes(); track opcao.valor) {
          <option [value]="opcao.valor" [selected]="opcao.valor === valor()">{{ opcao.rotulo }}</option>
        }
      </select>
    </ui-moldura-campo>
  `,
})
export class Select extends ControleDeValor {
  readonly opcoes = input.required<readonly OpcaoSelect[]>();
  readonly placeholder = input<string>();

  protected readonly classes = computed(() =>
    classesControle(!!this.erro(), 'min-h-toque rounded-controle'),
  );
}
