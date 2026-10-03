import { booleanAttribute, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Botao } from '../botao/botao';
import { Icone } from '../icone/icone';

export type ModoBarraSuperior = 'raiz' | 'empilhada';
export type LarguraBarraSuperior = 'conteudo' | 'responsiva' | 'total';
export type VisibilidadeBarraSuperior = 'sempre' | 'abaixo-md' | 'a-partir-md' | 'abaixo-lg';

const LARGURAS: Readonly<Record<LarguraBarraSuperior, string>> = {
  conteudo: 'max-w-conteudo',
  responsiva: 'max-w-conteudo md:max-w-admin',
  total: '',
};

const VISIBILIDADES: Readonly<Record<VisibilidadeBarraSuperior, string>> = {
  sempre: 'block',
  'abaixo-md': 'block md:hidden',
  'a-partir-md': 'hidden md:block',
  'abaixo-lg': 'block lg:hidden',
};

@Component({
  selector: 'ui-barra-superior',
  imports: [RouterLink, Botao, Icone],
  host: {
    class: 'sticky top-0 z-30 border-b border-borda bg-superficie',
    '[class]': 'classeVisibilidade()',
  },
  template: `
    <header class="mx-auto flex h-14 items-center gap-2 px-2 md:px-4" [class]="classeLargura()">
      @if (modo() === 'empilhada') {
        <a ui-botao variante="texto" icone [routerLink]="voltarPara()" [attr.aria-label]="rotuloVoltar()">
          <ui-icone [nome]="iconeVoltar()" [tamanho]="24" />
        </a>
      } @else {
        <ng-content select="[inicio]" />
        @if (marca()) {
          <span
            class="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-controle bg-primaria-suave text-primaria"
          >
            <ui-icone nome="predio" />
          </span>
        }
      }
      <p class="min-w-0 flex-1 truncate px-1 text-base font-semibold text-texto">{{ titulo() }}</p>
      <ng-content />
    </header>
  `,
})
export class BarraSuperior {
  readonly titulo = input.required<string>();
  readonly modo = input<ModoBarraSuperior>('raiz');
  readonly voltarPara = input<string>('/');
  readonly rotuloVoltar = input('Voltar');
  readonly iconeVoltar = input<'voltar' | 'fechar'>('voltar');
  readonly marca = input(false, { transform: booleanAttribute });
  readonly largura = input<LarguraBarraSuperior>('conteudo');
  readonly visibilidade = input<VisibilidadeBarraSuperior>('sempre');

  protected readonly classeLargura = computed(() => LARGURAS[this.largura()]);
  protected readonly classeVisibilidade = computed(() => VISIBILIDADES[this.visibilidade()]);
}
