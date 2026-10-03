import { Component, computed } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NOME_PRODUTO } from '../core/marca';
import { dadosDaTelaAtual } from '../core/navegacao/rota-atual';
import { BarraSuperior } from '../shared/ui/barra-superior/barra-superior';
import { Botao } from '../shared/ui/botao/botao';
import { BottomNav } from '../shared/ui/bottom-nav/bottom-nav';
import { Icone } from '../shared/ui/icone/icone';
import { PularConteudo } from '../shared/ui/pular-conteudo/pular-conteudo';

interface LinkMorador {
  readonly rotulo: string;
  readonly rota: string;
}

@Component({
  selector: 'app-shell-morador',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BarraSuperior,
    Botao,
    BottomNav,
    Icone,
    PularConteudo,
  ],
  template: `
    <ui-pular-conteudo />
    @if (tela().pilha; as pilha) {
      <ui-barra-superior
        visibilidade="abaixo-md"
        modo="empilhada"
        [titulo]="tela().titulo"
        [voltarPara]="pilha.voltarPara"
        [rotuloVoltar]="pilha.rotuloVoltar"
        [iconeVoltar]="pilha.icone"
      />
    }
    <ui-barra-superior marca largura="responsiva" [visibilidade]="empilhada() ? 'a-partir-md' : 'sempre'" [titulo]="nomeProduto">
      <nav aria-label="Navegação principal" class="hidden items-center gap-1 md:flex">
        @for (link of links; track link.rota) {
          <a
            [routerLink]="link.rota"
            routerLinkActive
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="correspondencia"
            class="inline-flex min-h-toque items-center rounded-controle px-3 text-sm font-medium text-texto-secundario transition-colors duration-rapido hover:bg-superficie-sutil hover:text-texto aria-[current=page]:font-semibold aria-[current=page]:text-primaria"
          >
            {{ link.rotulo }}
          </a>
        }
        <a ui-botao routerLink="/app/nova" class="ml-2">
          <ui-icone nome="mais" />
          Nova ocorrência
        </a>
      </nav>
    </ui-barra-superior>
    <main
      id="conteudo"
      class="mx-auto max-w-conteudo px-4 pt-5 md:px-6 md:pt-8 md:pb-12"
      [class]="empilhada() ? 'pb-10' : 'pb-28'"
    >
      @if (tela().pilha?.destino; as destino) {
        <a
          [routerLink]="tela().pilha?.voltarPara"
          class="mb-2 hidden min-h-toque items-center gap-1.5 text-sm font-semibold text-primaria hover:underline md:inline-flex"
        >
          <ui-icone nome="voltar" [tamanho]="16" />
          <span class="sr-only">Voltar para</span>
          {{ destino }}
        </a>
      }
      <router-outlet />
    </main>
    @if (!empilhada()) {
      <ui-bottom-nav />
    }
  `,
})
export class ShellMorador {
  protected readonly nomeProduto = NOME_PRODUTO;
  protected readonly tela = dadosDaTelaAtual();
  protected readonly empilhada = computed(() => this.tela().pilha !== null);
  protected readonly correspondencia: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  protected readonly links: readonly LinkMorador[] = [
    { rotulo: 'Condomínio', rota: '/app/ocorrencias' },
    { rotulo: 'Minhas', rota: '/app/minhas' },
    { rotulo: 'Perfil', rota: '/app/perfil' },
  ];
}
