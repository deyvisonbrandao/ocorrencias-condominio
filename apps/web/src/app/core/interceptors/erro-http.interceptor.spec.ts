import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../shared/services/toast.service';
import {
  erroHttpInterceptor,
  MENSAGEM_ERRO_INESPERADO,
  MENSAGEM_SEM_CONEXAO,
  SEM_TOAST_DE_ERRO,
} from './erro-http.interceptor';

describe('erroHttpInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  const toasts = { erro: vi.fn() };

  beforeEach(() => {
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroHttpInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toasts },
      ],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controle.verify());

  function falhar(
    status: number,
    opcoes: { contexto?: HttpContext; cabecalhos?: Record<string, string> } = {},
  ): unknown {
    let recebido: unknown;
    http.get('/x', { context: opcoes.contexto }).subscribe({ error: (erro: unknown) => (recebido = erro) });
    const requisicao = controle.expectOne('/x');
    if (status === 0) {
      requisicao.error(new ProgressEvent('error'));
    } else {
      requisicao.flush(null, { status, statusText: 'Erro', headers: opcoes.cabecalhos });
    }
    return recebido;
  }

  it('sem conexão: mostra o toast de rede e repassa o erro', () => {
    const erro = falhar(0);

    expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_SEM_CONEXAO);
    expect(erro).toBeDefined();
  });

  it.each([500, 503])('erro %i: mostra o toast de erro inesperado', (status) => {
    falhar(status);

    expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_ERRO_INESPERADO);
  });

  it('429 com Retry-After: informa os minutos de espera', () => {
    falhar(429, { cabecalhos: { 'Retry-After': '90' } });

    expect(toasts.erro).toHaveBeenCalledWith('Muitas tentativas. Aguarde 2 minutos e tente de novo.');
  });

  it('429 com Retry-After de exatamente 60 s: fala em 1 minuto', () => {
    falhar(429, { cabecalhos: { 'Retry-After': '60' } });

    expect(toasts.erro).toHaveBeenCalledWith('Muitas tentativas. Aguarde 1 minuto e tente de novo.');
  });

  it('429 com Retry-After abaixo de 60 s: fala em segundos, não em 1 minuto', () => {
    falhar(429, { cabecalhos: { 'Retry-After': '2' } });

    expect(toasts.erro).toHaveBeenCalledWith('Muitas tentativas. Aguarde alguns segundos e tente de novo.');
  });

  it('429 com Retry-After de 59 s: ainda fala em segundos', () => {
    falhar(429, { cabecalhos: { 'Retry-After': '59' } });

    expect(toasts.erro).toHaveBeenCalledWith('Muitas tentativas. Aguarde alguns segundos e tente de novo.');
  });

  it('429 sem Retry-After: usa a espera genérica', () => {
    falhar(429);

    expect(toasts.erro).toHaveBeenCalledWith('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
  });

  it.each([400, 401, 403, 404, 409, 422])('erro %i fica para a tela tratar, sem toast', (status) => {
    const erro = falhar(status);

    expect(toasts.erro).not.toHaveBeenCalled();
    expect(erro).toBeDefined();
  });

  it('respeita o pedido da tela para não mostrar toast', () => {
    falhar(500, { contexto: new HttpContext().set(SEM_TOAST_DE_ERRO, true) });

    expect(toasts.erro).not.toHaveBeenCalled();
  });
});
