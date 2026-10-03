import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarregarMais } from './carregar-mais';

describe('ui-carregar-mais', () => {
  let fixture: ComponentFixture<CarregarMais>;
  let raiz: HTMLElement;
  let pedidos: number;

  async function renderizar(entradas: Record<string, unknown> = {}): Promise<void> {
    for (const [nome, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nome, valor);
    }
    await fixture.whenStable();
  }

  const botao = () => raiz.querySelector('button') as HTMLButtonElement | null;

  beforeEach(() => {
    fixture = TestBed.createComponent(CarregarMais);
    raiz = fixture.nativeElement as HTMLElement;
    pedidos = 0;
    fixture.componentInstance.carregar.subscribe(() => (pedidos += 1));
  });

  it('ocioso: o botão pede a próxima página', async () => {
    await renderizar();

    botao()?.click();

    expect(botao()?.textContent?.trim()).toBe('Carregar mais');
    expect(pedidos).toBe(1);
  });

  it('carregando: bloqueia o clique duplo e mostra o gerúndio', async () => {
    await renderizar({ carregando: true });

    botao()?.click();

    expect(botao()?.getAttribute('aria-busy')).toBe('true');
    expect(botao()?.textContent).toContain('Carregando…');
    expect(pedidos).toBe(0);
  });

  it('fim: avisa que não há mais nada e some o botão', async () => {
    await renderizar({ fim: true });

    expect(botao()).toBeNull();
    expect(raiz.textContent?.trim()).toBe('Isso é tudo.');
  });

  it('erro: mostra a mensagem como alerta e "Tentar de novo" pede de novo', async () => {
    await renderizar({ erro: true, mensagemErro: 'Não foi possível carregar mais moradores.' });

    const alerta = raiz.querySelector('[role="alert"]');
    botao()?.click();

    expect(alerta?.textContent).toContain('Não foi possível carregar mais moradores.');
    expect(botao()?.textContent?.trim()).toBe('Tentar de novo');
    expect(pedidos).toBe(1);
  });
});
