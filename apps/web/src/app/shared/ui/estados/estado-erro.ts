import { afterNextRender, booleanAttribute, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { Botao } from '../botao/botao';
import { Icone } from '../icone/icone';

@Component({
  selector: 'ui-estado-erro',
  imports: [Botao, Icone],
  host: {
    role: 'alert',
    class: 'flex flex-col items-center rounded-cartao border border-perigo-linha bg-superficie px-6 py-10 text-center',
  },
  template: `
    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-perigo-suave text-perigo-texto">
      <ui-icone nome="alerta" [tamanho]="24" />
    </span>
    <p class="mt-4 text-base font-semibold text-texto">{{ titulo() }}</p>
    @if (texto()) {
      <p class="mt-1 max-w-sm text-sm text-texto-secundario">{{ texto() }}</p>
    }
    <button #tentar type="button" ui-botao variante="secundario" class="mt-5" (click)="tentarDeNovo.emit()">
      <ui-icone nome="recarregar" />
      Tentar de novo
    </button>
  `,
})
export class EstadoErro {
  readonly titulo = input.required<string>();
  readonly texto = input('Verifique a conexão e tente de novo.');
  readonly focar = input(false, { transform: booleanAttribute });

  readonly tentarDeNovo = output<void>();

  private readonly botao = viewChild.required<ElementRef<HTMLButtonElement>>('tentar');

  constructor() {
    afterNextRender(() => {
      if (this.focar()) {
        this.botao().nativeElement.focus();
      }
    });
  }
}
