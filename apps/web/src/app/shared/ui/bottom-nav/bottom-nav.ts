import { Component, DestroyRef, inject } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';
import { NomeIcone } from '../icone/icones';
import { PresencaBottomNav } from './presenca-bottom-nav';

interface ItemBottomNav {
  readonly rotulo: string;
  readonly rota: string;
  readonly icone: NomeIcone;
  readonly destaque?: boolean;
}

const ITENS: readonly ItemBottomNav[] = [
  { rotulo: 'Condomínio', rota: '/app/ocorrencias', icone: 'casa' },
  { rotulo: 'Minhas', rota: '/app/minhas', icone: 'lista' },
  { rotulo: 'Nova', rota: '/app/nova', icone: 'mais', destaque: true },
  { rotulo: 'Perfil', rota: '/app/perfil', icone: 'usuario' },
];

const CORRESPONDENCIA: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

@Component({
  selector: 'ui-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icone],
  template: `
    <nav
      aria-label="Navegação principal"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul class="mx-auto grid h-barra-inferior max-w-md grid-cols-4">
        @for (item of itens; track item.rota) {
          <li>
            <a
              [routerLink]="item.rota"
              routerLinkActive
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="correspondencia"
              class="group flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium text-texto-secundario transition-colors duration-rapido hover:text-texto aria-[current=page]:font-semibold aria-[current=page]:text-primaria"
            >
              @if (item.destaque) {
                <span
                  class="flex h-8 w-12 items-center justify-center rounded-full bg-primaria text-texto-inverso group-hover:bg-primaria-hover"
                >
                  <ui-icone [nome]="item.icone" />
                </span>
              } @else {
                <ui-icone [nome]="item.icone" [tamanho]="24" class="my-1" />
              }
              {{ item.rotulo }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class BottomNav {
  protected readonly itens = ITENS;
  protected readonly correspondencia = CORRESPONDENCIA;

  constructor() {
    const remover = inject(PresencaBottomNav).registrar();
    inject(DestroyRef).onDestroy(remover);
  }
}
