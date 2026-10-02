import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NOME_PRODUTO } from '../core/marca';
import { BarraSuperior } from '../shared/ui/barra-superior/barra-superior';
import { PularConteudo } from '../shared/ui/pular-conteudo/pular-conteudo';

@Component({
  selector: 'app-shell-publico',
  imports: [RouterOutlet, BarraSuperior, PularConteudo],
  template: `
    <ui-pular-conteudo />
    <ui-barra-superior marca [titulo]="nomeProduto" />
    <main id="conteudo" class="mx-auto max-w-conteudo px-4 pt-5 pb-12 md:px-6 md:pt-8">
      <router-outlet />
    </main>
  `,
})
export class ShellPublico {
  protected readonly nomeProduto = NOME_PRODUTO;
}
