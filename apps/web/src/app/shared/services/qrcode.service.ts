import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';

export interface OpcoesQrCode {
  readonly largura: number;
  readonly margem: number;
}

export type GeradorQrCode = (conteudo: string, opcoes: OpcoesQrCode) => Promise<string>;

export const LARGURA_PNG_QRCODE = 1024;
export const MARGEM_PNG_QRCODE = 4;
export const MENSAGEM_FALHA_QRCODE = 'Não foi possível gerar o QR code.';

export const GERADOR_QRCODE = new InjectionToken<GeradorQrCode>('GERADOR_QRCODE', {
  providedIn: 'root',
  factory: () => async (conteudo, { largura, margem }) => {
    // Import dinâmico: a biblioteca só é baixada por quem abre uma tela com QR code.
    const { toDataURL } = await import('qrcode');
    return toDataURL(conteudo, {
      width: largura,
      margin: margem,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
  },
});

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  private readonly gerador = inject(GERADOR_QRCODE);
  private readonly documento = inject(DOCUMENT);

  gerar(conteudo: string, largura: number, margem = 0): Promise<string> {
    return this.gerador(conteudo, { largura, margem });
  }

  async baixarPng(conteudo: string, nomeArquivo: string): Promise<void> {
    const imagem = await this.gerar(conteudo, LARGURA_PNG_QRCODE, MARGEM_PNG_QRCODE);
    const link = this.documento.createElement('a');
    link.href = imagem;
    link.download = nomeArquivo;
    link.hidden = true;
    this.documento.body.appendChild(link);
    link.click();
    link.remove();
  }
}
