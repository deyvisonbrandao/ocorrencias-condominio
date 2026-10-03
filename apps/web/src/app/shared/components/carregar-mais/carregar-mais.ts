import { booleanAttribute, Component, input, output } from '@angular/core';
import { Botao } from '../botao/botao';
import { Icone } from '../icone/icone';

@Component({
  selector: 'ui-carregar-mais',
  imports: [Botao, Icone],
  host: { class: 'block' },
  template: `
    @if (erro()) {
      <div
        role="alert"
        class="flex flex-col items-start gap-3 rounded-cartao border border-perigo-linha bg-perigo-suave p-4 text-sm text-perigo-texto md:flex-row md:items-center md:justify-between"
      >
        <p class="flex items-start gap-2">
          <ui-icone nome="alerta" class="mt-0.5" />
          {{ mensagemErro() }}
        </p>
        <button type="button" ui-botao variante="secundario" (click)="carregar.emit()">
          <ui-icone nome="recarregar" />
          Tentar de novo
        </button>
      </div>
    } @else if (fim()) {
      <p class="py-3 text-center text-sm text-texto-secundario">Isso é tudo.</p>
    } @else {
      <button
        type="button"
        ui-botao
        variante="secundario"
        bloco
        rotuloCarregando="Carregando…"
        [carregando]="carregando()"
        (click)="carregar.emit()"
      >
        Carregar mais
      </button>
    }
  `,
})
export class CarregarMais {
  readonly carregando = input(false, { transform: booleanAttribute });
  readonly fim = input(false, { transform: booleanAttribute });
  readonly erro = input(false, { transform: booleanAttribute });
  readonly mensagemErro = input('Não foi possível carregar mais itens.');

  readonly carregar = output<void>();
}
