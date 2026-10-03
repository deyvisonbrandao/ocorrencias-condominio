import { TestBed } from '@angular/core/testing';
import {
  GERADOR_QRCODE,
  GeradorQrCode,
  LARGURA_PNG_QRCODE,
  MARGEM_PNG_QRCODE,
  QrCodeService,
} from './qrcode.service';

describe('QrCodeService', () => {
  let servico: QrCodeService;
  const gerador = vi.fn<GeradorQrCode>();

  beforeEach(() => {
    gerador.mockReset().mockResolvedValue('data:image/png;base64,QR');
    TestBed.configureTestingModule({ providers: [{ provide: GERADOR_QRCODE, useValue: gerador }] });
    servico = TestBed.inject(QrCodeService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('gerar repassa o conteúdo, a largura e a margem (sem margem por padrão)', async () => {
    await expect(servico.gerar('https://exemplo.com/c/jardim', 960)).resolves.toBe('data:image/png;base64,QR');

    expect(gerador).toHaveBeenCalledWith('https://exemplo.com/c/jardim', { largura: 960, margem: 0 });
  });

  it('baixarPng gera em 1024px com zona de respiro e baixa com o nome pedido', async () => {
    let baixado: { href: string; download: string; noDocumento: boolean } | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      baixado = { href: this.href, download: this.download, noDocumento: document.body.contains(this) };
    });

    await servico.baixarPng('https://exemplo.com/c/jardim', 'qrcode-jardim.png');

    expect(gerador).toHaveBeenCalledWith('https://exemplo.com/c/jardim', {
      largura: LARGURA_PNG_QRCODE,
      margem: MARGEM_PNG_QRCODE,
    });
    expect(baixado).toEqual({
      href: 'data:image/png;base64,QR',
      download: 'qrcode-jardim.png',
      noDocumento: true,
    });
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('baixarPng propaga a falha da geração sem tentar baixar', async () => {
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    gerador.mockRejectedValue(new Error('falhou'));

    await expect(servico.baixarPng('https://exemplo.com/c/jardim', 'qrcode-jardim.png')).rejects.toThrow('falhou');

    expect(clicar).not.toHaveBeenCalled();
  });
});
