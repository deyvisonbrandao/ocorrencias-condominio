import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CondominioPublico } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { Landing, MENSAGEM_CONDOMINIO_NAO_ENCONTRADO, MENSAGEM_ENDERECO_VAZIO } from './landing';

describe('Landing', () => {
  let fixture: ComponentFixture<Landing>;
  let raiz: HTMLElement;
  let navegar: ReturnType<typeof vi.spyOn>;
  const api = { buscarPorSlug: vi.fn<(slug: string) => Observable<CondominioPublico>>() };

  const campo = () => raiz.querySelector('form input') as HTMLInputElement;
  const mensagemDeErro = () => raiz.querySelector('form [id$="-erro"]')?.textContent?.trim();

  async function irParaLogin(endereco: string): Promise<void> {
    campo().value = endereco;
    campo().dispatchEvent(new Event('input'));
    (raiz.querySelector('form button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CondominiosPublicoService, useValue: api }],
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Landing);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('leva o síndico ao cadastro pelo botão principal', () => {
    const cta = raiz.querySelector('a[href="/cadastrar-condominio"]');

    expect(cta?.textContent?.trim()).toBe('Cadastrar meu condomínio');
  });

  it('condomínio existente: vai para o login dele', async () => {
    api.buscarPorSlug.mockReturnValue(of({ nome: 'Jardim', slug: 'jardim' }));

    await irParaLogin('Jardim');

    expect(api.buscarPorSlug).toHaveBeenCalledWith('jardim');
    expect(navegar).toHaveBeenCalledWith(['/c', 'jardim', 'entrar']);
  });

  it('aceita o link completo colado no campo', async () => {
    api.buscarPorSlug.mockReturnValue(of({ nome: 'Jardim', slug: 'jardim' }));

    await irParaLogin('https://ocorrencias.app/c/jardim');

    expect(api.buscarPorSlug).toHaveBeenCalledWith('jardim');
  });

  it('condomínio inexistente: erro no campo, com foco nele', async () => {
    api.buscarPorSlug.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    await irParaLogin('nao-existe');

    expect(mensagemDeErro()).toBe(MENSAGEM_CONDOMINIO_NAO_ENCONTRADO);
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(campo());
    expect(navegar).not.toHaveBeenCalled();
  });

  it('endereço fora do formato: mesmo erro, sem consultar a API', async () => {
    await irParaLogin('a b');

    expect(api.buscarPorSlug).not.toHaveBeenCalled();
    expect(mensagemDeErro()).toBe(MENSAGEM_CONDOMINIO_NAO_ENCONTRADO);
  });

  it('campo vazio: pede o endereço', async () => {
    await irParaLogin('   ');

    expect(api.buscarPorSlug).not.toHaveBeenCalled();
    expect(mensagemDeErro()).toBe(MENSAGEM_ENDERECO_VAZIO);
  });

  it('ao digitar de novo, o erro some', async () => {
    await irParaLogin('');

    campo().value = 'jar';
    campo().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(mensagemDeErro()).toBeUndefined();
  });

  it('erro que não é 404 fica com o toast global e não marca o campo', async () => {
    api.buscarPorSlug.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await irParaLogin('jardim');

    expect(mensagemDeErro()).toBeUndefined();
    expect(navegar).not.toHaveBeenCalled();
  });
});
