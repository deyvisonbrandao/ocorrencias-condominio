import { Component, computed, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NOME_PRODUTO } from '../../core/config/marca';
import {
  condominioDaRota,
  TITULO_CONDOMINIO_NAO_ENCONTRADO,
} from '../../core/services/condominio-da-rota';
import { Botao } from '../../shared/components/botao/botao';
import { CondominioNaoEncontrado } from '../../shared/components/estados/condominio-nao-encontrado';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { Skeleton } from '../../shared/components/estados/skeleton';

@Component({
  selector: 'app-pagina-do-condominio',
  imports: [RouterLink, Botao, CondominioNaoEncontrado, EstadoErro, Skeleton],
  template: `
    <div class="md:mx-auto md:max-w-md">
      <h1
        tabindex="-1"
        class="text-xl leading-7 font-bold md:text-2xl md:leading-8"
        [class.sr-only]="estado().tipo === 'carregando'"
      >
        {{ titulo() }}
      </h1>

      @switch (estado().tipo) {
        @case ('carregando') {
          @if (esperaLonga()) {
            <ui-skeleton class="mt-6" forma="detalhe" [quantidade]="1" />
          }
        }
        @case ('nao-encontrado') {
          <ui-condominio-nao-encontrado />
        }
        @case ('erro') {
          <ui-estado-erro
            class="mt-6"
            titulo="Não foi possível carregar o condomínio."
            (tentarDeNovo)="tentarDeNovo()"
          />
        }
        @case ('pronto') {
          <p class="mt-2 text-base text-texto-secundario">
            Registre e acompanhe as ocorrências do condomínio pelo celular.
          </p>
          <div class="mt-8 flex flex-col gap-3 md:flex-row">
            <a ui-botao bloco [routerLink]="['/c', slug(), 'cadastro']">Criar conta</a>
            <a ui-botao bloco variante="secundario" [routerLink]="['/c', slug(), 'entrar']">Entrar</a>
          </div>
          <p class="mt-4 text-sm text-texto-secundario">
            Seu cadastro precisa ser aprovado pela administração.
          </p>
        }
      }
    </div>
  `,
})
export class PaginaDoCondominio {
  private readonly pagina = condominioDaRota({ tituloComCondominio: false });

  protected readonly slug = this.pagina.slug;
  protected readonly estado = this.pagina.estado;
  protected readonly esperaLonga = this.pagina.esperaLonga;

  protected readonly titulo = computed(() => {
    const estado = this.estado();
    if (estado.tipo === 'pronto') {
      return estado.condominio.nome;
    }
    return estado.tipo === 'nao-encontrado' ? TITULO_CONDOMINIO_NAO_ENCONTRADO : 'Condomínio';
  });

  constructor() {
    const titulo = inject(Title);
    effect(() => {
      const condominio = this.pagina.condominio();
      if (condominio) {
        titulo.setTitle(`${condominio.nome} · ${NOME_PRODUTO}`);
      }
    });
  }

  protected tentarDeNovo(): void {
    this.pagina.recarregar();
  }
}
