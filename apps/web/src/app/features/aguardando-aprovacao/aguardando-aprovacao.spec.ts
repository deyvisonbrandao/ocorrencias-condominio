import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CondominioPublico } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { AguardandoAprovacao } from './aguardando-aprovacao';

const JARDIM: CondominioPublico = { nome: 'Residencial Jardim', slug: 'jardim' };

describe('AguardandoAprovacao', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;
  const api = {
    buscarPorSlug: vi.fn<(slug: string, contexto?: HttpContext) => Observable<CondominioPublico>>(),
  };

  const titulo = () => raiz.querySelector('h1')?.textContent?.trim();
  const texto = () => (raiz.textContent ?? '').replace(/\s+/g, ' ');

  async function abrir(url = '/c/jardim/aguardando-aprovacao'): Promise<void> {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset().mockReturnValue(of(JARDIM));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'c/:slug/aguardando-aprovacao',
            title: 'Cadastro enviado',
            component: AguardandoAprovacao,
          },
        ]),
        { provide: CondominiosPublicoService, useValue: api },
      ],
    });
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
  });

  it('vindo do cadastro: usa o condomínio do state, sem consultar a API', async () => {
    await TestBed.inject(Router).navigateByUrl('/c/jardim/aguardando-aprovacao', {
      state: { condominio: { nome: 'Jardim do state', slug: 'jardim' } },
    });
    await harness.fixture.whenStable();

    expect(api.buscarPorSlug).not.toHaveBeenCalled();
    expect(texto()).toContain('A administração do Jardim do state precisa aprovar seu acesso.');
    expect(raiz.querySelector('ui-estado-erro')).toBeNull();
    expect(document.title).toBe('Cadastro enviado · Jardim do state');
  });

  it('recarga (sem state): busca o condomínio e usa o título com o nome dele', async () => {
    await abrir();

    expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
    expect(document.title).toBe('Cadastro enviado · Residencial Jardim');
  });

  it('mostra o relógio, o h1, o texto com o nome do condomínio e o botão para o login', async () => {
    await abrir();

    expect(titulo()).toBe('Cadastro enviado');
    expect(raiz.querySelector('ui-icone')?.getAttribute('aria-hidden')).toBe('true');
    expect(texto()).toContain(
      'A administração do Residencial Jardim precisa aprovar seu acesso. Depois disso, entre com seu telefone e senha.',
    );
    const login = [...raiz.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Ir para o login');
    expect(login?.getAttribute('href')).toBe('/c/jardim/entrar');
  });

  it('não consulta a API de novo sozinha (sem polling)', async () => {
    vi.useFakeTimers();
    try {
      await abrir();
      vi.advanceTimersByTime(60_000);

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('inexistente: "Condomínio não encontrado" sem o relógio', async () => {
    api.buscarPorSlug.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { statusCode: 404, code: 'CONDOMINIO_NAO_ENCONTRADO', message: 'x' },
          }),
      ),
    );

    await abrir('/c/sumido/aguardando-aprovacao');

    expect(titulo()).toBe('Condomínio não encontrado');
    expect(raiz.querySelector('ui-icone[nome="relogio"]')).toBeNull();
    expect(raiz.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('falha de carga: estado de erro com "Tentar de novo"', async () => {
    api.buscarPorSlug.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

    await abrir();

    expect(titulo()).toBe('Cadastro enviado');
    expect(raiz.querySelector('ui-estado-erro')).not.toBeNull();

    (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();

    expect(texto()).toContain('A administração do Residencial Jardim');
  });
});
