import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContagemMoradores } from '@ocorrencias/contratos';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { ContagemMoradoresService } from './contagem-moradores.service';

const URL = '/admin/moradores/contagem';

function contagem(pendentes: number): ContagemMoradores {
  return { pendentes, ativos: 2, recusados: 1, inativos: 1 };
}

describe('ContagemMoradoresService', () => {
  let servico: ContagemMoradoresService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(ContagemMoradoresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('começa sem contagem e com zero pendentes', () => {
    expect(servico.contagem()).toBeNull();
    expect(servico.pendentes()).toBe(0);
  });

  it('recarregar busca a contagem sem toast global de erro', () => {
    servico.recarregar();
    const pedido = http.expectOne(URL);
    pedido.flush(contagem(3));

    expect(pedido.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
    expect(servico.contagem()).toEqual(contagem(3));
    expect(servico.pendentes()).toBe(3);
  });

  it('um novo recarregar descarta a resposta do pedido anterior', () => {
    servico.recarregar();
    const antigo = http.expectOne(URL);
    servico.recarregar();

    expect(antigo.cancelled).toBe(true);
    http.expectOne(URL).flush(contagem(1));
    expect(servico.pendentes()).toBe(1);
  });

  it('falha ao recarregar mantém o último valor conhecido', () => {
    servico.recarregar();
    http.expectOne(URL).flush(contagem(2));

    servico.recarregar();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Erro' });

    expect(servico.pendentes()).toBe(2);
  });

  it('limpar cancela o pedido em curso e zera a contagem', () => {
    servico.recarregar();
    http.expectOne(URL).flush(contagem(2));
    servico.recarregar();
    const emCurso = http.expectOne(URL);

    servico.limpar();

    expect(emCurso.cancelled).toBe(true);
    expect(servico.contagem()).toBeNull();
  });
});
