import { Component, input } from '@angular/core';
import { IsActiveMatchOptions, Params, RouterLink, RouterLinkActive } from '@angular/router';

export interface Aba {
  readonly rotulo: string;
  readonly rota: string;
  readonly queryParams?: Params;
  readonly contador?: number;
}

const CORRESPONDENCIA: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'exact',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

@Component({
  selector: 'ui-abas',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav [attr.aria-label]="rotulo()" class="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul class="flex min-w-max gap-1 border-b border-borda">
        @for (aba of abas(); track aba.rotulo) {
          <li>
            <a
              [routerLink]="aba.rota"
              [queryParams]="aba.queryParams"
              routerLinkActive
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="correspondencia"
              class="-mb-px inline-flex min-h-toque items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-texto-secundario transition-colors duration-rapido hover:border-borda-controle hover:text-texto aria-[current=page]:border-primaria aria-[current=page]:font-semibold aria-[current=page]:text-primaria"
            >
              {{ aba.rotulo }}
              @if (aba.contador !== undefined) {
                <span class="rounded-full bg-superficie-sutil px-2 text-xs leading-5 font-semibold text-texto tabular-nums">
                  {{ aba.contador }}
                </span>
              }
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class Abas {
  readonly abas = input.required<readonly Aba[]>();
  readonly rotulo = input.required<string>();

  protected readonly correspondencia = CORRESPONDENCIA;
}
