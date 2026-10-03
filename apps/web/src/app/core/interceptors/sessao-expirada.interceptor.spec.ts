import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UsuarioSessao } from '@ocorrencias/contratos';
import { SessaoService, SONDAGEM_DE_SESSAO } from '../services/sessao.service';
import { sessaoExpiradaInterceptor } from './sessao-expirada.interceptor';

const MORADOR: UsuarioSessao = {
  nome: 'Bia',
  telefone: '+5511912345678',
  papel: 'MORADOR',
  status: 'ATIVO',
  senhaTemporaria: false,
  condominio: { nome: 'Jardim', slug: 'jardim' },
};

describe('sessaoExpiradaInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let router: Router;
  let navegar: ReturnType<typeof vi.spyOn>;
  const usuario = signal<UsuarioSessao | null>(MORADOR);
  const sessao = { usuario, expirar: vi.fn(() => usuario.set(null)) };

  beforeEach(() => {
    usuario.set(MORADOR);
    sessao.expirar.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessaoExpiradaInterceptor])),
        provideHttpClientTesting(),
        { provide: SessaoService, useValue: sessao },
      ],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/app/minhas');
    navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => controle.verify());

  function falhar(status: number, contexto?: HttpContext): unknown {
    let recebido: unknown;
    http.get('/x', { context: contexto }).subscribe({ error: (erro: unknown) => (recebido = erro) });
    controle.expectOne('/x').flush(null, { status, statusText: 'Erro' });
    return recebido;
  }

  it('401 com sessão: encerra a sessão e leva ao login com voltar para a tela atual', () => {
    const erro = falhar(401);

    expect(sessao.expirar).toHaveBeenCalledTimes(1);
    expect(router.serializeUrl(navegar.mock.calls[0][0])).toBe(
      '/c/jardim/entrar?voltar=%2Fapp%2Fminhas',
    );
    expect(erro).toBeDefined();
  });

  it('vários 401 seguidos geram um único redirecionamento', () => {
    falhar(401);
    falhar(401);

    expect(sessao.expirar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledTimes(1);
  });

  it('não reage ao 401 da sondagem de sessão nem do login', () => {
    falhar(401, new HttpContext().set(SONDAGEM_DE_SESSAO, true));

    expect(sessao.expirar).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it.each([403, 404, 500])('erro %i não mexe na sessão', (status) => {
    falhar(status);

    expect(sessao.expirar).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });
});
