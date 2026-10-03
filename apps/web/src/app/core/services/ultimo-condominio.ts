import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { slugValido } from '@ocorrencias/contratos';

export const CHAVE_ULTIMO_CONDOMINIO = 'ocorrencias.ultimo-condominio';

@Injectable({ providedIn: 'root' })
export class UltimoCondominio {
  private readonly janela = inject(DOCUMENT).defaultView;

  ler(): string | null {
    try {
      const slug = this.janela?.localStorage.getItem(CHAVE_ULTIMO_CONDOMINIO) ?? null;
      return slug !== null && slugValido(slug) ? slug : null;
    } catch {
      return null;
    }
  }

  gravar(slug: string): void {
    try {
      this.janela?.localStorage.setItem(CHAVE_ULTIMO_CONDOMINIO, slug);
    } catch {
      // Navegação privada ou dados do site bloqueados: segue sem lembrar o condomínio.
    }
  }
}
