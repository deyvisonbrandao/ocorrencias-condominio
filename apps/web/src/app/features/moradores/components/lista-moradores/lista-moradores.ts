import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { AcaoMorador, acoesDisponiveisMorador, MoradorAdmin } from '@ocorrencias/contratos';
import { BadgeStatusUsuario } from '../../../../shared/components/badge/badge-status-usuario';
import { Botao } from '../../../../shared/components/botao/botao';
import { ItemMenu, MenuAcoes } from '../../../../shared/components/menu-acoes/menu-acoes';
import { formatarDataEHora, tempoRelativo } from '../../../../shared/utils/datas';
import { formatarTelefoneParaExibir } from '../../../../shared/utils/telefone';

export interface PedidoAcao {
  readonly acao: AcaoMorador;
  readonly morador: MoradorAdmin;
}

interface LinhaMorador {
  readonly morador: MoradorAdmin;
  readonly unidade: string | null;
  readonly telefone: string;
  readonly cadastroRelativo: string;
  readonly cadastroCompleto: string;
  readonly aprovar: boolean;
  readonly recusar: boolean;
  readonly reativar: boolean;
  readonly inativar: boolean;
  readonly temBotoes: boolean;
}

function unidadeDe(morador: MoradorAdmin): string | null {
  const partes = [
    morador.bloco ? `Bloco ${morador.bloco}` : null,
    morador.apto ? `apto ${morador.apto}` : null,
  ].filter((parte): parte is string => parte !== null);
  return partes.length > 0 ? partes.join(', ') : null;
}

function linhaDe(morador: MoradorAdmin, agora: Date): LinhaMorador {
  const acoes = acoesDisponiveisMorador(morador.status);
  const aprovar = acoes.includes('aprovar');
  const recusar = acoes.includes('recusar');
  const reativar = acoes.includes('reativar');
  return {
    morador,
    unidade: unidadeDe(morador),
    telefone: formatarTelefoneParaExibir(morador.telefone),
    cadastroRelativo: tempoRelativo(morador.criadoEm, agora),
    cadastroCompleto: formatarDataEHora(morador.criadoEm),
    aprovar,
    recusar,
    reativar,
    inativar: acoes.includes('inativar'),
    temBotoes: aprovar || recusar || reativar,
  };
}

