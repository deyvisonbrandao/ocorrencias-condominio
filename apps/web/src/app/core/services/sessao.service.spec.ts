import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UsuarioSessao } from '@ocorrencias/contratos';
import { MENSAGEM_SEM_CONEXAO, SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';
import { SessaoService, SONDAGEM_DE_SESSAO } from './sessao.service';
import { UltimoCondominio } from './ultimo-condominio';

const SINDICO: UsuarioSessao = {
  nome: 'Ana Lima',
  telefone: '+5511912345678',
  papel: 'SINDICO',
  status: 'ATIVO',
  senhaTemporaria: false,
  condominio: { nome: 'Residencial Jardim', slug: 'jardim' },
};

describe('SessaoService', () => {
  let sessao: SessaoService;
  let controle: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  const ultimo = { ler: vi.fn<() => string | null>(), gravar: vi.fn<(slug: string) => void>() };

  beforeEach(() => {
    ultimo.ler.mockReset().mockReturnValue(null);
    ultimo.gravar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UltimoCondominio, useValue: ultimo },
      ],
    });
    sessao = TestBed.inject(SessaoService);
    controle = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => controle.verify());

  function carregar(): (UsuarioSessao | null)[] {
    const recebidos: (UsuarioSessao | null)[] = [];
    sessao.carregar().subscribe((usuario) => recebidos.push(usuario));
    return recebidos;
  }

  describe('carregar', () => {
    it('busca GET /me uma vez só, mesmo com chamadas simultâneas, e guarda o usuário', () => {
      const primeira = carregar();
      const segunda = carregar();
      const requisicao = controle.expectOne({ method: 'GET', url: '/me' });
      expect(requisicao.request.context.get(SONDAGEM_DE_SESSAO)).toBe(true);
      requisicao.flush(SINDICO);

      expect(primeira).toEqual([SINDICO]);
      expect(segunda).toEqual([SINDICO]);
      expect(sessao.usuario()).toEqual(SINDICO);
      expect(ultimo.gravar).toHaveBeenCalledWith('jardim');

      expect(carregar()).toEqual([SINDICO]);
      controle.expectNone('/me');
    });

    it('401: fica sem sessão e não pergunta de novo', () => {
      const recebidos = carregar();
      controle.expectOne('/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(recebidos).toEqual([null]);
      expect(sessao.usuario()).toBeNull();
      expect(carregar()).toEqual([null]);
      controle.expectNone('/me');
    });

    it.each([
      ['rede', 0],
      ['500', 500],
    ])('falha de %s: não vira "sem sessão", propaga o erro e tenta de novo na próxima vez', (_nome, status) => {
      const recebidos: (UsuarioSessao | null)[] = [];
      let erro: unknown;
      sessao.carregar().subscribe({ next: (usuario) => recebidos.push(usuario), error: (e: unknown) => (erro = e) });
      const requisicao = controle.expectOne('/me');
      if (status === 0) {
        requisicao.error(new ProgressEvent('error'));
      } else {
        requisicao.flush(null, { status, statusText: 'Erro' });
      }

      expect(recebidos).toEqual([]);
      expect(erro).toBeDefined();
      expect(sessao.usuario()).toBeNull();
      carregar();
      controle.expectOne('/me').flush(SINDICO);
      expect(sessao.usuario()).toEqual(SINDICO);
    });

    it('invalidar descarta o usuário em cache e a próxima carga pergunta de novo', () => {
      carregar();
      controle.expectOne('/me').flush(SINDICO);

      sessao.invalidar();

      expect(sessao.usuario()).toBeNull();
      expect(carregar()).toEqual([]);
      controle.expectOne('/me').flush({ ...SINDICO, papel: 'MORADOR' });
      expect(sessao.usuario()?.papel).toBe('MORADOR');
    });
  });

  it('entrar envia as credenciais sem toast global e abre a sessão', () => {
    let recebido: UsuarioSessao | undefined;
    sessao
      .entrar({ slug: 'jardim', telefone: '(11) 91234-5678', senha: 'segredo123' })
      .subscribe((usuario) => (recebido = usuario));

    const requisicao = controle.expectOne({ method: 'POST', url: '/auth/login' });
    expect(requisicao.request.body).toEqual({
      slug: 'jardim',
      telefone: '(11) 91234-5678',
      senha: 'segredo123',
    });
    expect(requisicao.request.context.get(SEM_TOAST_DE_ERRO)).toBe(true);
    expect(requisicao.request.context.get(SONDAGEM_DE_SESSAO)).toBe(true);
    requisicao.flush(SINDICO);

    expect(recebido).toEqual(SINDICO);
    expect(sessao.usuario()).toEqual(SINDICO);
    expect(ultimo.gravar).toHaveBeenCalledWith('jardim');
  });

  it('entrar com erro não abre sessão', () => {
    sessao.entrar({ slug: 'jardim', telefone: 'x', senha: 'y' }).subscribe({ error: () => undefined });
    controle.expectOne('/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(sessao.usuario()).toBeNull();
  });

  describe('sair', () => {
    function entrarComo(usuario: UsuarioSessao): void {
      sessao.entrar({ slug: usuario.condominio.slug, telefone: 'x', senha: 'y' }).subscribe();
      controle.expectOne('/auth/login').flush(usuario);
    }

    it('apaga a sessão e volta para o login do condomínio da sessão', () => {
      entrarComo(SINDICO);

      sessao.sair();
      expect(sessao.saindo()).toBe(true);
      const requisicao = controle.expectOne({ method: 'POST', url: '/auth/logout' });
      expect(requisicao.request.body).toBeNull();
      requisicao.flush(null, { status: 204, statusText: 'No Content' });

      expect(sessao.saindo()).toBe(false);
      expect(sessao.usuario()).toBeNull();
      const destino = navegar.mock.calls[0][0];
      expect(TestBed.inject(Router).serializeUrl(destino)).toBe('/c/jardim/entrar');
    });

    it('ignora o clique duplo enquanto sai', () => {
      entrarComo(SINDICO);

      sessao.sair();
      sessao.sair();

      controle.expectOne('/auth/logout').flush(null);
    });

    it('falha de rede: mantém a sessão e expõe a mensagem para o diálogo', () => {
      entrarComo(SINDICO);

      sessao.sair();
      controle.expectOne('/auth/logout').error(new ProgressEvent('error'));

      expect(sessao.usuario()).toEqual(SINDICO);
      expect(sessao.erroAoSair()).toBe(MENSAGEM_SEM_CONEXAO);
      expect(navegar).not.toHaveBeenCalled();

      sessao.descartarErroAoSair();
      expect(sessao.erroAoSair()).toBeNull();
    });
  });

  it('expirar limpa a sessão e deixa um aviso que só é lido uma vez', () => {
    carregar();
    controle.expectOne('/me').flush(SINDICO);

    sessao.expirar();

    expect(sessao.usuario()).toBeNull();
    expect(sessao.consumirAvisoDeExpiracao()).toBe(true);
    expect(sessao.consumirAvisoDeExpiracao()).toBe(false);
  });
});
