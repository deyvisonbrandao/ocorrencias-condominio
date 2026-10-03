import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NOME_PRODUTO } from '../../config/marca';
import { dadosDaTelaAtual } from '../../services/rota-atual';
import { SessaoService } from '../../services/sessao.service';
import { Alerta } from '../../../shared/components/alerta/alerta';
import { BarraSuperior } from '../../../shared/components/barra-superior/barra-superior';
import { Botao } from '../../../shared/components/botao/botao';
import { Drawer } from '../../../shared/components/drawer/drawer';
import { Icone } from '../../../shared/components/icone/icone';
import { PularConteudo } from '../../../shared/components/pular-conteudo/pular-conteudo';
import { ItemNavegacao, Sidebar } from '../../../shared/components/sidebar/sidebar';
import { ROTULO_PAPEL } from '../../../shared/utils/dominio';

const ROTA_EQUIPE = '/admin/equipe';

const ITENS: readonly ItemNavegacao[] = [
  { rotulo: 'Painel', rota: '/admin/painel', icone: 'painel' },
  { rotulo: 'Ocorrências', rota: '/admin/ocorrencias', icone: 'lista' },
  { rotulo: 'Moradores', rota: '/admin/moradores', icone: 'usuarios' },
  { rotulo: 'Equipe', rota: ROTA_EQUIPE, icone: 'escudo' },
  { rotulo: 'Condomínio', rota: '/admin/condominio', icone: 'predio' },
];

@Component({
  selector: 'app-shell-admin',
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    Alerta,
    BarraSuperior,
    Botao,
    Drawer,
    Icone,
    PularConteudo,
    Sidebar,
  ],
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
          <p class="truncate text-sm font-semibold">{{ nomeDoCondominio() }}</p>
          <p class="text-sm text-texto-secundario">Administração</p>
        </div>
      </div>
      <ui-sidebar class="min-h-0 flex-1 overflow-y-auto" [itens]="itens()" rotulo="Navegação da administração" />
      <ng-container [ngTemplateOutlet]="rodape" />
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
        <ui-barra-superior visibilidade="abaixo-lg" largura="total" [titulo]="nomeDoCondominio()">
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

    <ui-drawer #menu titulo="Menu da administração" rotuloFechar="Fechar menu" (fechado)="sessao.descartarErroAoSair()">
      <div class="flex min-h-full flex-col">
        <ui-sidebar class="flex-1" [itens]="itens()" rotulo="Navegação da administração" (escolheu)="menu.fechar()" />
        <ng-container [ngTemplateOutlet]="rodape" />
      </div>
    </ui-drawer>

    <ng-template #rodape>
      <div class="shrink-0 border-t border-borda p-3">
        @if (pessoa(); as rotulo) {
          <p class="truncate px-3 py-2 text-sm text-texto-secundario">{{ rotulo }}</p>
        }
        @if (sessao.erroAoSair(); as erro) {
          <ui-alerta class="mb-2" tom="perigo" anunciar>{{ erro }}</ui-alerta>
        }
        <button
          type="button"
          ui-botao
          variante="texto"
          rotuloCarregando="Saindo…"
          [carregando]="sessao.saindo()"
          (click)="sessao.sair()"
        >
          <ui-icone nome="sair" />
          Sair
        </button>
      </div>
    </ng-template>
  `,
})
export class ShellAdmin {
  protected readonly sessao = inject(SessaoService);
  protected readonly tela = dadosDaTelaAtual();
  protected readonly nomeDoCondominio = computed(
    () => this.sessao.usuario()?.condominio.nome ?? NOME_PRODUTO,
  );
  protected readonly pessoa = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? `${usuario.nome} · ${ROTULO_PAPEL[usuario.papel]}` : null;
  });
  protected readonly itens = computed(() =>
    this.sessao.usuario()?.papel === 'SINDICO' ? ITENS : ITENS.filter((item) => item.rota !== ROTA_EQUIPE),
  );
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
