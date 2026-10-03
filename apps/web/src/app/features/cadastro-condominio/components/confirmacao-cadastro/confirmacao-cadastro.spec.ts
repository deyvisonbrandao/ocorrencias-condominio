import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ORIGEM_DO_APP } from '../../../../core/config/origem-do-app';
import { ConfirmacaoCadastro } from './confirmacao-cadastro';

describe('ConfirmacaoCadastro', () => {
  let fixture: ComponentFixture<ConfirmacaoCadastro>;
  let raiz: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ORIGEM_DO_APP, useValue: 'https://ocorrencias.app' }],
    });
    fixture = TestBed.createComponent(ConfirmacaoCadastro);
    fixture.componentRef.setInput('condominio', {
      id: '1',
      nome: 'Jardim das Flores',
      slug: 'jardim',
    });
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('leva o foco ao título ao aparecer', () => {
    const titulo = raiz.querySelector('h1');

    expect(titulo?.textContent?.trim()).toBe('Condomínio criado');
    expect(document.activeElement).toBe(titulo);
  });

  it('mostra o link absoluto do condomínio na origem do app, com o botão de copiar o mesmo valor', () => {
    const esperado = 'https://ocorrencias.app/c/jardim';
    const link = raiz.querySelector('section a') as HTMLAnchorElement;

    expect(raiz.querySelector('h2')?.textContent).toBe('Jardim das Flores');
    expect(link.textContent).toBe(esperado);
    expect(link.getAttribute('href')).toBe(esperado);
    expect(raiz.querySelector('ui-copiar')).not.toBeNull();
  });

  it('oferece ir para o painel', () => {
    const painel = raiz.querySelector('a[href="/admin/painel"]');

    expect(painel?.textContent?.trim()).toBe('Ir para o painel');
  });
});
