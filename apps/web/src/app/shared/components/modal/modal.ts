import { booleanAttribute, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { Botao } from '../botao/botao';
import { ControleDialogo } from '../dialogo/controle-dialogo';
import { idUnico } from '../../utils/id-unico';
import { Icone } from '../icone/icone';

export type TipoModal = 'dialog' | 'alertdialog';
export type TamanhoModal = 'padrao' | 'largo';

@Component({
  selector: 'ui-modal',
  imports: [Botao, Icone],
  host: { '(keydown.escape)': 'aoCancelar($event)' },
  template: `
    <dialog
      #dialogo
      class="ui-dialogo ui-dialogo-folha ui-dialogo-centro-md m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-superficie p-0 text-texto shadow-xl md:m-auto md:rounded-cartao"
      [class]="tamanho() === 'largo' ? 'md:max-w-2xl' : 'md:max-w-lg'"
      [attr.role]="tipo() === 'alertdialog' ? 'alertdialog' : null"
      [attr.aria-labelledby]="idTitulo"
      [attr.aria-describedby]="tipo() === 'alertdialog' ? idCorpo : null"
      (cancel)="aoCancelar($event)"
      (close)="aoFechar()"
    >
      <div class="p-4 md:p-6">
        <div class="flex items-start justify-between gap-3">
          <h2 [id]="idTitulo" class="pt-2 text-base leading-6 font-semibold">{{ titulo() }}</h2>
          @if (tipo() === 'dialog') {
            <button
              type="button"
              ui-botao
              variante="texto"
              icone
              class="-mt-1 -mr-2"
              [attr.aria-label]="rotuloFechar()"
              [desabilitado]="ocupado()"
              (click)="fechar()"
            >
              <ui-icone nome="fechar" [tamanho]="24" />
            </button>
          }
        </div>
        <div [id]="idCorpo" class="mt-1 text-sm text-texto-secundario">
          <ng-content />
        </div>
        <div class="mt-5 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <ng-content select="[acoes]" />
        </div>
      </div>
    </dialog>
  `,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly tipo = input<TipoModal>('dialog');
  readonly tamanho = input<TamanhoModal>('padrao');
  readonly ocupado = input(false, { transform: booleanAttribute });
  readonly rotuloFechar = input('Fechar');

  readonly fechado = output<void>();

  protected readonly idTitulo = idUnico('modal-titulo');
  protected readonly idCorpo = idUnico('modal-corpo');

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly controle = new ControleDialogo(() => this.dialogo().nativeElement);

  readonly aberto = this.controle.aberto;

  abrir(): void {
    this.controle.abrir();
  }

  fechar(): void {
    this.controle.fechar();
  }

  // O Chrome (CloseWatcher) ignora o preventDefault do cancel num segundo Esc; barrar o keydown impede o pedido de fechar.
  protected aoCancelar(evento: Event): void {
    if (this.ocupado()) {
      evento.preventDefault();
    }
  }

  protected aoFechar(): void {
    this.controle.aoFechar();
    this.fechado.emit();
  }
}
