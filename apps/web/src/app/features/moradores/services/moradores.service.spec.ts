import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SEM_TOAST_DE_ERRO } from '../../../core/interceptors/erro-http.interceptor';
import { MoradoresService } from './moradores.service';

describe('MoradoresService', () => {
  let servico: MoradoresService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(MoradoresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista pelos status da aba, separados por vírgula, sem toast global', () => {
    servico.listar({ status: ['RECUSADO', 'INATIVO'] }).subscribe();

    const pedido = http.expectOne((r) => r.url === '/admin/moradores');
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('status')).toBe('RECUSADO,INATIVO');
    expect(pedido.request.params.has('q')).toBe(false);
    expect(pedido.request.params.has('cursor')).toBe(false);
    expect(pedido.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
    pedido.flush({ itens: [], proximoCursor: null });
  });

  it('envia a busca aparada e o cursor quando existem', () => {
    servico.listar({ status: ['ATIVO'], q: '  bloco b ', cursor: 'abc' }).subscribe();

    const pedido = http.expectOne((r) => r.url === '/admin/moradores');
    expect(pedido.request.params.get('q')).toBe('bloco b');
    expect(pedido.request.params.get('cursor')).toBe('abc');
    pedido.flush({ itens: [], proximoCursor: null });
  });

  it('busca só com espaços não vira parâmetro', () => {
    servico.listar({ status: ['ATIVO'], q: '   ' }).subscribe();

    const pedido = http.expectOne((r) => r.url === '/admin/moradores');
    expect(pedido.request.params.has('q')).toBe(false);
    pedido.flush({ itens: [], proximoCursor: null });
  });

  it.each(['aprovar', 'inativar', 'reativar'] as const)('%s faz POST na rota da ação, sem corpo', (acao) => {
    servico.executar(acao, 'id/1').subscribe();

    const pedido = http.expectOne(`/admin/moradores/id%2F1/${acao}`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toBeNull();
    expect(pedido.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
    pedido.flush({});
  });

  it('recusar envia o motivo no corpo', () => {
    servico.recusar('m1', 'Apartamento não existe.').subscribe();

    const pedido = http.expectOne('/admin/moradores/m1/recusar');
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ motivo: 'Apartamento não existe.' });
    expect(pedido.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
    pedido.flush({});
  });
});
