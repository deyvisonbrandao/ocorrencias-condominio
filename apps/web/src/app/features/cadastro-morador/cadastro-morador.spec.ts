import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  CadastrarMoradorRequisicao,
  CondominioPublico,
  MoradorCadastrado,
} from '@ocorrencias/contratos';
import { Observable, of, Subject, throwError } from 'rxjs';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { ToastService } from '../../shared/services/toast.service';
import { CadastroMorador, MENSAGEM_TELEFONE_EM_USO } from './cadastro-morador';

@Component({ template: '<h1 tabindex="-1">Destino</h1>' })
class Destino {
  static estadoRecebido: unknown;

  constructor() {
    Destino.estadoRecebido = inject(Router).currentNavigation()?.extras.state;
  }
}

const JARDIM: CondominioPublico = { nome: 'Residencial Jardim', slug: 'jardim' };

const CADASTRADO: MoradorCadastrado = {
  nome: 'João Pereira',
  status: 'PENDENTE',
  condominio: JARDIM,
};

function erroApi(status: number, code: string, details?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { statusCode: status, code, message: 'Mensagem da API.', details },
  });
}

describe('CadastroMorador', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;
  const api = {
    buscarPorSlug: vi.fn<(slug: string, contexto?: HttpContext) => Observable<CondominioPublico>>(),
    cadastrarMorador:
      vi.fn<(slug: string, requisicao: CadastrarMoradorRequisicao) => Observable<MoradorCadastrado>>(),
  };
  const toasts = { erro: vi.fn<(mensagem: string) => void>() };

  function campo(rotulo: string): HTMLInputElement {
    const label = [...raiz.querySelectorAll('label')].find(
      (item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim().startsWith(rotulo),
    );
    const entrada = label ? raiz.querySelector<HTMLInputElement>(`#${label.htmlFor}`) : null;
    if (!entrada) {
      throw new Error(`Campo não encontrado: ${rotulo}`);
    }
    return entrada;
  }

  function descricao(entrada: HTMLElement, sufixo: '-erro' | '-dica'): HTMLElement | null {
    const id = (entrada.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .find((item) => item.endsWith(sufixo));
    return id ? raiz.querySelector<HTMLElement>(`#${id}`) : null;
  }

  const erroDe = (entrada: HTMLElement) =>
    descricao(entrada, '-erro')?.textContent?.replace(/\s+/g, ' ').trim();
  const titulo = () => raiz.querySelector('h1')?.textContent?.trim();
  const botaoEnviar = () => raiz.querySelector('button[type="submit"]') as HTMLButtonElement;

  async function esperar(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 0));
    await harness.fixture.whenStable();
  }

  async function abrir(url = '/c/jardim/cadastro'): Promise<void> {
    await harness.navigateByUrl(url);
    await esperar();
  }

  function digitar(entrada: HTMLInputElement, valor: string): void {
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const aceite = () => raiz.querySelector('input[type="checkbox"]') as HTMLInputElement;

  function preencher(dados: Partial<Record<string, string>> = {}, aceitar = true): void {
    if (aceitar && !aceite().checked) {
      aceite().click();
    }
    const valores = {
      'Nome completo': '  João Pereira ',
      'Telefone (celular)': '11987654321',
      Bloco: ' Bloco B ',
      Apartamento: 'apto 302',
      'E-mail': '',
      Senha: 'senha-forte',
      ...dados,
    };
    for (const [rotulo, valor] of Object.entries(valores)) {
      digitar(campo(rotulo), valor ?? '');
    }
  }

  async function enviar(): Promise<void> {
    botaoEnviar().click();
    await esperar();
  }

  beforeEach(async () => {
    api.buscarPorSlug.mockReset().mockReturnValue(of(JARDIM));
    api.cadastrarMorador.mockReset().mockReturnValue(of(CADASTRADO));
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'c/:slug/cadastro', title: 'Criar conta', component: CadastroMorador },
          { path: '**', component: Destino },
        ]),
        { provide: CondominiosPublicoService, useValue: api },
        { provide: ToastService, useValue: toasts },
      ],
    });
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
  });

  afterEach(() => raiz.remove());

  describe('tela', () => {
    it('mostra o h1, o nome do condomínio e os campos com dicas', async () => {
      await abrir();

      expect(titulo()).toBe('Criar conta');
      expect(document.title).toBe('Criar conta · Residencial Jardim');
      expect(raiz.textContent).toContain('Residencial Jardim');
      expect(descricao(campo('E-mail'), '-dica')?.textContent).toBe('Só para contato da administração.');
      expect(raiz.querySelector('label[for="' + campo('E-mail').id + '"]')?.textContent).toContain(
        '(opcional)',
      );
      expect(descricao(campo('Senha'), '-dica')?.textContent).toBe('Mínimo de 8 caracteres.');
      expect(campo('Senha').type).toBe('password');
      expect(raiz.querySelector('button[aria-label="Mostrar senha"]')).not.toBeNull();
      expect(botaoEnviar().textContent?.trim()).toBe('Enviar cadastro');
    });

    it('telefone com teclado de telefone, autocomplete nacional e máscara', async () => {
      await abrir();
      const telefone = campo('Telefone (celular)');

      digitar(telefone, '11912345678');

      expect(telefone.getAttribute('inputmode')).toBe('tel');
      expect(telefone.getAttribute('autocomplete')).toBe('tel-national');
      expect(telefone.value).toBe('(11) 91234-5678');
    });

    it('inexistente: "Condomínio não encontrado" sem formulário', async () => {
      api.buscarPorSlug.mockReturnValue(
        throwError(() => erroApi(404, 'CONDOMINIO_NAO_ENCONTRADO')),
      );

      await abrir('/c/sumido/cadastro');

      expect(titulo()).toBe('Condomínio não encontrado');
      expect(raiz.querySelector('form')).toBeNull();
      expect(raiz.querySelector('a[href="/"]')).not.toBeNull();
    });

    it('falha de carga: estado de erro com "Tentar de novo"', async () => {
      api.buscarPorSlug.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

      await abrir();
      expect(raiz.querySelector('form')).toBeNull();

      (raiz.querySelector('ui-estado-erro button') as HTMLButtonElement).click();
      await esperar();

      expect(raiz.querySelector('form')).not.toBeNull();
    });
  });

  describe('validação no cliente', () => {
    it('envio vazio: mostra as mensagens, foca o primeiro campo inválido e não chama a API', async () => {
      await abrir();

      await enviar();

      expect(erroDe(campo('Nome completo'))).toBe('Informe seu nome.');
      expect(erroDe(campo('Telefone (celular)'))).toBe(
        'Informe um celular com DDD, como (11) 91234-5678.',
      );
      expect(erroDe(campo('Bloco'))).toBe('Informe o bloco.');
      expect(erroDe(campo('Apartamento'))).toBe('Informe o apartamento.');
      expect(erroDe(campo('E-mail'))).toBeUndefined();
      expect(erroDe(campo('Senha'))).toBe('A senha precisa ter pelo menos 8 caracteres.');
      expect(erroDe(aceite())).toBe(
        'Para continuar, aceite os termos de uso e a política de privacidade.',
      );
      expect(campo('Nome completo').getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(campo('Nome completo'));
      expect(api.cadastrarMorador).not.toHaveBeenCalled();
    });

    it('sem o aceite dos termos: mostra o erro no aceite, foca nele e não chama a API', async () => {
      await abrir();
      preencher({}, false);

      await enviar();

      expect(erroDe(aceite())).toBe(
        'Para continuar, aceite os termos de uso e a política de privacidade.',
      );
      expect(aceite().getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(aceite());
      expect(api.cadastrarMorador).not.toHaveBeenCalled();
    });

    it('o aceite traz os links dos termos e da política, abrindo em nova aba', async () => {
      await abrir();

      const links = [...raiz.querySelectorAll<HTMLAnchorElement>('ui-caixa-selecao a')];

      expect(links.map((link) => link.getAttribute('href'))).toEqual(['/termos', '/privacidade']);
      expect(links.every((link) => link.target === '_blank')).toBe(true);
      expect(links.every((link) => link.textContent?.includes('(abre em nova aba)'))).toBe(true);
    });

    it('e-mail preenchido precisa ter formato válido', async () => {
      await abrir();
      preencher({ 'E-mail': 'joao@' });

      await enviar();

      expect(erroDe(campo('E-mail'))).toBe('Confira o e-mail.');
      expect(document.activeElement).toBe(campo('E-mail'));
      expect(api.cadastrarMorador).not.toHaveBeenCalled();
    });

    it('bloco e apto: o limite vale sobre o valor sem o prefixo digitado', async () => {
      await abrir();
      preencher({ Bloco: `Bloco ${'A'.repeat(20)}`, Apartamento: `Apto ${'1'.repeat(10)}` });

      await enviar();

      expect(api.cadastrarMorador).toHaveBeenCalledTimes(1);
      expect(api.cadastrarMorador.mock.calls[0][1]).toMatchObject({
        bloco: `Bloco ${'A'.repeat(20)}`,
        apto: `Apto ${'1'.repeat(10)}`,
      });
    });

    it('bloco e apto acima do limite normalizado mostram o erro no campo', async () => {
      await abrir();
      preencher({ Bloco: 'A'.repeat(21), Apartamento: '1'.repeat(11) });

      await enviar();

      expect(erroDe(campo('Bloco'))).toBe('Use no máximo 20 caracteres.');
      expect(erroDe(campo('Apartamento'))).toBe('Use no máximo 10 caracteres.');
      expect(api.cadastrarMorador).not.toHaveBeenCalled();
    });
  });

  describe('envio', () => {
    it('sucesso: envia os dados aparados, sem e-mail vazio, e vai para aguardando aprovação', async () => {
      await abrir();
      preencher();

      await enviar();

      expect(api.cadastrarMorador).toHaveBeenCalledWith('jardim', {
        nome: 'João Pereira',
        telefone: '(11) 98765-4321',
        bloco: 'Bloco B',
        apto: 'apto 302',
        senha: 'senha-forte',
      });
      expect(TestBed.inject(Router).url).toBe('/c/jardim/aguardando-aprovacao');
    });

    it('sucesso: leva o condomínio da resposta no state da navegação', async () => {
      Destino.estadoRecebido = undefined;
      api.cadastrarMorador.mockReturnValue(
        of({ ...CADASTRADO, condominio: { nome: 'Jardim (resposta)', slug: 'jardim' } }),
      );
      await abrir();
      preencher();

      await enviar();

      expect(Destino.estadoRecebido).toEqual({
        condominio: { nome: 'Jardim (resposta)', slug: 'jardim' },
      });
    });

    it('envia o e-mail quando preenchido', async () => {
      await abrir();
      preencher({ 'E-mail': ' joao@exemplo.com ' });

      await enviar();

      expect(api.cadastrarMorador.mock.calls[0][1].email).toBe('joao@exemplo.com');
    });

    it('enquanto envia, bloqueia o segundo envio e desabilita os campos', async () => {
      const resposta = new Subject<MoradorCadastrado>();
      api.cadastrarMorador.mockReturnValue(resposta);
      await abrir();
      preencher();

      await enviar();
      await enviar();

      expect(api.cadastrarMorador).toHaveBeenCalledTimes(1);
      expect(campo('Nome completo').disabled).toBe(true);
      expect(botaoEnviar().getAttribute('aria-busy')).toBe('true');
      expect(botaoEnviar().textContent).toContain('Enviando cadastro…');
    });

    it('409 de telefone: mensagem no campo com link para entrar e foco no telefone', async () => {
      api.cadastrarMorador.mockReturnValue(
        throwError(() => erroApi(409, 'TELEFONE_EM_USO', { campo: 'telefone' })),
      );
      await abrir();
      preencher();

      await enviar();

      const telefone = campo('Telefone (celular)');
      expect(erroDe(telefone)).toBe(`${MENSAGEM_TELEFONE_EM_USO} Entrar`);
      expect(descricao(telefone, '-erro')?.querySelector('a')?.getAttribute('href')).toBe(
        '/c/jardim/entrar',
      );
      expect(document.activeElement).toBe(telefone);
      expect(telefone.disabled).toBe(false);
    });

    it('409 de telefone: ao editar o telefone, a mensagem e o link somem', async () => {
      api.cadastrarMorador.mockReturnValue(
        throwError(() => erroApi(409, 'TELEFONE_EM_USO', { campo: 'telefone' })),
      );
      await abrir();
      preencher();
      await enviar();

      digitar(campo('Telefone (celular)'), '11912345678');
      await esperar();

      expect(erroDe(campo('Telefone (celular)'))).toBeUndefined();
      expect(raiz.querySelector('form a[href="/c/jardim/entrar"]')).toBeNull();
    });

    it('400 de validação: mostra a mensagem da API no campo indicado', async () => {
      api.cadastrarMorador.mockReturnValue(
        throwError(() =>
          erroApi(400, 'VALIDACAO_FALHOU', [{ campo: 'bloco', erros: ['Use no máximo 20 caracteres.'] }]),
        ),
      );
      await abrir();
      preencher();

      await enviar();

      expect(erroDe(campo('Bloco'))).toBe('Use no máximo 20 caracteres.');
      expect(document.activeElement).toBe(campo('Bloco'));
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('404 no envio: o condomínio saiu do ar e a tela vira "não encontrado"', async () => {
      api.cadastrarMorador.mockReturnValue(throwError(() => erroApi(404, 'CONDOMINIO_NAO_ENCONTRADO')));
      await abrir();
      preencher();
      api.buscarPorSlug.mockReturnValue(throwError(() => erroApi(404, 'CONDOMINIO_NAO_ENCONTRADO')));

      await enviar();

      expect(titulo()).toBe('Condomínio não encontrado');
      expect(raiz.querySelector('form')).toBeNull();
    });

    it('429 ou rede: o toast fica com o interceptor, os dados ficam e o foco volta ao botão', async () => {
      api.cadastrarMorador.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 429, error: { statusCode: 429 } })),
      );
      await abrir();
      preencher();

      await enviar();

      expect(toasts.erro).not.toHaveBeenCalled();
      expect(campo('Nome completo').value).toBe('  João Pereira ');
      expect(document.activeElement).toBe(botaoEnviar());
    });

    it('erro sem campo: mostra a mensagem da API em toast', async () => {
      api.cadastrarMorador.mockReturnValue(throwError(() => erroApi(403, 'PROIBIDO')));
      await abrir();
      preencher();

      await enviar();

      expect(toasts.erro).toHaveBeenCalledWith('Mensagem da API.');
      expect(document.activeElement).toBe(botaoEnviar());
    });
  });
});
