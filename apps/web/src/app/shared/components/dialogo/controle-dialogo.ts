import { signal } from '@angular/core';

const SELETOR_CAMPO =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

export class ControleDialogo {
  private readonly estaAberto = signal(false);
  private origem: HTMLElement | null = null;

  readonly aberto = this.estaAberto.asReadonly();

  constructor(private readonly dialogo: () => HTMLDialogElement | undefined) {}

  abrir(): void {
    const elemento = this.dialogo();
    if (!elemento || elemento.open) {
      return;
    }
    const ativo = elemento.ownerDocument.activeElement;
    this.origem = ativo instanceof HTMLElement ? ativo : null;
    elemento.showModal();
    this.estaAberto.set(true);
    const alvo =
      elemento.querySelector<HTMLElement>('[data-foco-inicial]') ??
      elemento.querySelector<HTMLElement>(SELETOR_CAMPO);
    alvo?.focus();
  }

  fechar(): void {
    const elemento = this.dialogo();
    if (elemento?.open) {
      elemento.close();
    }
  }

  aoFechar(): void {
    this.estaAberto.set(false);
    const origem = this.origem;
    this.origem = null;
    if (origem?.isConnected) {
      origem.focus();
    }
  }
}
