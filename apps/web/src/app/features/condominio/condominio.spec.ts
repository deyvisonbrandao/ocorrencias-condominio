import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CondominioAdmin, CondominioPublico, Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { ORIGEM_DO_APP } from '../../core/config/origem-do-app';
import { SessaoService } from '../../core/services/sessao.service';
import { ESPERA_LONGA_MS } from '../../shared/components/estados/skeleton';
import { QrCodeService } from '../../shared/services/qrcode.service';
import { Condominio, NOTA_SOMENTE_SINDICO } from './condominio';
import { CondominioAdminService } from './services/condominio-admin.service';

const CONDOMINIO: CondominioAdmin = { nome: 'Residencial Jardim', slug: 'jardim', cidade: 'Campinas', uf: 'SP' };

function usuario(papel: Papel): UsuarioSessao {
  return {
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    papel,
    status: 'ATIVO',
    senhaTemporaria: false,
    condominio: { nome: CONDOMINIO.nome, slug: CONDOMINIO.slug },
  };
}

describe('Condominio', () => {
  let fixture: ComponentFixture<Condominio>;
  let raiz: HTMLElement;
  const api = {
    obter: vi.fn<() => Observable<CondominioAdmin>>(),
    atualizar: vi.fn<() => Observable<CondominioAdmin>>(),
  };
  const sessao = {
    usuario: signal<UsuarioSessao | null>(usuario('SINDICO')),
    atualizarCondominio: vi.fn<(condominio: CondominioPublico) => void>(),
  };
  const qrcode = { gerar: vi.fn(() => Promise.resolve('data:image/png;base64,QR')), baixarPng: vi.fn() };

  async function criar(): Promise<void> {
    fixture = TestBed.createComponent(Condominio);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  const titulos = () => [...raiz.querySelectorAll('h1, h2')].map((titulo) => titulo.textContent?.trim());
  const campoDoLink = () =>
    raiz.querySelector('app-link-de-cadastro input') as HTMLInputElement | null;

  beforeEach(() => {
    api.obter.mockReset().mockReturnValue(of(CONDOMINIO));
    api.atualizar.mockReset();
    sessao.usuario.set(usuario('SINDICO'));
    sessao.atualizarCondominio.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CondominioAdminService, useValue: api },
        { provide: SessaoService, useValue: sessao },
        { provide: QrCodeService, useValue: qrcode },
        { provide: ORIGEM_DO_APP, useValue: 'https://ocorrencias.app' },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('síndico: vê o formulário dos dados e o bloco do link com a URL pública do ambiente', async () => {
    await criar();

    expect(titulos()).toEqual(['Condomínio', 'Dados do condomínio', 'Link de cadastro']);
    expect(raiz.querySelector('app-dados-condominio form')).not.toBeNull();
    expect(raiz.textContent).not.toContain(NOTA_SOMENTE_SINDICO);
    expect(campoDoLink()?.value).toBe('https://ocorrencias.app/c/jardim');
  });

  it('subsíndico: vê os dados como texto, a nota e o mesmo bloco do link, sem formulário', async () => {
    sessao.usuario.set(usuario('SUBSINDICO'));

    await criar();

    expect(raiz.querySelector('form')).toBeNull();
    expect(raiz.querySelector('button[type="submit"]')).toBeNull();
    const dados = [...raiz.querySelectorAll('dd')].map((dd) => dd.textContent?.trim());
    expect(dados).toEqual(['Residencial Jardim', 'Campinas – SP']);
    expect(raiz.textContent).toContain(NOTA_SOMENTE_SINDICO);
    expect(campoDoLink()?.value).toBe('https://ocorrencias.app/c/jardim');
  });

  it('subsíndico com condomínio sem cidade: mostra "Não informada"', async () => {
    sessao.usuario.set(usuario('SUBSINDICO'));
    api.obter.mockReturnValue(of({ ...CONDOMINIO, cidade: null, uf: null }));

    await criar();

    expect(raiz.querySelectorAll('dd')[1]?.textContent?.trim()).toBe('Não informada');
  });

  it('ao salvar, atualiza o nome na sessão (barra e menu) e mantém o link', async () => {
    const salvo: CondominioAdmin = { ...CONDOMINIO, nome: 'Jardim II' };
    api.atualizar.mockReturnValue(of(salvo));
    await criar();
    const nome = raiz.querySelector('app-dados-condominio input') as HTMLInputElement;
    nome.value = 'Jardim II';
    nome.dispatchEvent(new Event('input', { bubbles: true }));

    (raiz.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(sessao.atualizarCondominio).toHaveBeenCalledWith({ nome: 'Jardim II', slug: 'jardim' });
    expect(raiz.querySelector('ui-qrcode img')?.getAttribute('alt')).toBe(
      'QR code do link de cadastro do Jardim II',
    );
  });

  it('falha ao carregar: mostra o erro e "Tentar de novo" busca de novo', async () => {
    api.obter.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await criar();

    expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain(
      'Não foi possível carregar os dados do condomínio.',
    );
    expect(campoDoLink()).toBeNull();

    (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(api.obter).toHaveBeenCalledTimes(2);
    expect(campoDoLink()?.value).toBe('https://ocorrencias.app/c/jardim');
  });

  it('carregando: nada até 300ms, depois skeleton e, passados 10s, o aviso de demora', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.obter.mockReturnValue(NEVER);
    fixture = TestBed.createComponent(Condominio);
    raiz = fixture.nativeElement as HTMLElement;
    await vi.advanceTimersByTimeAsync(0);
    await fixture.whenStable();

    expect(raiz.querySelector('ui-skeleton')).toBeNull();

    await vi.advanceTimersByTimeAsync(300);
    await fixture.whenStable();
    expect(raiz.querySelector('ui-skeleton')).not.toBeNull();
    expect(raiz.textContent).not.toContain('Está demorando mais que o normal…');

    await vi.advanceTimersByTimeAsync(ESPERA_LONGA_MS);
    await fixture.whenStable();
    expect(raiz.textContent).toContain('Está demorando mais que o normal…');
  });
});
