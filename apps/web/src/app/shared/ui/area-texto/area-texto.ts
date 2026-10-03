import { booleanAttribute, Component, computed, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { classesControle } from '../formulario/classes-controle';
import { ControleDeValor } from '../formulario/controle-de-valor';
import { MolduraCampo } from '../formulario/moldura-campo';

const FOLGA_AVISO_MAXIMO = 100;

@Component({
  selector: 'ui-area-texto',
  imports: [MolduraCampo],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AreaTexto), multi: true }],
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
      <textarea
        [id]="idCampo"
        [rows]="linhas()"
        [value]="valor()"
        [disabled]="estaDesabilitado()"
        [attr.maxlength]="max() ?? null"
        [attr.aria-invalid]="erro() ? 'true' : null"
        [attr.aria-describedby]="descritoPor()"
        [class]="classes()"
        (input)="aoDigitar($event)"
        (blur)="aoSair()"
      ></textarea>
      @if (contador() && max()) {
        <p class="mt-1 text-right text-sm text-texto-secundario tabular-nums" aria-hidden="true">
          {{ valor().length }}/{{ max() }}
        </p>
      }
      <span class="sr-only" aria-live="polite">{{ anuncio() }}</span>
    </ui-moldura-campo>
  `,
})
export class AreaTexto extends ControleDeValor {
  readonly min = input<number>();
  readonly max = input<number>();
  readonly linhas = input(5);
  readonly contador = input(false, { transform: booleanAttribute });

  protected readonly anuncio = signal('');

  protected readonly classes = computed(() =>
    classesControle(!!this.erro(), 'rounded-controle pr-3 leading-6'),
  );

  protected aoDigitar(evento: Event): void {
    const anterior = this.valor().length;
    this.aoAlterar(evento);
    const atual = this.valor().length;
    const mensagem = this.mensagemDeLimiar(anterior, atual);
    if (mensagem) {
      this.anuncio.set(mensagem);
    }
  }

  private mensagemDeLimiar(anterior: number, atual: number): string | null {
    const min = this.min();
    const max = this.max();
    if (min !== undefined && anterior < min && atual >= min) {
      return `Mínimo de ${min} caracteres atingido.`;
    }
    if (max !== undefined) {
      const limiar = max - FOLGA_AVISO_MAXIMO;
      if (anterior < limiar && atual >= limiar) {
        return `Restam ${max - atual} caracteres.`;
      }
    }
    return null;
  }
}
