import { Component, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NOME_PRODUTO } from '../core/marca';
import { dadosDaTelaAtual } from '../core/navegacao/rota-atual';
import { BarraSuperior } from '../shared/ui/barra-superior/barra-superior';
import { Botao } from '../shared/ui/botao/botao';
import { Drawer } from '../shared/ui/drawer/drawer';
import { Icone } from '../shared/ui/icone/icone';
import { PularConteudo } from '../shared/ui/pular-conteudo/pular-conteudo';
import { ItemNavegacao, Sidebar } from '../shared/ui/sidebar/sidebar';

const ITENS: readonly ItemNavegacao[] = [
  { rotulo: 'Painel', rota: '/admin/painel', icone: 'painel' },
  { rotulo: 'Ocorrências', rota: '/admin/ocorrencias', icone: 'lista' },
  { rotulo: 'Moradores', rota: '/admin/moradores', icone: 'usuarios' },
  { rotulo: 'Equipe', rota: '/admin/equipe', icone: 'escudo' },
  { rotulo: 'Condomínio', rota: '/admin/condominio', icone: 'predio' },
];

@Component({
  selector: 'app-shell-admin',
  imports: [RouterOutlet, BarraSuperior, Botao, Drawer, Icone, PularConteudo, Sidebar],
  template: `
    <ui-pular-conteudo />
    <aside
      aria-label="Menu da administração"
      class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-borda bg-superficie lg:flex"
    >
      <div class="flex h-16 shrink-0 items-center gap-3 border-b border-borda px-4">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-controle bg-primaria-suave text-primaria">
          <ui-icone nome="predio" />
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{{ nomeProduto }}</p>
          <p class="text-sm text-texto-secundario">Administração</p>
        </div>
      </div>
      <ui-sidebar class="min-h-0 flex-1 overflow-y-auto" [itens]="itens" rotulo="Navegação da administração" />
    </aside>

    <div class="lg:pl-64">
      @if (tela().pilha; as pilha) {
        <ui-barra-superior
          visibilidade="abaixo-lg"
          largura="total"
          modo="empilhada"
          [titulo]="tela().titulo"
          [voltarPara]="pilha.voltarPara"
          [rotuloVoltar]="pilha.rotuloVoltar"
          [iconeVoltar]="pilha.icone"
        />
      } @else {
        <ui-barra-superior visibilidade="abaixo-lg" largura="total" [titulo]="nomeProduto">
          <button
            inicio
            type="button"
            ui-botao
            variante="texto"
            icone
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            [attr.aria-expanded]="menu.aberto()"
            (click)="menu.abrir()"
          >
            <ui-icone nome="menu" [tamanho]="24" />
          </button>
        </ui-barra-superior>
      }
      <main id="conteudo" class="mx-auto max-w-admin px-4 pt-5 pb-10 md:px-6 md:pt-8 lg:px-8">
        <router-outlet />
      </main>
    </div>

    <ui-drawer #menu titulo="Menu da administração" rotuloFechar="Fechar menu">
      <ui-sidebar [itens]="itens" rotulo="Navegação da administração" />
    </ui-drawer>
  `,
})
export class ShellAdmin {
  protected readonly nomeProduto = NOME_PRODUTO;
  protected readonly itens = ITENS;
  protected readonly tela = dadosDaTelaAtual();
  private readonly gaveta = viewChild.required<Drawer>('menu');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.gaveta().fechar());
  }
}
