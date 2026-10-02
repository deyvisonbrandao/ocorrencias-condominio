import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { NOME_PRODUTO } from '../marca';

@Injectable()
export class TituloDaPagina extends TitleStrategy {
  private readonly titulo = inject(Title);

  override updateTitle(estado: RouterStateSnapshot): void {
    const tituloDaTela = this.buildTitle(estado);
    this.titulo.setTitle(tituloDaTela ? `${tituloDaTela} · ${NOME_PRODUTO}` : NOME_PRODUTO);
  }
}
