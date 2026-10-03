import { booleanAttribute, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icone } from '../icone/icone';
import { idUnico } from '../id-unico';

@Component({
  selector: 'ui-caixa-selecao',
  imports: [Icone],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CaixaSelecao), multi: true },
  ],
  host: { class: 'block' },
  template: `
    <label
      class="flex min-h-toque cursor-pointer items-start gap-3 py-2.5 text-sm leading-5 text-texto"
    >
      <input
        type="checkbox"
        class="mt-px h-5 w-5 shrink-0 cursor-pointer accent-primaria disabled:cursor-not-allowed"
        [checked]="marcado()"
        [disabled]="estaDesabilitado()"
        [attr.aria-invalid]="erro() ? 'true' : null"
        [attr.aria-describedby]="erro() ? idErro : null"
        (change)="aoMudar($event)"
        (blur)="aoTocar()"
      />
      <span class="min-w-0 flex-1"><ng-content /></span>
    </label>
    @if (erro()) {
      <p [id]="idErro" class="mt-1 flex items-start gap-1.5 text-sm font-medium text-perigo">
        <ui-icone nome="alerta" [tamanho]="16" class="mt-0.5" />
        <span>{{ erro() }}</span>
      </p>
    }
  `,
})
export class CaixaSelecao implements ControlValueAccessor {
  readonly erro = input<string | null>();
  readonly desabilitado = input(false, { transform: booleanAttribute });

  protected readonly idErro = `${idUnico('caixa')}-erro`;
  protected readonly marcado = signal(false);
  private readonly desabilitadoPeloFormulario = signal(false);

  protected readonly estaDesabilitado = computed(
    () => this.desabilitado() || this.desabilitadoPeloFormulario(),
  );

  private notificarMudanca: (valor: boolean) => void = () => undefined;
  private notificarToque: () => void = () => undefined;

  writeValue(valor: unknown): void {
    this.marcado.set(valor === true);
  }

  registerOnChange(fn: (valor: boolean) => void): void {
    this.notificarMudanca = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.notificarToque = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitadoPeloFormulario.set(desabilitado);
  }

  protected aoMudar(evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.marcado.set(marcado);
    this.notificarMudanca(marcado);
  }

  protected aoTocar(): void {
    this.notificarToque();
  }
}
