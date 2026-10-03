import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MENSAGEM_FALHA_QRCODE, QrCodeService } from '../../../../shared/services/qrcode.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { LinkDeCadastro } from './link-de-cadastro';

describe('LinkDeCadastro', () => {
  let fixture: ComponentFixture<LinkDeCadastro>;
  let raiz: HTMLElement;
  const qrcode = {
    gerar: vi.fn<(conteudo: string, largura: number) => Promise<string>>(),
    baixarPng: vi.fn<(conteudo: string, nomeArquivo: string) => Promise<void>>(),
  };
  const toasts = { erro: vi.fn() };

  const botao = (rotulo: string) =>
    [...raiz.querySelectorAll<HTMLElement>('button, a')].find((item) => item.textContent?.trim() === rotulo);

  async function esperar(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 0));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    qrcode.gerar.mockReset().mockResolvedValue('data:image/png;base64,QR');
    qrcode.baixarPng.mockReset().mockResolvedValue();
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: QrCodeService, useValue: qrcode },
        { provide: ToastService, useValue: toasts },
      ],
    });
    fixture = TestBed.createComponent(LinkDeCadastro);
    fixture.componentRef.setInput('url', 'https://ocorrencias.app/c/jardim');
    fixture.componentRef.setInput('nome', 'Residencial Jardim');
    fixture.componentRef.setInput('slug', 'jardim');
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('mostra a URL completa num campo somente leitura, o copiar e o QR com texto alternativo', () => {
    const campo = raiz.querySelector('input') as HTMLInputElement;

    expect(campo.value).toBe('https://ocorrencias.app/c/jardim');
    expect(campo.readOnly).toBe(true);
    expect(botao('Copiar link')).toBeDefined();
    expect(qrcode.gerar).toHaveBeenCalledWith('https://ocorrencias.app/c/jardim', expect.any(Number));
    expect(raiz.querySelector('ui-qrcode img')?.getAttribute('alt')).toBe(
      'QR code do link de cadastro do Residencial Jardim',
    );
  });

  it('"Imprimir cartaz" leva à rota do cartaz', () => {
    expect(botao('Imprimir cartaz')?.getAttribute('href')).toBe('/admin/condominio/cartaz');
  });

  it('"Baixar QR code (PNG)" baixa o PNG da URL com o slug no nome do arquivo', async () => {
    botao('Baixar QR code (PNG)')?.click();
    await esperar();

    expect(qrcode.baixarPng).toHaveBeenCalledWith('https://ocorrencias.app/c/jardim', 'qrcode-jardim.png');
    expect(toasts.erro).not.toHaveBeenCalled();
  });

  it('se a geração do PNG falha, avisa com toast de erro', async () => {
    qrcode.baixarPng.mockRejectedValue(new Error('falhou'));

    botao('Baixar QR code (PNG)')?.click();
    await esperar();

    expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_FALHA_QRCODE);
  });

  it('atualiza o campo quando a URL muda', async () => {
    fixture.componentRef.setInput('url', 'https://ocorrencias.app/c/outro');
    await fixture.whenStable();

    expect((raiz.querySelector('input') as HTMLInputElement).value).toBe('https://ocorrencias.app/c/outro');
  });
});
