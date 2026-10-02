import { computed, Directive, input, signal, booleanAttribute } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { idUnico } from '../id-unico';

@Directive()
export abstract class ControleDeValor implements ControlValueAccessor {
  readonly rotulo = input.required<string>();
  readonly dica = input<string>();
  readonly erro = input<string | null>();
  readonly opcional = input(false, { transform: booleanAttribute });
  readonly desabilitado = input(false, { transform: booleanAttribute });

  protected readonly idCampo = idUnico('campo');
  protected readonly idDica = `${this.idCampo}-dica`;
  protected readonly idErro = `${this.idCampo}-erro`;

  protected readonly valor = signal('');
  private readonly desabilitadoPeloFormulario = signal(false);

  protected readonly estaDesabilitado = computed(
    () => this.desabilitado() || this.desabilitadoPeloFormulario(),
  );

  protected readonly descritoPor = computed(() => {
    const ids = [this.dica() ? this.idDica : null, this.erro() ? this.idErro : null];
    const valor = ids.filter((id): id is string => id !== null).join(' ');
    return valor || null;
  });

  private aoMudar: (valor: string) => void = () => undefined;
  private aoTocar: () => void = () => undefined;

  writeValue(valor: unknown): void {
    this.valor.set(valor === null || valor === undefined ? '' : String(valor));
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitadoPeloFormulario.set(desabilitado);
  }

  protected aoAlterar(evento: Event): void {
    const alvo = evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    this.valor.set(alvo.value);
    this.aoMudar(alvo.value);
  }

  protected aoSair(): void {
    this.aoTocar();
  }
}
