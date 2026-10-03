import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CondominioCriado } from '@ocorrencias/contratos';
import { Botao } from '../../../../shared/components/botao/botao';
import { Copiar } from '../../../../shared/components/copiar/copiar';

@Component({
  selector: 'app-confirmacao-cadastro',
  imports: [RouterLink, Botao, Copiar],
  host: { class: 'block' },
  template: `
    <h1 #titulo tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">
      Condomínio criado
    </h1>

    <section
      class="mt-6 rounded-cartao border border-borda bg-superficie p-4 md:p-6"
      aria-labelledby="link-do-condominio"
    >
      <h2 id="link-do-condominio" class="text-base font-semibold">{{ condominio().nome }}</h2>
      <p class="mt-1 text-sm text-texto-secundario">Link do condomínio</p>
      <p class="mt-1 text-base font-medium break-all">
        <a class="text-primaria underline" [href]="link()">{{ link() }}</a>
      </p>
      <ui-copiar class="mt-4" bloco [valor]="link()" />
      <p class="mt-4 text-sm text-texto-secundario">
        Envie este link aos moradores ou imprima o QR code na tela Condomínio.
      </p>
    </section>

    <a ui-botao bloco routerLink="/admin/painel" class="mt-6">Ir para o painel</a>
  `,
})
export class ConfirmacaoCadastro {
  readonly condominio = input.required<CondominioCriado>();

  private readonly origem = inject(DOCUMENT).location.origin;
  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('titulo');

  protected readonly link = computed(() => `${this.origem}/c/${this.condominio().slug}`);

  constructor() {
    afterNextRender(() => this.titulo().nativeElement.focus());
  }
}
