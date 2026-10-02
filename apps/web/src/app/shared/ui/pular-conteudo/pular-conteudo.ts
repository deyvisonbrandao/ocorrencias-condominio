import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';

export const ID_CONTEUDO = 'conteudo';

export function focarTituloDoConteudo(documento: Document): boolean {
  const titulo = documento.querySelector<HTMLElement>(`#${ID_CONTEUDO} h1`);
  if (!titulo) {
    return false;
  }
  if (!titulo.hasAttribute('tabindex')) {
    titulo.setAttribute('tabindex', '-1');
  }
  titulo.focus();
  return true;
}

@Component({
  selector: 'ui-pular-conteudo',
  template: `
    <a
      [href]="'#' + idConteudo"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:rounded-controle focus:bg-superficie focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primaria focus:shadow-lg"
      (click)="pular($event)"
    >
      Pular para o conteúdo
    </a>
  `,
})
export class PularConteudo {
  private readonly documento = inject(DOCUMENT);

  protected readonly idConteudo = ID_CONTEUDO;

  protected pular(evento: Event): void {
    evento.preventDefault();
    focarTituloDoConteudo(this.documento);
  }
}
