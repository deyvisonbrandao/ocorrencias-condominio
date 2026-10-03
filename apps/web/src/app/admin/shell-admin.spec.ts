import { ViewportScroller } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../testes/dialogo-nativo';
import { focarTituloERolarAoNavegar } from '../core/navegacao/foco-na-navegacao';
import rotasAdmin from './admin.routes';

describe('ShellAdmin', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;

  const gaveta = () => raiz.querySelector('ui-drawer dialog') as HTMLDialogElement;
  const botaoMenu = () => raiz.querySelector('button[aria-label="Abrir menu"]') as HTMLButtonElement;
  const itemDaGaveta = (rotulo: string) =>
    [...gaveta().querySelectorAll<HTMLAnchorElement>('a')].find((a) => a.textContent?.trim() === rotulo) as HTMLAnchorElement;

  async function abrirMenu(): Promise<void> {
    botaoMenu().focus();
    botaoMenu().click();
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    simularDialogoNativo();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin', children: rotasAdmin }]),
        {
          provide: ViewportScroller,
          useValue: {
            setHistoryScrollRestoration: vi.fn(),
            getScrollPosition: () => [0, 0],
            scrollToPosition: vi.fn(),
          },
        },
      ],
    });
    TestBed.runInInjectionContext(() => focarTituloERolarAoNavegar());
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    await harness.navigateByUrl('/admin');
  });

  afterEach(() => {
    raiz.remove();
    restaurarDialogoNativo();
  });

  it('redireciona /admin para o painel e marca o item atual na sidebar', () => {
    expect(TestBed.inject(Router).url).toBe('/admin/painel');
    const atual = raiz.querySelector('aside a[aria-current="page"]');
    expect(atual?.textContent?.trim()).toBe('Painel');
  });

  it('o botão de menu abre o drawer e informa aria-expanded', async () => {
    expect(botaoMenu().getAttribute('aria-expanded')).toBe('false');

    await abrirMenu();

    expect(gaveta().hasAttribute('open')).toBe(true);
    expect(botaoMenu().getAttribute('aria-expanded')).toBe('true');
  });

  it('ao escolher um item, navega, fecha o drawer e leva o foco ao h1 da tela', async () => {
    await abrirMenu();

    itemDaGaveta('Moradores').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/moradores');
    expect(gaveta().hasAttribute('open')).toBe(false);
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent?.trim()).toBe('Moradores');
  });

  it('fecha o drawer mesmo ao escolher o item da tela atual', async () => {
    await abrirMenu();

    itemDaGaveta('Painel').click();
    await harness.fixture.whenStable();

    expect(gaveta().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(botaoMenu());
  });

  it('em tela empilhada, troca o menu pelo voltar para a fila', async () => {
    await harness.navigateByUrl('/admin/ocorrencias/57');

    expect(botaoMenu()).toBeNull();
    const voltar = raiz.querySelector('a[aria-label="Voltar para ocorrências"]');
    expect(voltar?.getAttribute('href')).toBe('/admin/ocorrencias');
  });
});
