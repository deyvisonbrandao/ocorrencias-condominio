import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PainelAdmin, Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { SessaoService } from '../../core/services/sessao.service';
import { Painel } from './painel';
import { PainelService } from './services/painel.service';

function usuario(papel: Papel): UsuarioSessao {
  return {
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    papel,
    status: 'ATIVO',
    senhaTemporaria: false,
    condominio: { nome: 'Residencial Jardim', slug: 'jardim' },
  };
}

describe('Painel', () => {
  let fixture: ComponentFixture<Painel>;
  let raiz: HTMLElement;
  const api = { obter: vi.fn<() => Observable<PainelAdmin>>() };
  const sessao = { usuario: signal<UsuarioSessao | null>(usuario('SINDICO')) };

  async function criar(): Promise<void> {
    fixture = TestBed.createComponent(Painel);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  const passos = () => [...raiz.querySelectorAll('ol a')].map((a) => a.textContent?.trim());

  beforeEach(() => {
    api.obter.mockReset().mockReturnValue(of({ condominio: { nome: 'Residencial Jardim', slug: 'jardim' } }));
    sessao.usuario.set(usuario('SINDICO'));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PainelService, useValue: api },
        { provide: SessaoService, useValue: sessao },
      ],
    });
  });

  it('mostra o h1, o nome do condomínio vindo da API e os primeiros passos do síndico', async () => {
    await criar();

    expect(raiz.querySelector('h1')?.textContent?.trim()).toBe('Painel');
    expect(raiz.textContent).toContain('Residencial Jardim');
    expect(raiz.querySelector('h2')?.textContent?.trim()).toBe('Primeiros passos');
    expect(passos()).toEqual([
      'Compartilhe o link ou o QR code',
      'Aprove os cadastros',
      'Convide um subsíndico (opcional)',
    ]);
    expect(raiz.querySelector('ol a')?.getAttribute('href')).toBe('/admin/condominio');
  });

  it('o subsíndico não vê o passo de convidar subsíndico', async () => {
    sessao.usuario.set(usuario('SUBSINDICO'));

    await criar();

    expect(passos()).toEqual(['Compartilhe o link ou o QR code', 'Aprove os cadastros']);
  });

  it('falha ao carregar: mostra o erro e "Tentar de novo" busca de novo', async () => {
    api.obter.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await criar();

    expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain('Não foi possível carregar o painel.');
    expect(raiz.querySelector('ol')).toBeNull();

    (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(api.obter).toHaveBeenCalledTimes(2);
    expect(passos()).toHaveLength(3);
  });
});
