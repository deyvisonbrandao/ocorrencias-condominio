import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CondominioAdmin } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { ORIGEM_DO_APP } from '../../core/config/origem-do-app';
import { QrCodeService } from '../../shared/services/qrcode.service';
import { Cartaz, INSTRUCAO_CARTAZ, TAMANHO_QR_CARTAZ_PX } from './cartaz';
import { CondominioAdminService } from './services/condominio-admin.service';

const CONDOMINIO: CondominioAdmin = { nome: 'Residencial Jardim', slug: 'jardim', cidade: 'Campinas', uf: 'SP' };

describe('Cartaz', () => {
  let fixture: ComponentFixture<Cartaz>;
  let raiz: HTMLElement;
  const api = { obter: vi.fn<() => Observable<CondominioAdmin>>() };
  const qrcode = { gerar: vi.fn<(conteudo: string, largura: number) => Promise<string>>() };

  const botao = (rotulo: string) =>
    [...raiz.querySelectorAll<HTMLElement>('button, a')].find((item) => item.textContent?.trim() === rotulo);

  async function criar(): Promise<void> {
    fixture = TestBed.createComponent(Cartaz);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    api.obter.mockReset().mockReturnValue(of(CONDOMINIO));
    qrcode.gerar.mockReset().mockResolvedValue('data:image/png;base64,QR');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CondominioAdminService, useValue: api },
        { provide: QrCodeService, useValue: qrcode },
        { provide: ORIGEM_DO_APP, useValue: 'https://ocorrencias.app' },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('mostra o nome, o QR de 8cm, a instrução e a URL em texto', async () => {
    await criar();

    const artigo = raiz.querySelector('article') as HTMLElement;
    expect(artigo.querySelector('h2')?.textContent?.trim()).toBe('Residencial Jardim');
    expect(artigo.textContent).toContain(INSTRUCAO_CARTAZ);
    expect(artigo.textContent).toContain('https://ocorrencias.app/c/jardim');
    expect(qrcode.gerar).toHaveBeenCalledWith('https://ocorrencias.app/c/jardim', expect.any(Number));
    const imagem = artigo.querySelector('ui-qrcode img') as HTMLImageElement;
    expect(imagem.style.width).toBe(`${TAMANHO_QR_CARTAZ_PX}px`);
    expect(imagem.alt).toBe('QR code do link de cadastro do Residencial Jardim');
  });

  it('tem um h1 para o leitor de tela e o voltar para Condomínio', async () => {
    await criar();

    expect(raiz.querySelector('main#conteudo h1')?.textContent?.trim()).toBe('Cartaz para imprimir');
    expect(botao('Voltar para Condomínio')?.getAttribute('href')).toBe('/admin/condominio');
  });

  it('"Imprimir" abre a impressão do navegador', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    await criar();

    botao('Imprimir')?.click();

    expect(imprimir).toHaveBeenCalledTimes(1);
  });

  it('falha ao carregar: mostra o erro, sem botão de imprimir, e tenta de novo', async () => {
    api.obter.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await criar();

    expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain('Não foi possível carregar o cartaz.');
    expect(botao('Imprimir')).toBeUndefined();

    (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(api.obter).toHaveBeenCalledTimes(2);
    expect(raiz.querySelector('article')).not.toBeNull();
  });
});
