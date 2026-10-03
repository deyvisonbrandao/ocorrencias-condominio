import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessaoIndisponivel } from './sessao-indisponivel';

describe('SessaoIndisponivel', () => {
  let fixture: ComponentFixture<SessaoIndisponivel>;
  let raiz: HTMLElement;
  let navegar: ReturnType<typeof vi.spyOn>;
  const location = { path: vi.fn<() => string>() };

  beforeEach(async () => {
    location.path.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Location, useValue: location }],
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(SessaoIndisponivel);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const tentarDeNovo = () => (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();

  it('explica que não deu para verificar a sessão, sem mandar ao login', () => {
    expect(raiz.querySelector('h1')?.textContent?.trim()).toBe('Não foi possível abrir a página');
    expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain('Não foi possível verificar sua sessão.');
  });

  it('"Tentar de novo" refaz a navegação para o endereço que a pessoa abriu', () => {
    location.path.mockReturnValue('/admin/ocorrencias?visao=atrasadas');

    tentarDeNovo();

    expect(navegar).toHaveBeenCalledWith('/admin/ocorrencias?visao=atrasadas');
  });

  it.each(['/sessao-indisponivel', ''])('com o endereço "%s", tenta a partir do início', (caminho) => {
    location.path.mockReturnValue(caminho);

    tentarDeNovo();

    expect(navegar).toHaveBeenCalledWith('/');
  });
});
