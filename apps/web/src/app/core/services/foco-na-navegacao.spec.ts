import { Location, ViewportScroller } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';
import { focarTituloERolarAoNavegar } from './foco-na-navegacao';

@Component({ selector: 'app-lista', template: '<main id="conteudo"><h1>Lista</h1></main>' })
class Lista {}

@Component({ selector: 'app-detalhe', template: '<main id="conteudo"><h1>Detalhe</h1></main>' })
class Detalhe {}

describe('focarTituloERolarAoNavegar', () => {
  let harness: RouterTestingHarness;
  let posicaoAtual: [number, number];
  const rolagem = {
    setHistoryScrollRestoration: vi.fn(),
    getScrollPosition: vi.fn(() => posicaoAtual),
    scrollToPosition: vi.fn(),
  };

  const titulo = () => document.activeElement?.textContent;

  beforeEach(async () => {
    posicaoAtual = [0, 0];
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'lista', component: Lista },
          { path: 'detalhe', component: Detalhe },
        ]),
        { provide: ViewportScroller, useValue: rolagem },
      ],
    });
    TestBed.runInInjectionContext(() => focarTituloERolarAoNavegar());
    TestBed.inject(Router).setUpLocationChangeListener();
    harness = await RouterTestingHarness.create();
    document.body.appendChild(harness.fixture.nativeElement as HTMLElement);
    await harness.navigateByUrl('/lista');
  });

  afterEach(() => {
    (harness.fixture.nativeElement as HTMLElement).remove();
  });

  it('deixa a restauração de rolagem do navegador em manual', () => {
    expect(rolagem.setHistoryScrollRestoration).toHaveBeenCalledWith('manual');
  });

  it('não move o foco na primeira navegação', () => {
    expect(document.activeElement).toBe(document.body);
    expect(rolagem.scrollToPosition).not.toHaveBeenCalled();
  });

  it('ao trocar de caminho, foca o h1 da nova tela e rola ao topo', async () => {
    posicaoAtual = [0, 640];

    await harness.navigateByUrl('/detalhe');

    expect(titulo()).toBe('Detalhe');
    expect(rolagem.scrollToPosition).toHaveBeenCalledWith([0, 0]);
  });

  it('mudança só de query ou fragmento não move o foco nem rola', async () => {
    const filtro = document.createElement('button');
    document.body.appendChild(filtro);
    filtro.focus();

    await harness.navigateByUrl('/lista?visao=nao-triadas');
    await harness.navigateByUrl('/lista?visao=nao-triadas#fim');

    expect(document.activeElement).toBe(filtro);
    expect(rolagem.scrollToPosition).not.toHaveBeenCalled();
    filtro.remove();
  });

  it('ao voltar pelo histórico, restaura a posição da lista e foca o h1', async () => {
    posicaoAtual = [0, 640];
    await harness.navigateByUrl('/detalhe');
    posicaoAtual = [0, 0];

    const fimDaNavegacao = firstValueFrom(
      TestBed.inject(Router).events.pipe(filter((evento) => evento instanceof NavigationEnd)),
    );
    TestBed.inject(Location).back();
    await fimDaNavegacao;
    await harness.fixture.whenStable();

    expect(titulo()).toBe('Lista');
    expect(rolagem.scrollToPosition).toHaveBeenLastCalledWith([0, 640]);
  });
});
