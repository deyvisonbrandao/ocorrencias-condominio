import { booleanAttribute, Component, computed, DestroyRef, ElementRef, inject, input } from '@angular/core';

export type VarianteBotao = 'primario' | 'secundario' | 'texto' | 'perigo' | 'perigo-contorno';

const BASE =
  'inline-flex min-h-toque items-center justify-center gap-2 rounded-controle text-sm font-semibold transition-colors duration-rapido select-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const VARIANTES: Readonly<Record<VarianteBotao, string>> = {
  primario: 'bg-primaria text-texto-inverso hover:bg-primaria-hover active:bg-primaria-hover',
  secundario:
    'border border-borda-controle bg-superficie text-texto hover:bg-superficie-sutil active:bg-superficie-sutil',
  texto: 'text-primaria hover:bg-primaria-suave active:bg-primaria-suave',
  perigo: 'bg-perigo text-texto-inverso hover:bg-perigo-hover active:bg-perigo-hover',
  'perigo-contorno':
    'border border-perigo-borda bg-superficie text-perigo hover:bg-perigo-suave active:bg-perigo-suave',
};

const ICONE_TEXTO = 'text-texto-secundario hover:bg-superficie-sutil hover:text-texto active:bg-superficie-sutil';

@Component({
  selector: 'button[ui-botao], a[ui-botao]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-disabled]': 'bloqueado() ? "true" : null',
    '[attr.aria-busy]': 'carregando() ? "true" : null',
  },
  template: `
    @if (carregando()) {
      <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </svg>
    }
    @if (carregando() && rotuloCarregando()) {
      <span>{{ rotuloCarregando() }}</span>
    }
    <span class="contents" [class.hidden]="carregando() && !!rotuloCarregando()">
      <ng-content />
    </span>
  `,
})
export class Botao {
  readonly variante = input<VarianteBotao>('primario');
  readonly bloco = input(false, { transform: booleanAttribute });
  readonly icone = input(false, { transform: booleanAttribute });
  readonly carregando = input(false, { transform: booleanAttribute });
  readonly desabilitado = input(false, { transform: booleanAttribute });
  readonly rotuloCarregando = input<string>();

  protected readonly bloqueado = computed(() => this.carregando() || this.desabilitado());

  protected readonly classes = computed(() => {
    const variante = this.variante();
    const cor = this.icone() && variante === 'texto' ? ICONE_TEXTO : VARIANTES[variante];
    const forma = this.icone() ? 'h-toque w-toque shrink-0' : 'px-4';
    const largura = this.bloco() ? 'w-full md:w-auto' : '';
    return `${BASE} ${cor} ${forma} ${largura}`;
  });

  constructor() {
    const elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const bloquear = (evento: Event) => {
      if (this.bloqueado()) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
      }
    };
    // Em captura, roda antes do (click) de quem usa o botão, que o Angular registra primeiro.
    elemento.addEventListener('click', bloquear, { capture: true });
    inject(DestroyRef).onDestroy(() => elemento.removeEventListener('click', bloquear, { capture: true }));
  }
}
