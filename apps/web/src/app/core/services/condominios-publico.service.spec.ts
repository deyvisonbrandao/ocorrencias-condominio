import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CadastrarCondominioRequisicao,
  CadastrarMoradorRequisicao,
  MoradorCadastrado,
} from '@ocorrencias/contratos';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { CondominiosPublicoService, DisponibilidadeSlug } from './condominios-publico.service';

describe('CondominiosPublicoService', () => {
  let servico: CondominiosPublicoService;
  let controle: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servico = TestBed.inject(CondominiosPublicoService);
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controle.verify());

  it('cadastrar envia o corpo para POST /public/condominios e devolve o criado', () => {
    const requisicao: CadastrarCondominioRequisicao = {
      nome: 'Jardim',
      slug: 'jardim',
      sindico: { nome: 'Ana', telefone: '(11) 91234-5678', senha: '12345678' },
    };
    let criado: unknown;

    servico.cadastrar(requisicao).subscribe((resposta) => (criado = resposta));
    const chamada = controle.expectOne({ method: 'POST', url: '/public/condominios' });
    chamada.flush({ id: '1', nome: 'Jardim', slug: 'jardim' });

    expect(chamada.request.body).toEqual(requisicao);
    expect(criado).toEqual({ id: '1', nome: 'Jardim', slug: 'jardim' });
  });

  it('cadastrarMorador envia o corpo para POST /public/condominios/:slug/moradores', () => {
    const requisicao: CadastrarMoradorRequisicao = {
      nome: 'João Pereira',
      telefone: '(11) 98765-4321',
      bloco: 'B',
      apto: '302',
      senha: '12345678',
    };
    const resposta: MoradorCadastrado = {
      nome: 'João Pereira',
      status: 'PENDENTE',
      condominio: { nome: 'Jardim', slug: 'jardim' },
    };
    let cadastrado: unknown;

    servico.cadastrarMorador('jardim', requisicao).subscribe((valor) => (cadastrado = valor));
    const chamada = controle.expectOne({
      method: 'POST',
      url: '/public/condominios/jardim/moradores',
    });
    chamada.flush(resposta);

    expect(chamada.request.body).toEqual(requisicao);
    expect(cadastrado).toEqual(resposta);
  });

  it('buscarPorSlug codifica o slug na URL', () => {
    servico.buscarPorSlug('a b').subscribe();

    controle
      .expectOne({ method: 'GET', url: '/public/condominios/a%20b' })
      .flush({ nome: 'A', slug: 'a-b' });
  });

  describe('disponibilidade', () => {
    function consultar(): {
      resultado: () => DisponibilidadeSlug | undefined;
      chamada: ReturnType<HttpTestingController['expectOne']>;
    } {
      let resultado: DisponibilidadeSlug | undefined;
      servico.disponibilidade('jardim').subscribe((valor) => (resultado = valor));
      return {
        resultado: () => resultado,
        chamada: controle.expectOne('/public/condominios/jardim/disponibilidade'),
      };
    }

    it('200 com disponível falso: o endereço está em uso', () => {
      const { resultado, chamada } = consultar();
      chamada.flush({ disponivel: false });

      expect(resultado()).toBe('em-uso');
    });

    it('200 com disponível verdadeiro: o endereço está disponível', () => {
      const { resultado, chamada } = consultar();
      chamada.flush({ disponivel: true });

      expect(resultado()).toBe('disponivel');
    });

    it.each([
      ['erro não esperado', 404, null],
      ['erro do servidor', 500, null],
    ])('%s: a disponibilidade fica desconhecida', (_caso, status, corpo) => {
      const { resultado, chamada } = consultar();
      chamada.flush(corpo, { status, statusText: 'Erro' });

      expect(resultado()).toBe('desconhecida');
    });

    it('falha de rede: desconhecida, sem toast global', () => {
      const { resultado, chamada } = consultar();
      chamada.error(new ProgressEvent('error'));

      expect(chamada.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
      expect(resultado()).toBe('desconhecida');
    });
  });

  it('erros de buscarPorSlug chegam a quem chamou', () => {
    let recebido: unknown;
    servico.buscarPorSlug('jardim').subscribe({ error: (erro: unknown) => (recebido = erro) });
    controle
      .expectOne('/public/condominios/jardim')
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(recebido).toBeInstanceOf(HttpErrorResponse);
  });
});
