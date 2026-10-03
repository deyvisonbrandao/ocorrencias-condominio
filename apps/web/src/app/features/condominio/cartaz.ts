import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, startWith } from 'rxjs';
import { ORIGEM_DO_APP } from '../../core/config/origem-do-app';
import { Botao } from '../../shared/components/botao/botao';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { Skeleton } from '../../shared/components/estados/skeleton';
import { Icone } from '../../shared/components/icone/icone';
import { PularConteudo } from '../../shared/components/pular-conteudo/pular-conteudo';
import { QrCode } from '../../shared/components/qrcode/qrcode';
import { linkPublico } from '../../shared/utils/link-publico';
import { carregarCondominio } from './services/carregamento';
import { CondominioAdminService } from './services/condominio-admin.service';

export const INSTRUCAO_CARTAZ = 'Aponte a câmera do celular para se cadastrar e registrar ocorrências';

// 8cm em px CSS (1in = 96px = 2,54cm): é a medida que o navegador usa na impressão.
export const TAMANHO_QR_CARTAZ_PX = 302;

@Component({
  selector: 'app-cartaz',
  imports: [RouterLink, Botao, EstadoErro, Icone, PularConteudo, QrCode, Skeleton],
  host: { class: 'block min-h-dvh print:min-h-0' },
  styles: `
    @page {
      size: A4 portrait;
      margin: 2cm;
    }

    @media print {
      :host {
        color: #000;
        background: #fff;
      }

      .folha {
        min-height: 25cm;
        justify-content: center;
      }
    }
  `,
  template: `
    <ui-pular-conteudo />
    <div class="border-b border-borda bg-superficie print:hidden">
      <div class="mx-auto flex max-w-conteudo items-center justify-between gap-3 px-4 py-2 md:px-6">
        <a ui-botao variante="texto" routerLink="/admin/condominio">
          <ui-icone nome="voltar" />
          Voltar para Condomínio
        </a>
        @if (link() && estadoQr() !== 'erro') {
          <button
            type="button"
            ui-botao
            rotuloCarregando="Gerando QR code…"
            [carregando]="estadoQr() !== 'pronto'"
            (click)="imprimir()"
          >
            <ui-icone nome="imprimir" />
            Imprimir
          </button>
        }
      </div>
    </div>

    <main id="conteudo" class="mx-auto max-w-conteudo px-4 py-6 md:px-6 md:py-10 print:max-w-none print:p-0">
      <h1 tabindex="-1" class="sr-only">Cartaz para imprimir</h1>
      @let atual = estado();
      @switch (atual.tipo) {
        @case ('carregando') {
          @if (atual.fase !== 'curta') {
            <ui-skeleton forma="detalhe" [quantidade]="1" />
          }
          @if (atual.fase === 'longa') {
            <p class="mt-3 text-sm text-texto-secundario" role="status">Está demorando mais que o normal…</p>
          }
        }
        @case ('erro') {
          <ui-estado-erro
            titulo="Não foi possível carregar o cartaz."
            [focar]="tentouDeNovo()"
            (tentarDeNovo)="tentarDeNovo()"
          />
        }
        @case ('pronto') {
          <article
            class="folha flex flex-col items-center gap-8 rounded-cartao border border-borda bg-superficie px-4 py-10 text-center md:px-10 print:rounded-none print:border-0 print:p-0"
          >
            <h2 class="text-3xl leading-tight font-bold break-words md:text-4xl">{{ atual.condominio.nome }}</h2>
            <ui-qrcode
              [url]="link()"
              [tamanho]="tamanhoQr"
              [descricao]="'QR code do link de cadastro do ' + atual.condominio.nome"
            />
            <p class="max-w-md text-xl leading-snug font-semibold md:text-2xl">{{ instrucao }}</p>
            <p class="text-base break-words md:text-lg">{{ link() }}</p>
          </article>
        }
      }
    </main>
  `,
})
export class Cartaz {
  private readonly api = inject(CondominioAdminService);
  private readonly origem = inject(ORIGEM_DO_APP);
  private readonly janela = inject(DOCUMENT).defaultView;
  private readonly tentativas = new Subject<void>();

  protected readonly instrucao = INSTRUCAO_CARTAZ;
  protected readonly tamanhoQr = TAMANHO_QR_CARTAZ_PX;
  protected readonly tentouDeNovo = signal(false);

  protected readonly estado = carregarCondominio(this.tentativas.pipe(startWith(undefined)), () =>
    this.api.obter(),
  );
  protected readonly link = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'pronto' ? linkPublico(this.origem, estado.condominio.slug) : '';
  });
  private readonly qr = viewChild(QrCode);
  protected readonly estadoQr = computed(() => this.qr()?.estado());

  protected tentarDeNovo(): void {
    this.tentouDeNovo.set(true);
    this.tentativas.next();
  }

  protected imprimir(): void {
    this.janela?.print();
  }
}
