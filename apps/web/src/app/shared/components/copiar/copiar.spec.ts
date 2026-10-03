import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Copiar, DURACAO_COPIADO_MS, MENSAGEM_FALHA_COPIA } from './copiar';

describe('ui-copiar', () => {
  let fixture: ComponentFixture<Copiar>;
  let raiz: HTMLElement;
  const escrever = vi.fn<(texto: string) => Promise<void>>();

  const botao = () => raiz.querySelector('button') as HTMLButtonElement;
  const anuncio = () => raiz.querySelector('[aria-live="polite"]')?.textContent?.trim();

  async function clicar(): Promise<void> {
    botao().click();
    await Promise.resolve();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    escrever.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: escrever },
    });
    fixture = TestBed.createComponent(Copiar);
    fixture.componentRef.setInput('valor', 'https://exemplo.com/c/jardim');
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('copia o valor e anuncia o sucesso', async () => {
    escrever.mockResolvedValue();

    await clicar();

    expect(escrever).toHaveBeenCalledWith('https://exemplo.com/c/jardim');
    expect(botao().textContent).toContain('Link copiado');
    expect(anuncio()).toBe('Link copiado.');
  });

  it('volta ao rótulo original depois de alguns segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    escrever.mockResolvedValue();
    await clicar();

    vi.advanceTimersByTime(DURACAO_COPIADO_MS);
    await fixture.whenStable();

    expect(botao().textContent).toContain('Copiar link');
    expect(anuncio()).toBe('');
  });

  it('quando a cópia falha, mostra e anuncia como copiar manualmente', async () => {
    escrever.mockRejectedValue(new Error('negado'));

    await clicar();
    await fixture.whenStable();

    expect(raiz.textContent).toContain(MENSAGEM_FALHA_COPIA);
    expect(anuncio()).toBe(MENSAGEM_FALHA_COPIA);
    expect(botao().textContent).toContain('Copiar link');
  });

  it('sem área de transferência disponível, também orienta a copiar manualmente', async () => {
    Reflect.deleteProperty(navigator, 'clipboard');

    await clicar();

    expect(anuncio()).toBe(MENSAGEM_FALHA_COPIA);
  });
});
