import {
  afterNextRender,
  booleanAttribute,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Botao } from '../botao/botao';
import { Icone } from '../icone/icone';
import { idUnico } from '../../utils/id-unico';

@Component({
  selector: 'button[ui-item-menu]',
  host: {
    type: 'button',
    class:
      'flex min-h-toque w-full items-center gap-2 px-4 text-left text-sm font-medium transition-colors duration-rapido hover:bg-superficie-sutil focus-visible:bg-superficie-sutil',
    '[class.text-texto]': '!perigo()',
    '[class.text-perigo]': 'perigo()',
  },
  template: `<ng-content />`,
})
export class ItemMenu {
  readonly perigo = input(false, { transform: booleanAttribute });
}

@Component({
  selector: 'ui-menu-acoes',
  imports: [Botao, Icone],
  host: {
    class: 'relative inline-flex',
    '(keydown)': 'aoTeclar($event)',
    '(focusout)': 'aoPerderFoco($event)',
    '(document:click)': 'aoClicarNoDocumento($event)',
  },
  template: `
    <button
      #gatilho
      type="button"
      ui-botao
      variante="texto"
      icone
      [attr.aria-label]="rotulo()"
      [attr.aria-expanded]="aberto()"
      [attr.aria-controls]="idPainel"
      (click)="alternar()"
    >
      <ui-icone nome="mais-acoes" [tamanho]="24" />
    </button>
    <div
      #painel
      [id]="idPainel"
      [hidden]="!aberto()"
      class="absolute top-full right-0 z-20 mt-1 min-w-48 rounded-controle border border-borda bg-superficie py-1 shadow-lg"
    >
      <ng-content />
    </div>
  `,
})
export class MenuAcoes {
  readonly rotulo = input.required<string>();

  protected readonly idPainel = idUnico('menu-acoes');
  protected readonly aberto = signal(false);

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly gatilho = viewChild.required('gatilho', { read: ElementRef<HTMLButtonElement> });
  private readonly painel = viewChild.required<ElementRef<HTMLElement>>('painel');

  constructor() {
    // Em captura, antes do (click) do item: o foco volta ao gatilho antes que o item abra um diálogo,
    // e o diálogo devolve o foco a ele (e não a um item que some com o menu fechado).
    const aoEscolher = (evento: Event) => {
      const alvo = evento.target;
      if (alvo instanceof Element && this.painel().nativeElement.contains(alvo) && alvo.closest('button')) {
        this.fechar(true);
      }
    };
    this.elemento.addEventListener('click', aoEscolher, { capture: true });
    inject(DestroyRef).onDestroy(() => this.elemento.removeEventListener('click', aoEscolher, { capture: true }));
  }

  protected alternar(): void {
    if (this.aberto()) {
      this.fechar(false);
      return;
    }
    this.aberto.set(true);
    afterNextRender(() => this.itens()[0]?.focus(), { injector: this.injector });
  }

  protected aoTeclar(evento: KeyboardEvent): void {
    if (!this.aberto()) {
      return;
    }
    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.fechar(true);
      return;
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      const itens = this.itens();
      if (itens.length === 0) {
        return;
      }
      evento.preventDefault();
      const atual = itens.indexOf(document.activeElement as HTMLButtonElement);
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      itens[(atual + passo + itens.length) % itens.length].focus();
    }
  }

  protected aoPerderFoco(evento: FocusEvent): void {
    const destino = evento.relatedTarget;
    if (this.aberto() && destino instanceof Node && !this.elemento.contains(destino)) {
      this.aberto.set(false);
    }
  }

  protected aoClicarNoDocumento(evento: MouseEvent): void {
    const alvo = evento.target;
    if (this.aberto() && alvo instanceof Node && !this.elemento.contains(alvo)) {
      this.aberto.set(false);
    }
  }

  private fechar(devolverFoco: boolean): void {
    this.aberto.set(false);
    if (devolverFoco) {
      this.gatilho().nativeElement.focus();
    }
  }

  private itens(): HTMLButtonElement[] {
    return [...this.painel().nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
  }
}
