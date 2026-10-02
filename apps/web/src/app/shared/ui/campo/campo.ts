import { booleanAttribute, Component, computed, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { classesControle } from '../formulario/classes-controle';
import { ControleDeValor } from '../formulario/controle-de-valor';
import { MolduraCampo } from '../formulario/moldura-campo';
import { Icone } from '../icone/icone';

export type TipoCampo = 'text' | 'tel' | 'email' | 'password' | 'date' | 'search';

@Component({
  selector: 'ui-campo',
  imports: [MolduraCampo, Icone],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Campo), multi: true }],
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
      <div class="relative flex">
        @if (prefixo()) {
          <span
            class="inline-flex shrink-0 items-center rounded-l-controle border border-r-0 border-borda-controle bg-superficie-sutil px-3 text-base text-texto-secundario"
          >
            {{ prefixo() }}
          </span>
        }
        <input
          [id]="idCampo"
          [type]="tipoEfetivo()"
          [value]="valor()"
          [disabled]="estaDesabilitado()"
          [readOnly]="somenteLeitura()"
          [attr.autocomplete]="autocomplete() ?? null"
          [attr.inputmode]="inputmode() ?? null"
          [attr.placeholder]="placeholder() ?? null"
          [attr.min]="min() ?? null"
          [attr.max]="max() ?? null"
          [attr.maxlength]="maxlength() ?? null"
          [attr.aria-invalid]="erro() ? 'true' : null"
          [attr.aria-describedby]="descritoPor()"
          [class]="classes()"
          (input)="aoAlterar($event)"
          (blur)="aoSair()"
        />
        @if (tipo() === 'password') {
          <button
            type="button"
            class="absolute inset-y-0 right-0 inline-flex w-toque items-center justify-center rounded-r-controle text-texto-secundario hover:text-texto"
            aria-label="Mostrar senha"
            [attr.aria-pressed]="senhaVisivel()"
            [attr.aria-controls]="idCampo"
            (click)="alternarSenha()"
          >
            <ui-icone [nome]="senhaVisivel() ? 'anonimo' : 'olho'" />
          </button>
        }
      </div>
    </ui-moldura-campo>
  `,
})
export class Campo extends ControleDeValor {
  readonly tipo = input<TipoCampo>('text');
  readonly prefixo = input<string>();
  readonly autocomplete = input<string>();
  readonly inputmode = input<string>();
  readonly placeholder = input<string>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly maxlength = input<number>();
  readonly somenteLeitura = input(false, { transform: booleanAttribute });

  protected readonly senhaVisivel = signal(false);

  protected readonly tipoEfetivo = computed(() =>
    this.tipo() === 'password' && this.senhaVisivel() ? 'text' : this.tipo(),
  );

  protected readonly classes = computed(() => {
    const arredondamento = this.prefixo() ? 'rounded-r-controle' : 'rounded-controle';
    const folgaSenha = this.tipo() === 'password' ? 'pr-12' : '';
    const leitura = this.somenteLeitura() ? 'bg-superficie-app' : '';
    return classesControle(!!this.erro(), `min-h-toque ${arredondamento} ${folgaSenha} ${leitura}`);
  });

  protected alternarSenha(): void {
    this.senhaVisivel.update((visivel) => !visivel);
  }
}
