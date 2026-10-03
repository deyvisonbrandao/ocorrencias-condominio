import { Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { Botao } from '../botao/botao';
import { ControleDialogo } from '../dialogo/controle-dialogo';
import { idUnico } from '../id-unico';
import { Icone } from '../icone/icone';

export type LadoDrawer = 'esquerda' | 'base';

const CLASSES_LADO: Readonly<Record<LadoDrawer, string>> = {
  esquerda: 'ui-dialogo ui-dialogo-esquerda m-0 h-dvh max-h-none w-72 max-w-[85vw]',
  base: 'ui-dialogo ui-dialogo-folha m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl',
};

@Component({
  selector: 'ui-drawer',
  imports: [Botao, Icone],
  template: `
    <dialog
      #dialogo
      class="flex-col bg-superficie p-0 text-texto shadow-xl open:flex"
      [class]="classesLado()"
      [attr.aria-labelledby]="idTitulo"
      (close)="aoFechar()"
    >
      <div class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-borda pr-2 pl-4">
        <h2 [id]="idTitulo" class="truncate text-base font-semibold">{{ titulo() }}</h2>
        <button type="button" ui-botao variante="texto" icone [attr.aria-label]="rotuloFechar()" (click)="fechar()">
          <ui-icone nome="fechar" [tamanho]="24" />
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <ng-content />
      </div>
    </dialog>
  `,
})
export class Drawer {
  readonly titulo = input.required<string>();
  readonly lado = input<LadoDrawer>('esquerda');
  readonly rotuloFechar = input('Fechar');

  readonly fechado = output<void>();

  protected readonly idTitulo = idUnico('drawer-titulo');
  protected readonly classesLado = computed(() => CLASSES_LADO[this.lado()]);

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly controle = new ControleDialogo(() => this.dialogo().nativeElement);

  readonly aberto = this.controle.aberto;

  abrir(): void {
    this.controle.abrir();
  }

  fechar(): void {
    this.controle.fechar();
  }

  protected aoFechar(): void {
    this.controle.aoFechar();
    this.fechado.emit();
  }
}
