import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CondominioPublico } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { condominioDaRota } from './condominio-da-rota';
import { CondominiosPublicoService } from './condominios-publico.service';

@Component({ template: '' })
class Hospedeiro {
  readonly pagina = condominioDaRota();
}

const JARDIM: CondominioPublico = { nome: 'Residencial Jardim', slug: 'jardim' };

describe('condominioDaRota', () => {
  let harness: RouterTestingHarness;
  const api = {
    buscarPorSlug: vi.fn<(slug: string, contexto?: HttpContext) => Observable<CondominioPublico>>(),
  };

  async function abrir(url: string): Promise<Hospedeiro> {
    const hospedeiro = await harness.navigateByUrl(url, Hospedeiro);
    await harness.fixture.whenStable();
    return hospedeiro;
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset().mockReturnValue(of(JARDIM));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'c/:slug', component: Hospedeiro }]),
        { provide: CondominiosPublicoService, useValue: api },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('busca o condomínio do slug sem toast de erro e expõe o resultado', async () => {
    const { pagina } = await abrir('/c/jardim');

    expect(api.buscarPorSlug.mock.calls[0][0]).toBe('jardim');
    expect(api.buscarPorSlug.mock.calls[0][1]?.get(SEM_TOAST_DE_ERRO)).toBe(true);
    expect(pagina.slug()).toBe('jardim');
    expect(pagina.estado()).toEqual({ tipo: 'pronto', condominio: JARDIM });
    expect(pagina.condominio()).toEqual(JARDIM);
  });

  it('404 de condomínio: estado "nao-encontrado" e título da aba', async () => {
    api.buscarPorSlug.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { statusCode: 404, code: 'CONDOMINIO_NAO_ENCONTRADO', message: 'x' },
          }),
      ),
    );

    const { pagina } = await abrir('/c/sumido');

    expect(pagina.estado().tipo).toBe('nao-encontrado');
    expect(pagina.condominio()).toBeNull();
    expect(document.title).toContain('Condomínio não encontrado');
  });

  it('slug fora do formato: não consulta a API', async () => {
    const { pagina } = await abrir('/c/A_B');

    expect(api.buscarPorSlug).not.toHaveBeenCalled();
    expect(pagina.estado().tipo).toBe('nao-encontrado');
  });

  it('falha de carga: estado "erro" e recarregar consulta de novo', async () => {
    api.buscarPorSlug.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

    const { pagina } = await abrir('/c/jardim');
    expect(pagina.estado().tipo).toBe('erro');

    pagina.recarregar();
    await harness.fixture.whenStable();

    expect(api.buscarPorSlug).toHaveBeenCalledTimes(2);
    expect(pagina.estado()).toEqual({ tipo: 'pronto', condominio: JARDIM });
  });
});
