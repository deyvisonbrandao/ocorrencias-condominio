import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MENSAGEM_FALHA_QRCODE, QrCodeService } from '../../services/qrcode.service';
import { QrCode } from './qrcode';

describe('ui-qrcode', () => {
  let fixture: ComponentFixture<QrCode>;
  let raiz: HTMLElement;
  const qrcode = { gerar: vi.fn<(conteudo: string, largura: number) => Promise<string>>() };

  const imagem = () => raiz.querySelector('img');

  function montar(url = 'https://exemplo.com/c/jardim'): void {
    fixture = TestBed.createComponent(QrCode);
    fixture.componentRef.setInput('url', url);
    fixture.componentRef.setInput('descricao', 'QR code do link de cadastro do Residencial Jardim');
    raiz = fixture.nativeElement as HTMLElement;
  }

  async function criar(): Promise<void> {
    montar();
    await fixture.whenStable();
  }

  beforeEach(() => {
    qrcode.gerar.mockReset().mockImplementation((conteudo) => Promise.resolve(`data:image/png;base64,${conteudo}`));
    TestBed.configureTestingModule({ providers: [{ provide: QrCodeService, useValue: qrcode }] });
  });

  it('mostra a imagem com o texto alternativo e 240px na tela, gerada com mais resolução', async () => {
    await criar();

    expect(imagem()?.getAttribute('src')).toBe('data:image/png;base64,https://exemplo.com/c/jardim');
    expect(imagem()?.getAttribute('alt')).toBe('QR code do link de cadastro do Residencial Jardim');
    expect(imagem()?.style.width).toBe('240px');
    expect(qrcode.gerar).toHaveBeenCalledWith('https://exemplo.com/c/jardim', 960);
  });

  it('enquanto gera, mostra o skeleton com aviso para leitor de tela', async () => {
    let concluir: (imagem: string) => void = () => undefined;
    qrcode.gerar.mockReturnValue(new Promise<string>((resolver) => (concluir = resolver)));

    montar();
    await new Promise((resolver) => setTimeout(resolver, 0));

    expect(imagem()).toBeNull();
    expect(raiz.querySelector('[aria-busy="true"]')?.textContent).toContain('Gerando QR code…');

    concluir('data:image/png;base64,QR');
    await fixture.whenStable();

    expect(imagem()?.getAttribute('src')).toBe('data:image/png;base64,QR');
  });

  it('quando a geração falha, mostra a mensagem de erro no lugar do QR', async () => {
    qrcode.gerar.mockRejectedValue(new Error('falhou'));

    await criar();

    expect(imagem()).toBeNull();
    expect(raiz.textContent).toContain(MENSAGEM_FALHA_QRCODE);
  });

  it('gera de novo quando a URL ou o tamanho mudam', async () => {
    await criar();

    fixture.componentRef.setInput('url', 'https://exemplo.com/c/outro');
    fixture.componentRef.setInput('tamanho', 302);
    await fixture.whenStable();

    expect(qrcode.gerar).toHaveBeenLastCalledWith('https://exemplo.com/c/outro', 1208);
    expect(imagem()?.style.width).toBe('302px');
  });
});
