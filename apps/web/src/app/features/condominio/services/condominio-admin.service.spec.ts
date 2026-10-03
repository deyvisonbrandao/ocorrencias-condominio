import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AtualizarCondominioRequisicao, CondominioAdmin } from '@ocorrencias/contratos';
import { SEM_TOAST_DE_ERRO } from '../../../core/interceptors/erro-http.interceptor';
import { CondominioAdminService } from './condominio-admin.service';

const CONDOMINIO: CondominioAdmin = { nome: 'Residencial Jardim', slug: 'jardim', cidade: 'Campinas', uf: 'SP' };

describe('CondominioAdminService', () => {
  let servico: CondominioAdminService;
  let controle: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(CondominioAdminService);
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controle.verify());

  it('obter busca GET /admin/condominio sem toast global (a tela mostra o erro)', () => {
    let recebido: CondominioAdmin | undefined;

    servico.obter().subscribe((condominio) => (recebido = condominio));
    const chamada = controle.expectOne({ method: 'GET', url: '/admin/condominio' });
    chamada.flush(CONDOMINIO);

    expect(chamada.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
    expect(recebido).toEqual(CONDOMINIO);
  });

  it('atualizar envia nome, cidade e UF (sem slug) por PUT e devolve o condomínio salvo', () => {
    const requisicao: AtualizarCondominioRequisicao = { nome: 'Jardim II', cidade: 'Campinas', uf: 'SP' };
    let recebido: CondominioAdmin | undefined;

    servico.atualizar(requisicao).subscribe((condominio) => (recebido = condominio));
    const chamada = controle.expectOne({ method: 'PUT', url: '/admin/condominio' });
    chamada.flush({ ...CONDOMINIO, nome: 'Jardim II' });

    expect(chamada.request.body).toEqual(requisicao);
    expect(chamada.request.context.get(SEM_TOAST_DE_ERRO)).toBe(false);
    expect(recebido?.nome).toBe('Jardim II');
  });
});
