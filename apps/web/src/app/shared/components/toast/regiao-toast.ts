import { Component, inject } from '@angular/core';
import { Botao } from '../botao/botao';
import { PresencaBottomNav } from '../bottom-nav/presenca-bottom-nav';
import { Icone } from '../icone/icone';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'ui-regiao-toast',
  imports: [Botao, Icone],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-96 md:px-0"
      [class]="presencaBottomNav.visivel() ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))]' : 'bottom-4'"
    >
      <div aria-live="polite" class="flex w-full max-w-sm flex-col gap-2 md:max-w-none">
        @for (toast of toasts.sucessos(); track toast.id) {
          <div
            class="pointer-events-auto flex items-center gap-3 rounded-cartao border border-sucesso-linha bg-superficie p-3 shadow-lg"
            (mouseenter)="toasts.pausar(toast.id, 'ponteiro')"
            (mouseleave)="toasts.retomar(toast.id, 'ponteiro')"
            (focusin)="toasts.pausar(toast.id, 'foco')"
            (focusout)="aoPerderFoco(toast.id, $event)"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sucesso-suave text-sucesso-texto">
              <ui-icone nome="check" />
            </span>
            <p class="flex-1 text-sm font-medium text-texto">{{ toast.mensagem }}</p>
            <button type="button" ui-botao variante="texto" icone aria-label="Fechar aviso" (click)="toasts.fechar(toast.id)">
              <ui-icone nome="fechar" />
            </button>
          </div>
        }
      </div>
      <div role="alert" class="flex w-full max-w-sm flex-col gap-2 md:max-w-none">
        @for (toast of toasts.erros(); track toast.id) {
          <div class="pointer-events-auto flex items-center gap-3 rounded-cartao border border-perigo-linha bg-superficie p-3 shadow-lg">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-perigo-suave text-perigo-texto">
              <ui-icone nome="alerta" />
            </span>
            <p class="flex-1 text-sm font-medium text-texto">{{ toast.mensagem }}</p>
            <button type="button" ui-botao variante="texto" icone aria-label="Fechar aviso" (click)="toasts.fechar(toast.id)">
              <ui-icone nome="fechar" />
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class RegiaoToast {
  protected readonly toasts = inject(ToastService);
  protected readonly presencaBottomNav = inject(PresencaBottomNav);

  protected aoPerderFoco(id: number, evento: FocusEvent): void {
    const cartao = evento.currentTarget;
    const destino = evento.relatedTarget;
    if (cartao instanceof Node && destino instanceof Node && cartao.contains(destino)) {
      return;
    }
    this.toasts.retomar(id, 'foco');
  }
}
