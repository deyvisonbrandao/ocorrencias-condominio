import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CondominioPublico } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { CHAVE_CONDOMINIO_NO_ESTADO, condominioDaRota } from './condominio-da-rota';
import { CondominiosPublicoService } from './condominios-publico.service';

@Component({ template: '' })
class Hospedeiro {
  readonly pagina = condominioDaRota();
}

@Component({ template: '' })
class HospedeiroComTituloProprio {
  readonly pagina = condominioDaRota({ tituloComCondominio: false });
}

@Component({ template: '' })
class HospedeiroComEstado {
  readonly pagina = condominioDaRota({ aceitarDoEstadoDaNavegacao: true });
}

const JARDIM: CondominioPublico = { nome: 'Residencial Jardim', slug: 'jardim' };

describe('condominioDaRota', () => {
  let harness: RouterTestingHarness;
  const api = {
    buscarPorSlug: vi.fn<(slug: string, contexto?: HttpContext) => Observable<CondominioPublico>>(),
  };

  async function abrir<T>(url: string, tipo: Type<T>): Promise<T> {
    const hospedeiro = await harness.navigateByUrl(url, tipo);
    await harness.fixture.whenStable();
    return hospedeiro;
  }

  async function abrirComEstado(url: string, estado: unknown): Promise<HospedeiroComEstado> {
    await TestBed.inject(Router).navigateByUrl(url, {
      state: { [CHAVE_CONDOMINIO_NO_ESTADO]: estado },
    });
    await harness.fixture.whenStable();
    return harness.routeDebugElement?.componentInstance as HospedeiroComEstado;
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset().mockReturnValue(of(JARDIM));
    document.title = '';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'c/:slug', title: 'Criar conta', component: Hospedeiro },
          { path: 'proprio/:slug', title: 'Condomínio', component: HospedeiroComTituloProprio },
          { path: 'estado/:slug', title: 'Cadastro enviado', component: HospedeiroComEstado },
        ]),
        { provide: CondominiosPublicoService, useValue: api },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('busca o condomínio do slug sem toast de erro e expõe o resultado', async () => {
    const { pagina } = await abrir('/c/jardim', Hospedeiro);

    expect(api.buscarPorSlug.mock.calls[0][0]).toBe('jardim');
    expect(api.buscarPorSlug.mock.calls[0][1]?.get(SEM_TOAST_DE_ERRO)).toBe(true);
    expect(pagina.slug()).toBe('jardim');
    expect(pagina.estado()).toEqual({ tipo: 'pronto', condominio: JARDIM });
    expect(pagina.condominio()).toEqual(JARDIM);
  });

  it('com o condomínio carregado, o título da aba vira "{Título da tela} · {Condomínio}"', async () => {
    await abrir('/c/jardim', Hospedeiro);

    expect(document.title).toBe('Criar conta · Residencial Jardim');
  });

  it('tela com título próprio: não troca o título da aba', async () => {
    await abrir('/proprio/jardim', HospedeiroComTituloProprio);

    expect(document.title).toBe('Condomínio');
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

    const { pagina } = await abrir('/c/sumido', Hospedeiro);

    expect(pagina.estado().tipo).toBe('nao-encontrado');
    expect(pagina.condominio()).toBeNull();
    expect(document.title).toContain('Condomínio não encontrado');
  });

  it('slug fora do formato: não consulta a API', async () => {
    const { pagina } = await abrir('/c/A_B', Hospedeiro);

    expect(api.buscarPorSlug).not.toHaveBeenCalled();
    expect(pagina.estado().tipo).toBe('nao-encontrado');
  });

  it('falha de carga: estado "erro" e recarregar consulta de novo', async () => {
    api.buscarPorSlug.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

    const { pagina } = await abrir('/c/jardim', Hospedeiro);
    expect(pagina.estado().tipo).toBe('erro');

    pagina.recarregar();
    await harness.fixture.whenStable();

    expect(api.buscarPorSlug).toHaveBeenCalledTimes(2);
    expect(pagina.estado()).toEqual({ tipo: 'pronto', condominio: JARDIM });
  });

  describe('condomínio vindo no state da navegação', () => {
    it('do mesmo slug: usa o state e não consulta a API', async () => {
      const { pagina } = await abrirComEstado('/estado/jardim', JARDIM);

      expect(api.buscarPorSlug).not.toHaveBeenCalled();
      expect(pagina.estado()).toEqual({ tipo: 'pronto', condominio: JARDIM });
      expect(document.title).toBe('Cadastro enviado · Residencial Jardim');
    });

    it('sem state (recarga): consulta a API', async () => {
      const { pagina } = await abrir('/estado/jardim', HospedeiroComEstado);

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
      expect(pagina.estado()).toEqual({ tipo: 'pronto', condominio: JARDIM });
    });

    it('de outro slug: ignora o state e consulta a API', async () => {
      const { pagina } = await abrirComEstado('/estado/jardim', { nome: 'Outro', slug: 'outro' });

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
      expect(pagina.condominio()).toEqual(JARDIM);
    });

    it('malformado: ignora o state e consulta a API', async () => {
      await abrirComEstado('/estado/jardim', { nome: 42, slug: 'jardim' });

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
    });

    it('recarregar depois do state consulta a API', async () => {
      const { pagina } = await abrirComEstado('/estado/jardim', JARDIM);

      pagina.recarregar();
      await harness.fixture.whenStable();

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
    });

    it('a tela que não aceita state consulta a API mesmo com ele', async () => {
      await TestBed.inject(Router).navigateByUrl('/c/jardim', {
        state: { [CHAVE_CONDOMINIO_NO_ESTADO]: JARDIM },
      });
      await harness.fixture.whenStable();

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(1);
    });
  });
});