@Component({
  selector: 'app-lista-moradores',
  imports: [NgTemplateOutlet, BadgeStatusUsuario, Botao, ItemMenu, MenuAcoes],
  host: { class: 'block' },
  template: `
    <ul class="space-y-3 md:hidden" [attr.aria-label]="legenda()">
      @for (linha of linhas(); track linha.morador.id) {
        <li [attr.data-morador]="linha.morador.id" class="rounded-cartao border border-borda bg-superficie p-4">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <h2 tabindex="-1" data-foco-item class="text-base leading-6 font-semibold break-words">
                {{ linha.morador.nome }}
              </h2>
              @if (linha.unidade) {
                <p class="text-sm text-texto-secundario">{{ linha.unidade }}</p>
              }
            </div>
            @if (mostraStatus()) {
              <ui-badge-status-usuario class="shrink-0" [status]="linha.morador.status" />
            }
            @if (linha.inativar) {
              <ui-menu-acoes class="-mt-2 -mr-2" [rotulo]="'Mais ações para ' + linha.morador.nome">
                <button ui-item-menu perigo (click)="pedir('inativar', linha.morador)">Inativar</button>
              </ui-menu-acoes>
            }
          </div>
          <p>
            <a
              [href]="'tel:' + linha.morador.telefone"
              class="inline-flex min-h-toque items-center text-sm font-medium text-primaria hover:underline"
            >
              {{ linha.telefone }}
            </a>
          </p>
          <p class="text-sm text-texto-secundario">
            Cadastro:
            <time [attr.datetime]="linha.morador.criadoEm" [title]="linha.cadastroCompleto">
              {{ linha.cadastroRelativo }}
            </time>
          </p>
          @if (linha.morador.motivoRecusa) {
            <p class="mt-2 text-sm break-words text-texto">
              <span class="font-semibold">Motivo da recusa:</span> {{ linha.morador.motivoRecusa }}
            </p>
          }
          @if (linha.temBotoes) {
            <div class="mt-4 flex gap-2">
              <ng-container [ngTemplateOutlet]="botoes" [ngTemplateOutletContext]="{ $implicit: linha, cheio: true }" />
            </div>
          }
        </li>
      }
    </ul>

    <div class="hidden rounded-cartao border border-borda bg-superficie md:block">
      <table class="w-full text-left text-sm">
        <caption class="sr-only">{{ legenda() }}</caption>
        <thead class="border-b border-borda text-xs font-semibold tracking-wide text-texto-secundario uppercase">
          <tr>
            <th scope="col" class="px-4 py-3">Morador</th>
            <th scope="col" class="px-4 py-3">Unidade</th>
            <th scope="col" class="px-4 py-3">Telefone</th>
            <th scope="col" class="px-4 py-3">Cadastro</th>
            @if (mostraStatus()) {
              <th scope="col" class="px-4 py-3">Situação</th>
            }
            <th scope="col" class="px-4 py-3"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-borda">
          @for (linha of linhas(); track linha.morador.id) {
            <tr [attr.data-morador]="linha.morador.id" class="align-top">
              <th scope="row" class="px-4 py-3 font-normal">
                <span tabindex="-1" data-foco-item class="font-semibold break-words text-texto">
                  {{ linha.morador.nome }}
                </span>
                @if (linha.morador.motivoRecusa) {
                  <p class="mt-1 break-words text-texto-secundario">
                    <span class="font-semibold">Motivo da recusa:</span> {{ linha.morador.motivoRecusa }}
                  </p>
                }
              </th>
              <td class="px-4 py-3 text-texto-secundario">{{ linha.unidade ?? '—' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <a [href]="'tel:' + linha.morador.telefone" class="font-medium text-primaria hover:underline">
                  {{ linha.telefone }}
                </a>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-texto-secundario">
                <time [attr.datetime]="linha.morador.criadoEm" [title]="linha.cadastroCompleto">
                  {{ linha.cadastroRelativo }}
                </time>
              </td>
              @if (mostraStatus()) {
                <td class="px-4 py-3"><ui-badge-status-usuario [status]="linha.morador.status" /></td>
              }
              <td class="px-4 py-2">
                <div class="flex justify-end gap-2">
                  @if (linha.temBotoes) {
                    <ng-container [ngTemplateOutlet]="botoes" [ngTemplateOutletContext]="{ $implicit: linha, cheio: false }" />
                  }
                  @if (linha.inativar) {
                    <ui-menu-acoes [rotulo]="'Mais ações para ' + linha.morador.nome">
                      <button ui-item-menu perigo (click)="pedir('inativar', linha.morador)">Inativar</button>
                    </ui-menu-acoes>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ng-template #botoes let-linha let-cheio="cheio">
      @if (linha.aprovar) {
        <button type="button" ui-botao [class.flex-1]="cheio" (click)="pedir('aprovar', linha.morador)">
          Aprovar<span class="sr-only"> {{ linha.morador.nome }}</span>
        </button>
      }
      @if (linha.recusar) {
        <button type="button" ui-botao variante="secundario" [class.flex-1]="cheio" (click)="pedir('recusar', linha.morador)">
          Recusar<span class="sr-only"> {{ linha.morador.nome }}</span>
        </button>
      }
      @if (linha.reativar) {
        <button type="button" ui-botao variante="secundario" [class.flex-1]="cheio" (click)="pedir('reativar', linha.morador)">
          Reativar<span class="sr-only"> {{ linha.morador.nome }}</span>
        </button>
      }
    </ng-template>
  `,
})
export class ListaMoradores {
  readonly itens = input.required<readonly MoradorAdmin[]>();
  readonly legenda = input.required<string>();
  readonly mostraStatus = input(false, { transform: booleanAttribute });

  readonly acao = output<PedidoAcao>();

  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly linhas = computed(() => {
    const agora = new Date();
    return this.itens().map((morador) => linhaDe(morador, agora));
  });

  focarItem(id: string): boolean {
    const candidatos = [
      ...this.elemento.querySelectorAll<HTMLElement>(`[data-morador="${CSS.escape(id)}"] [data-foco-item]`),
    ];
    const visivel = candidatos.find((candidato) => candidato.getClientRects().length > 0) ?? candidatos[0];
    visivel?.focus();
    return visivel !== undefined;
  }

  protected pedir(acao: AcaoMorador, morador: MoradorAdmin): void {
    this.acao.emit({ acao, morador });
  }
}
