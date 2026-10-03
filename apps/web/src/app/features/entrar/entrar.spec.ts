import { HttpContext, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CondominioPublico, LoginRequisicao, Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { Observable, of, throwError } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../../core/interceptors/erro-http.interceptor';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { SessaoService } from '../../core/services/sessao.service';
import { Entrar, MENSAGEM_SENHA_VAZIA } from './entrar';

@Component({ template: '<h1 tabindex="-1">Destino</h1>' })
class Destino {}

const JARDIM: CondominioPublico = { nome: 'Residencial Jardim', slug: 'jardim' };

function usuario(papel: Papel, senhaTemporaria = false): UsuarioSessao {
  return {
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    papel,
    status: 'ATIVO',
    senhaTemporaria,
    condominio: JARDIM,
  };
}

function erroHttp(status: number, corpo: unknown, headers?: HttpHeaders): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: corpo, headers });
}

describe('Entrar', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;
  const api = {
    buscarPorSlug: vi.fn<(slug: string, contexto?: HttpContext) => Observable<CondominioPublico>>(),
  };
  const sessao = {
    entrar: vi.fn<(requisicao: LoginRequisicao) => Observable<UsuarioSessao>>(),
    consumirAvisoDeExpiracao: vi.fn(() => false),
  };

  function campo(rotulo: string): HTMLInputElement {
    const label = [...raiz.querySelectorAll('label')].find(
      (item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim() === rotulo,
    );
    const entrada = label ? raiz.querySelector<HTMLInputElement>(`#${label.htmlFor}`) : null;
    if (!entrada) {
      throw new Error(`Campo não encontrado: ${rotulo}`);
    }
    return entrada;
  }

  function erroDe(entrada: HTMLElement): string | undefined {
    const id = (entrada.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .find((item) => item.endsWith('-erro'));
    return id ? raiz.querySelector(`#${id}`)?.textContent?.trim() : undefined;
  }

  const titulo = () => raiz.querySelector('h1')?.textContent?.trim();
  const alerta = () => raiz.querySelector('ui-alerta');

  async function esperar(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 0));
    await harness.fixture.whenStable();
  }

  async function abrir(url = '/c/jardim/entrar'): Promise<void> {
    await harness.navigateByUrl(url);
    await esperar();
  }

  function digitar(entrada: HTMLInputElement, valor: string): void {
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function entrarCom(telefone = '11912345678', senha = 'senha-de-teste'): Promise<void> {
    digitar(campo('Telefone (celular)'), telefone);
    digitar(campo('Senha'), senha);
    (raiz.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await esperar();
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset().mockReturnValue(of(JARDIM));
    sessao.entrar.mockReset();
    sessao.consumirAvisoDeExpiracao.mockReset().mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'c/:slug/entrar', component: Entrar },
          { path: '**', component: Destino },
        ]),
        { provide: CondominiosPublicoService, useValue: api },
        { provide: SessaoService, useValue: sessao },
      ],
    });
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
  });

  afterEach(() => raiz.remove());

  describe('condomínio', () => {
    it('mostra o h1, o nome do condomínio e o link para criar conta', async () => {
      await abrir();

      expect(api.buscarPorSlug).toHaveBeenCalledWith('jardim', expect.any(HttpContext));
      expect(api.buscarPorSlug.mock.calls[0][1]?.get(SEM_TOAST_DE_ERRO)).toBe(true);
      expect(titulo()).toBe('Entrar');
      expect(raiz.textContent).toContain('Residencial Jardim');
      expect(raiz.textContent).toContain('Esqueceu a senha? Peça à administração do condomínio para redefinir.');
      const criarConta = [...raiz.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Criar conta');
      expect(criarConta?.getAttribute('href')).toBe('/c/jardim/cadastro');
    });

    it('inexistente: mostra "Condomínio não encontrado" sem formulário', async () => {
      api.buscarPorSlug.mockReturnValue(
        throwError(() => erroHttp(404, { statusCode: 404, code: 'CONDOMINIO_NAO_ENCONTRADO', message: 'x' })),
      );

      await abrir('/c/sumido/entrar');

      expect(titulo()).toBe('Condomínio não encontrado');
      expect(raiz.textContent).toContain('Confira o link com a administração do seu condomínio.');
      expect(raiz.querySelector('form')).toBeNull();
      expect(raiz.querySelector('a[href="/"]')).not.toBeNull();
      expect(document.title).toContain('Condomínio não encontrado');
    });

    it('slug fora do formato: não consulta a API e mostra "não encontrado"', async () => {
      await abrir('/c/A_B/entrar');

      expect(api.buscarPorSlug).not.toHaveBeenCalled();
      expect(titulo()).toBe('Condomínio não encontrado');
    });

    it('falha ao carregar: mostra o erro com "Tentar de novo", que busca de novo', async () => {
      api.buscarPorSlug.mockReturnValueOnce(throwError(() => erroHttp(0, null)));
      await abrir();

      expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain(
        'Não foi possível carregar o condomínio.',
      );
      expect(raiz.querySelector('form')).toBeNull();

      (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
      await esperar();

      expect(api.buscarPorSlug).toHaveBeenCalledTimes(2);
      expect(raiz.querySelector('form')).not.toBeNull();
    });
  });

  describe('envio', () => {
    it.each<[Papel, string]>([
      ['SINDICO', '/admin/painel'],
      ['SUBSINDICO', '/admin/painel'],
      ['MORADOR', '/app/ocorrencias'],
    ])('%s entra e vai para %s', async (papel, destino) => {
      sessao.entrar.mockReturnValue(of(usuario(papel)));
      await abrir();

      await entrarCom('(11) 91234-5678', 'senha-de-teste');

      expect(sessao.entrar).toHaveBeenCalledWith({
        slug: 'jardim',
        telefone: '(11) 91234-5678',
        senha: 'senha-de-teste',
      });
      expect(TestBed.inject(Router).url).toBe(destino);
    });

    it('volta para a rota pedida quando o voltar é válido', async () => {
      sessao.entrar.mockReturnValue(of(usuario('MORADOR')));
      await abrir('/c/jardim/entrar?voltar=%2Fapp%2Fminhas');

      await entrarCom();

      expect(TestBed.inject(Router).url).toBe('/app/minhas');
    });

    it('ignora voltar externo', async () => {
      sessao.entrar.mockReturnValue(of(usuario('SINDICO')));
      await abrir('/c/jardim/entrar?voltar=%2F%2Fevil.com');

      await entrarCom();

      expect(TestBed.inject(Router).url).toBe('/admin/painel');
    });

    it('com senha temporária, vai para a troca de senha', async () => {
      sessao.entrar.mockReturnValue(of(usuario('MORADOR', true)));
      await abrir('/c/jardim/entrar?voltar=%2Fapp%2Fminhas');

      await entrarCom();

      expect(TestBed.inject(Router).url).toBe('/trocar-senha');
    });

    it('envio vazio: mostra os erros nos campos, foca o primeiro e não chama a API', async () => {
      await abrir();

      (raiz.querySelector('button[type="submit"]') as HTMLButtonElement).click();
      await esperar();

      expect(sessao.entrar).not.toHaveBeenCalled();
      expect(erroDe(campo('Telefone (celular)'))).toBe('Informe um celular com DDD, como (11) 91234-5678.');
      expect(erroDe(campo('Senha'))).toBe(MENSAGEM_SENHA_VAZIA);
      expect(document.activeElement).toBe(campo('Telefone (celular)'));
    });

    it('401: mostra "Telefone ou senha inválidos." no alerta, com foco, e mantém o que foi digitado', async () => {
      sessao.entrar.mockReturnValue(
        throwError(() =>
          erroHttp(401, { statusCode: 401, code: 'CREDENCIAIS_INVALIDAS', message: 'Telefone ou senha inválidos.' }),
        ),
      );
      await abrir();

      await entrarCom('11912345678', 'errada-123');

      expect(alerta()?.textContent?.trim()).toBe('Telefone ou senha inválidos.');
      expect(alerta()?.getAttribute('role')).toBe('alert');
      expect(document.activeElement).toBe(alerta());
      expect(campo('Senha').value).toBe('errada-123');
      expect(campo('Senha').disabled).toBe(false);
      expect(TestBed.inject(Router).url).toBe('/c/jardim/entrar');
    });

    it.each([
      ['CADASTRO_PENDENTE', 'Seu cadastro ainda aguarda aprovação da administração.'],
      ['CADASTRO_RECUSADO', 'Seu cadastro não foi aprovado. Fale com a administração do condomínio.'],
      ['ACESSO_INATIVO', 'Seu acesso está desativado. Fale com a administração do condomínio.'],
    ])('403 %s: mostra a mensagem da especificação', async (code, mensagem) => {
      sessao.entrar.mockReturnValue(
        throwError(() => erroHttp(403, { statusCode: 403, code, message: 'texto da API' })),
      );
      await abrir();

      await entrarCom();

      expect(alerta()?.textContent?.trim()).toBe(mensagem);
    });

    it('429 com Retry-After: mostra a espera no alerta', async () => {
      sessao.entrar.mockReturnValue(
        throwError(() => erroHttp(429, null, new HttpHeaders({ 'Retry-After': '300' }))),
      );
      await abrir();

      await entrarCom();

      expect(alerta()?.textContent?.trim()).toBe('Muitas tentativas. Aguarde 5 minutos e tente de novo.');
    });

    it('sem conexão: mostra o erro de rede no alerta', async () => {
      sessao.entrar.mockReturnValue(throwError(() => erroHttp(0, null)));
      await abrir();

      await entrarCom();

      expect(alerta()?.textContent?.trim()).toBe('Sem conexão. Verifique a internet e tente de novo.');
    });

    it('400 de validação: põe o erro no campo indicado', async () => {
      sessao.entrar.mockReturnValue(
        throwError(() =>
          erroHttp(400, {
            statusCode: 400,
            code: 'VALIDACAO_FALHOU',
            message: 'Dados inválidos.',
            details: [{ campo: 'senha', erros: ['A senha pode ter no máximo 128 caracteres.'] }],
          }),
        ),
      );
      await abrir();

      await entrarCom();

      expect(erroDe(campo('Senha'))).toBe('A senha pode ter no máximo 128 caracteres.');
      expect(alerta()).toBeNull();
    });
  });

  it('depois de a sessão expirar, avisa que é preciso entrar de novo', async () => {
    sessao.consumirAvisoDeExpiracao.mockReturnValue(true);

    await abrir('/c/jardim/entrar?voltar=%2Fadmin%2Fpainel');

    expect(alerta()?.textContent?.trim()).toBe('Sua sessão terminou. Entre de novo.');
  });
});
