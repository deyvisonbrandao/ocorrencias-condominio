import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UsuarioSessao } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { MENSAGEM_SEM_ACESSO } from '../services/navegacao-da-sessao';
import { SessaoService, SONDAGEM_DE_SESSAO } from '../services/sessao.service';
import { sessaoExpiradaInterceptor } from './sessao-expirada.interceptor';

const SINDICO: UsuarioSessao = {
  nome: 'Ana',
  telefone: '+5511912345678',
  papel: 'SINDICO',
  status: 'ATIVO',
  senhaTemporaria: false,
  condominio: { nome: 'Jardim', slug: 'jardim' },
};

const MORADOR: UsuarioSessao = { ...SINDICO, nome: 'Bia', papel: 'MORADOR' };

const ACESSO_NEGADO = { statusCode: 403, code: 'ACESSO_NEGADO', message: 'Acesso negado.' };

describe('sessaoExpiradaInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let router: Router;
  let navegar: ReturnType<typeof vi.spyOn>;
  const usuario = signal<UsuarioSessao | null>(MORADOR);
  const sessao = {
    usuario,
    expirar: vi.fn(() => usuario.set(null)),
    invalidar: vi.fn(() => usuario.set(null)),
    carregar: vi.fn<() => Observable<UsuarioSessao | null>>(),
  };
  const toasts = { erro: vi.fn() };

  beforeEach(() => {
    usuario.set(MORADOR);
    sessao.expirar.mockClear();
    sessao.invalidar.mockClear();
    sessao.carregar.mockReset();
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessaoExpiradaInterceptor])),
        provideHttpClientTesting(),
        { provide: SessaoService, useValue: sessao },
        { provide: ToastService, useValue: toasts },
      ],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/app/minhas');
    navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => controle.verify());

  function falhar(status: number, corpo: object | null = null, contexto?: HttpContext): unknown {
    let recebido: unknown;
    http.get('/x', { context: contexto }).subscribe({ error: (erro: unknown) => (recebido = erro) });
    controle.expectOne('/x').flush(corpo, { status, statusText: 'Erro' });
    return recebido;
  }

  const destino = (chamada = 0) => {
    const alvo: unknown = navegar.mock.calls[chamada][0];
    return typeof alvo === 'string' ? alvo : router.serializeUrl(alvo as Parameters<Router['serializeUrl']>[0]);
  };

  describe('401', () => {
    it('com sessão: encerra a sessão e leva ao login com voltar para a tela atual', () => {
      const erro = falhar(401);

      expect(sessao.expirar).toHaveBeenCalledTimes(1);
      expect(destino()).toBe('/c/jardim/entrar?voltar=%2Fapp%2Fminhas');
      expect(erro).toBeInstanceOf(HttpErrorResponse);
    });

    it('vários 401 seguidos geram um único redirecionamento', () => {
      falhar(401);
      falhar(401);

      expect(sessao.expirar).toHaveBeenCalledTimes(1);
      expect(navegar).toHaveBeenCalledTimes(1);
    });

    it('não reage ao 401 da sondagem de sessão nem do login', () => {
      falhar(401, null, new HttpContext().set(SONDAGEM_DE_SESSAO, true));

      expect(sessao.expirar).not.toHaveBeenCalled();
      expect(navegar).not.toHaveBeenCalled();
    });
  });

  describe('403 ACESSO_NEGADO', () => {
    beforeEach(() => usuario.set(SINDICO));

    it('papel rebaixado: relê a sessão, avisa uma vez e leva à área atual da pessoa', () => {
      sessao.carregar.mockReturnValue(of(MORADOR));

      const erro = falhar(403, ACESSO_NEGADO);

      expect(sessao.invalidar).toHaveBeenCalledTimes(1);
      expect(toasts.erro).toHaveBeenCalledTimes(1);
      expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_SEM_ACESSO);
      expect(destino()).toBe('/app/ocorrencias');
      expect(erro).toBeInstanceOf(HttpErrorResponse);
    });

    it('sem acesso dentro da mesma área (subsíndico em Equipe): vai ao início da área', () => {
      sessao.carregar.mockReturnValue(of({ ...SINDICO, papel: 'SUBSINDICO' }));

      falhar(403, ACESSO_NEGADO);

      expect(destino()).toBe('/admin/painel');
    });

    it('vários 403 juntos relêem a sessão uma vez só', () => {
      sessao.carregar.mockReturnValue(of(MORADOR));

      falhar(403, ACESSO_NEGADO);
      falhar(403, ACESSO_NEGADO);

      expect(sessao.carregar).toHaveBeenCalledTimes(1);
      expect(navegar).toHaveBeenCalledTimes(1);
    });

    it('se a sessão acabou nesse meio-tempo, leva ao login', () => {
      sessao.carregar.mockReturnValue(of(null));

      falhar(403, ACESSO_NEGADO);

      expect(toasts.erro).not.toHaveBeenCalled();
      expect(sessao.expirar).toHaveBeenCalledTimes(1);
      expect(destino()).toBe('/c/jardim/entrar?voltar=%2Fapp%2Fminhas');
    });

    it('se não der para reler a sessão, não navega', () => {
      sessao.carregar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

      falhar(403, ACESSO_NEGADO);

      expect(navegar).not.toHaveBeenCalled();
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('403 de outro código (origem) não mexe na sessão', () => {
      falhar(403, { statusCode: 403, code: 'ORIGEM_NAO_PERMITIDA', message: 'x' });

      expect(sessao.invalidar).not.toHaveBeenCalled();
      expect(navegar).not.toHaveBeenCalled();
    });
  });

  it.each([404, 500])('erro %i não mexe na sessão', (status) => {
    falhar(status);

    expect(sessao.expirar).not.toHaveBeenCalled();
    expect(sessao.invalidar).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });
});
