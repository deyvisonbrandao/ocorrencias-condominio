import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controle.verify());

  it.each([
    ['ocorrencias', '/api/v1/ocorrencias'],
    ['/ocorrencias?escopo=minhas', '/api/v1/ocorrencias?escopo=minhas'],
    ['/api/v1/me', '/api/v1/me'],
  ])('envia "%s" para "%s" com cookie de sessão', (url, esperado) => {
    http.get(url).subscribe();

    const requisicao = controle.expectOne(esperado);
    expect(requisicao.request.withCredentials).toBe(true);
    requisicao.flush({});
  });

  it('não altera URL absoluta nem envia credenciais para outro domínio', () => {
    http.get('https://exemplo.com/recurso').subscribe();

    const requisicao = controle.expectOne('https://exemplo.com/recurso');
    expect(requisicao.request.withCredentials).toBe(false);
    requisicao.flush({});
  });
});
