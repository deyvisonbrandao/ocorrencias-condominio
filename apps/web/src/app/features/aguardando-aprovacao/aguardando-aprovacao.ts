import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  condominioDaRota,
  TITULO_CONDOMINIO_NAO_ENCONTRADO,
} from '../../core/services/condominio-da-rota';
import { Botao } from '../../shared/components/botao/botao';
import { CondominioNaoEncontrado } from '../../shared/components/estados/condominio-nao-encontrado';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { Skeleton } from '../../shared/components/estados/skeleton';
import { Icone } from '../../shared/components/icone/icone';

@Component({
  selector: 'app-aguardando-aprovacao',
  imports: [RouterLink, Botao, CondominioNaoEncontrado, EstadoErro, Icone, Skeleton],
  template: `
    <div class="md:mx-auto md:max-w-md">
      @if (!naoEncontrado()) {
        <span
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-info-suave text-info-texto"
        >
          <ui-icone nome="relogio" [tamanho]="24" />
        </span>
      }
      <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">
        {{ naoEncontrado() ? tituloNaoEncontrado : 'Cadastro enviado' }}
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
            A administração do {{ condominio()?.nome }} precisa aprovar seu acesso. Depois disso,
            entre com seu telefone e senha.
          </p>
          <a ui-botao bloco class="mt-8" [routerLink]="['/c', slug(), 'entrar']">Ir para o login</a>
        }
      }
    </div>
  `,
})
export class AguardandoAprovacao {
  private readonly pagina = condominioDaRota({ aceitarDoEstadoDaNavegacao: true });

  protected readonly tituloNaoEncontrado = TITULO_CONDOMINIO_NAO_ENCONTRADO;
  protected readonly slug = this.pagina.slug;
  protected readonly estado = this.pagina.estado;
  protected readonly condominio = this.pagina.condominio;
  protected readonly esperaLonga = this.pagina.esperaLonga;
  protected readonly naoEncontrado = computed(() => this.estado().tipo === 'nao-encontrado');

  protected tentarDeNovo(): void {
    this.pagina.recarregar();
  }
}
