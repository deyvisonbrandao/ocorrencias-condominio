import { Component, inject, input, resource } from '@angular/core';
import { MENSAGEM_FALHA_QRCODE, QrCodeService } from '../../services/qrcode.service';
import { Icone } from '../icone/icone';

export const TAMANHO_QRCODE_TELA = 240;

// Gera a imagem com mais pixels que o tamanho exibido para ficar nítida em tela densa e no papel.
const FATOR_DE_RESOLUCAO = 4;

@Component({
  selector: 'ui-qrcode',
  imports: [Icone],
  host: { class: 'inline-block max-w-full rounded-cartao border border-borda bg-superficie p-4 print:border-0' },
  template: `
    @if (imagem.error()) {
      <div
        class="flex aspect-square max-w-full flex-col items-center justify-center gap-2 text-center text-sm font-medium text-perigo"
        [style.width.px]="tamanho()"
      >
        <ui-icone nome="alerta" [tamanho]="24" />
        <p>{{ mensagemFalha }}</p>
      </div>
    } @else if (imagem.hasValue()) {
      <img
        class="block aspect-square max-w-full"
        [src]="imagem.value()"
        [alt]="descricao()"
        [width]="tamanho()"
        [height]="tamanho()"
        [style.width.px]="tamanho()"
      />
    } @else {
      <div class="aspect-square max-w-full" aria-busy="true" [style.width.px]="tamanho()">
        <span class="sr-only">Gerando QR code…</span>
        <div class="h-full w-full rounded bg-superficie-sutil motion-safe:animate-pulse" aria-hidden="true"></div>
      </div>
    }
  `,
})
export class QrCode {
  readonly url = input.required<string>();
  readonly descricao = input.required<string>();
  readonly tamanho = input(TAMANHO_QRCODE_TELA);

  private readonly qrcode = inject(QrCodeService);

  protected readonly mensagemFalha = MENSAGEM_FALHA_QRCODE;
  protected readonly imagem = resource({
    params: () => ({ url: this.url(), largura: this.tamanho() * FATOR_DE_RESOLUCAO }),
    loader: ({ params }) => this.qrcode.gerar(params.url, params.largura),
  });
}
