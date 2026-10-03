import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CondominioPublico } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { PaginaDoCondominio } from './pagina-do-condominio';

const JARDIM: CondominioPublico = { nome: 'Residencial Jardim', slug: 'jardim' };

describe('PaginaDoCondominio', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;
  const api = {
    buscarPorSlug: vi.fn<(slug: string, contexto?: HttpContext) => Observable<CondominioPublico>>(),
  };

  const titulo = () => raiz.querySelector('h1')?.textContent?.trim();
  const link = (texto: string) =>
    [...raiz.querySelectorAll('a')].find((a) => a.textContent?.trim() === texto);

  async function abrir(url = '/c/jardim'): Promise<void> {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset().mockReturnValue(of(JARDIM));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'c/:slug', title: 'Condomínio', component: PaginaDoCondominio }]),
        { provide: CondominiosPublicoService, useValue: api },
      ],
    });
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
  });

  it('mostra o nome no h1, as ações de criar conta e entrar e a nota de aprovação', async () => {
    await abrir();

    expect(titulo()).toBe('Residencial Jardim');
    expect(raiz.textContent).toContain('Registre e acompanhe as ocorrências do condomínio pelo celular.');
    expect(raiz.textContent).toContain('Seu cadastro precisa ser aprovado pela administração.');
    expect(link('Criar conta')?.getAttribute('href')).toBe('/c/jardim/cadastro');
    expect(link('Entrar')?.getAttribute('href')).toBe('/c/jardim/entrar');
    expect(document.title).toContain('Residencial Jardim');
  });

  it('"Criar conta" vem antes de "Entrar" na ordem de leitura', async () => {
    await abrir();

    const acoes = [...raiz.querySelectorAll('a')].map((a) => a.textContent?.trim());

    expect(acoes.indexOf('Criar conta')).toBeLessThan(acoes.indexOf('Entrar'));
  });

  it('inexistente ou inativo: "Condomínio não encontrado" com link para a landing', async () => {
    api.buscarPorSlug.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { statusCode: 404, code: 'CONDOMINIO_NAO_ENCONTRADO', message: 'x' },
          }),
      ),
    );

    await abrir('/c/sumido');

    expect(titulo()).toBe('Condomínio não encontrado');
    expect(raiz.textContent).toContain('Confira o link com a administração do seu condomínio.');
    expect(raiz.querySelector('a[href="/"]')).not.toBeNull();
    expect(link('Criar conta')).toBeUndefined();
  });

  it('falha de carga: estado de erro e "Tentar de novo" busca outra vez', async () => {
    api.buscarPorSlug.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    await abrir();

    expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain(
      'Não foi possível carregar o condomínio.',
    );

    (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();

    expect(api.buscarPorSlug).toHaveBeenCalledTimes(2);
    expect(titulo()).toBe('Residencial Jardim');
  });

  it('carregando: o h1 existe só para leitor de tela', async () => {
    api.buscarPorSlug.mockReturnValue(new Observable<CondominioPublico>());

    await abrir();

    expect(raiz.querySelector('h1')?.classList).toContain('sr-only');
    expect(link('Criar conta')).toBeUndefined();
  });
});
