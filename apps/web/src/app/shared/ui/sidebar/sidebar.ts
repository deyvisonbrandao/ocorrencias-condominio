import { Component, input } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { Icone } from '../icone/icone';
import { NomeIcone } from '../icone/icones';

export interface ItemNavegacao {
  readonly rotulo: string;
  readonly rota: string;
  readonly icone: NomeIcone;
  readonly contador?: number;
  readonly rotuloContador?: string;
}

const CORRESPONDENCIA: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

@Component({
  selector: 'ui-sidebar',
  imports: [RouterLink, RouterLinkActive, Icone],
  host: { class: 'block' },
  template: `
    <nav [attr.aria-label]="rotulo()" class="p-3">
      <ul class="space-y-1">
        @for (item of itens(); track item.rota) {
          <li>
            <a
              [routerLink]="item.rota"
              routerLinkActive
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="correspondencia"
              class="flex min-h-toque items-center gap-3 rounded-controle px-3 text-sm font-medium text-texto-secundario transition-colors duration-rapido hover:bg-superficie-sutil hover:text-texto aria-[current=page]:bg-primaria-suave aria-[current=page]:font-semibold aria-[current=page]:text-primaria"
            >
              <ui-icone [nome]="item.icone" />
              {{ item.rotulo }}
              @if (item.contador) {
                <span class="ml-auto rounded-full bg-perigo px-2 py-0.5 text-xs font-semibold text-texto-inverso tabular-nums">
                  {{ item.contador }}
                  @if (item.rotuloContador) {
                    <span class="sr-only">{{ item.rotuloContador }}</span>
                  }
                </span>
              }
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class Sidebar {
  readonly itens = input.required<readonly ItemNavegacao[]>();
  readonly rotulo = input.required<string>();

  protected readonly correspondencia = CORRESPONDENCIA;
}
