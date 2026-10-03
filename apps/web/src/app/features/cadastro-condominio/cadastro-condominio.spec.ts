import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CadastrarCondominioRequisicao, CondominioCriado } from '@ocorrencias/contratos';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  CondominiosPublicoService,
  DisponibilidadeSlug,
} from '../../core/services/condominios-publico.service';
import { UltimoCondominio } from '../../core/services/ultimo-condominio';
import { ToastService } from '../../shared/services/toast.service';
import { CadastroCondominio } from './cadastro-condominio';
import { ESPERA_VERIFICACAO_SLUG } from './services/verificacao-slug';

function erroHttp(status: number, corpo: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: corpo });
}

describe('CadastroCondominio', () => {
  let fixture: ComponentFixture<CadastroCondominio>;
  let raiz: HTMLElement;
  const api = {
    cadastrar: vi.fn<(requisicao: CadastrarCondominioRequisicao) => Observable<CondominioCriado>>(),
    disponibilidade: vi.fn<(slug: string) => Observable<DisponibilidadeSlug>>(),
  };
  const toasts = { erro: vi.fn() };

  function campo(rotulo: string): HTMLInputElement {
    const label = [...raiz.querySelectorAll('label')].find((item) => {
      const textoDoRotulo = (item.textContent ?? '').replace(/\s+/g, ' ').trim();
      return textoDoRotulo === rotulo || textoDoRotulo.startsWith(`${rotulo} (`);
    });
    const entrada = label ? raiz.querySelector<HTMLInputElement>(`#${label.htmlFor}`) : null;
    if (!entrada) {
      throw new Error(`Campo não encontrado: ${rotulo}`);
    }
    return entrada;
  }

  function erroDe(entrada: HTMLElement): string | undefined {
    const ids = (entrada.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter((id) => id.endsWith('-erro'));
    return ids.length ? raiz.querySelector(`#${ids[0]}`)?.textContent?.trim() : undefined;
  }

  const caixaDeAceite = () => raiz.querySelector('input[type="checkbox"]') as HTMLInputElement;
  const botaoEnviar = () => raiz.querySelector('button[type="submit"]') as HTMLButtonElement;
  const anuncioDoSlug = () =>
    raiz.querySelector('form > fieldset > [aria-live="polite"]')?.textContent?.trim();

  async function esperar(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 0));
    await fixture.whenStable();
  }

  function digitar(entrada: HTMLInputElement, valor: string): void {
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function preencherValido(): Promise<void> {
    digitar(campo('Nome do condomínio'), 'Residencial Jardim das Flores');
    digitar(campo('Nome'), 'Ana Lima');
    digitar(campo('Telefone (celular)'), '11912345678');
    digitar(campo('Senha'), 'senha-forte');
    caixaDeAceite().click();
    await esperar();
  }

  async function enviar(): Promise<void> {
    botaoEnviar().click();
    await esperar();
  }

  beforeEach(async () => {
    api.cadastrar.mockReset();
    api.disponibilidade.mockReset().mockReturnValue(of('disponivel'));
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CondominiosPublicoService, useValue: api },
        { provide: ToastService, useValue: toasts },
        { provide: ESPERA_VERIFICACAO_SLUG, useValue: 0 },
      ],
    });
    fixture = TestBed.createComponent(CadastroCondominio);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  describe('endereço do link', () => {
    it('é derivado do nome até ser editado à mão', async () => {
      digitar(campo('Nome do condomínio'), 'Edifício São João');
      await esperar();
      expect(campo('Endereço do link').value).toBe('edificio-sao-joao');
      expect(raiz.textContent).toContain('/c/edificio-sao-joao');

      digitar(campo('Endereço do link'), 'sao-joao');
      digitar(campo('Nome do condomínio'), 'Edifício São João II');
      await esperar();
      expect(campo('Endereço do link').value).toBe('sao-joao');
    });

    it('volta a seguir o nome quando o endereço é apagado', async () => {
      digitar(campo('Endereço do link'), 'manual');
      digitar(campo('Endereço do link'), '');
      digitar(campo('Nome do condomínio'), 'Torre Azul');
      await esperar();

      expect(campo('Endereço do link').value).toBe('torre-azul');
    });

    it('disponível: mostra a confirmação e anuncia uma vez o resultado', async () => {
      digitar(campo('Endereço do link'), 'jardim');
      await esperar();

      expect(api.disponibilidade).toHaveBeenCalledWith('jardim');
      expect(raiz.textContent).toContain('Disponível');
      expect(anuncioDoSlug()).toBe('Endereço do link disponível.');
      expect(erroDe(campo('Endereço do link'))).toBeUndefined();
    });

    it('enquanto verifica, mostra "Verificando…" sem anunciar', async () => {
      api.disponibilidade.mockReturnValue(new Subject<DisponibilidadeSlug>());

      digitar(campo('Endereço do link'), 'jardim');
      await esperar();

      expect(raiz.textContent).toContain('Verificando…');
      expect(anuncioDoSlug()).toBe('');
    });

    it('em uso: erro no campo e anúncio', async () => {
      api.disponibilidade.mockReturnValue(of('em-uso'));

      digitar(campo('Endereço do link'), 'jardim');
      await esperar();

      expect(erroDe(campo('Endereço do link'))).toBe('Endereço já em uso. Tente outro.');
      expect(anuncioDoSlug()).toBe('Endereço já em uso. Tente outro.');
    });
  });

  describe('validação no cliente', () => {
    it('envio vazio: mostra as mensagens, foca o primeiro campo inválido e não chama a API', async () => {
      await enviar();

      expect(api.cadastrar).not.toHaveBeenCalled();
      expect(erroDe(campo('Nome do condomínio'))).toBe('Informe o nome do condomínio.');
      expect(erroDe(campo('Endereço do link'))).toBe('Informe o endereço do link.');
      expect(erroDe(campo('Nome'))).toBe('Informe seu nome.');
      expect(erroDe(campo('Telefone (celular)'))).toBe(
        'Informe um celular com DDD, como (11) 91234-5678.',
      );
      expect(erroDe(campo('Senha'))).toBe('A senha precisa ter pelo menos 8 caracteres.');
      expect(erroDe(caixaDeAceite())).toBe(
        'Para continuar, aceite os termos de uso e a política de privacidade.',
      );
      expect(erroDe(campo('E-mail'))).toBeUndefined();
      expect(document.activeElement).toBe(campo('Nome do condomínio'));
    });

    it('e-mail preenchido com formato inválido bloqueia o envio', async () => {
      await preencherValido();
      digitar(campo('E-mail'), 'ana@');

      await enviar();

      expect(api.cadastrar).not.toHaveBeenCalled();
      expect(erroDe(campo('E-mail'))).toBe('Confira o e-mail.');
      expect(document.activeElement).toBe(campo('E-mail'));
    });

    it('sem o aceite dos termos, não envia', async () => {
      await preencherValido();
      caixaDeAceite().click();

      await enviar();

      expect(api.cadastrar).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(caixaDeAceite());
    });
  });

  describe('envio', () => {
    it('sucesso: troca para a confirmação com o link absoluto e foco no título', async () => {
      api.cadastrar.mockReturnValue(
        of({
          id: '1',
          nome: 'Residencial Jardim das Flores',
          slug: 'residencial-jardim-das-flores',
        }),
      );
      await preencherValido();

      await enviar();

      expect(api.cadastrar).toHaveBeenCalledWith({
        nome: 'Residencial Jardim das Flores',
        slug: 'residencial-jardim-das-flores',
        sindico: { nome: 'Ana Lima', telefone: '(11) 91234-5678', senha: 'senha-forte' },
      });
      const titulo = raiz.querySelector('h1');
      expect(titulo?.textContent?.trim()).toBe('Condomínio criado');
      expect(document.activeElement).toBe(titulo);
      expect(raiz.textContent).toContain(`${location.origin}/c/residencial-jardim-das-flores`);
      expect(raiz.querySelector('ui-copiar')).not.toBeNull();
      expect(raiz.querySelector('a[href="/admin/painel"]')?.textContent?.trim()).toBe(
        'Ir para o painel',
      );
      expect(document.title).toContain('Condomínio criado');
    });

    it('sucesso: lembra o condomínio criado para o "Ir para o painel" chegar ao login certo', async () => {
      const ultimo = TestBed.inject(UltimoCondominio);
      const gravar = vi.spyOn(ultimo, 'gravar').mockImplementation(() => undefined);
      api.cadastrar.mockReturnValue(of({ id: '1', nome: 'Jardim', slug: 'jardim-novo' }));
      await preencherValido();

      await enviar();

      expect(gravar).toHaveBeenCalledWith('jardim-novo');
    });

    it('erro no envio não troca o condomínio lembrado', async () => {
      const gravar = vi.spyOn(TestBed.inject(UltimoCondominio), 'gravar');
      api.cadastrar.mockReturnValue(throwError(() => erroHttp(0, null)));
      await preencherValido();

      await enviar();

      expect(gravar).not.toHaveBeenCalled();
    });

    it('envia o e-mail aparado quando informado', async () => {
      api.cadastrar.mockReturnValue(of({ id: '1', nome: 'X', slug: 'x-y-z' }));
      await preencherValido();
      digitar(campo('E-mail'), ' ana@exemplo.com ');

      await enviar();

      expect(api.cadastrar.mock.calls[0][0].sindico.email).toBe('ana@exemplo.com');
    });

    it('enquanto envia, o botão fica em carregamento e o formulário desabilitado', async () => {
      const resposta = new Subject<CondominioCriado>();
      api.cadastrar.mockReturnValue(resposta);
      await preencherValido();

      await enviar();

      expect(botaoEnviar().getAttribute('aria-busy')).toBe('true');
      expect(botaoEnviar().textContent).toContain('Criando condomínio…');
      expect(campo('Nome do condomínio').disabled).toBe(true);

      botaoEnviar().click();
      expect(api.cadastrar).toHaveBeenCalledTimes(1);
    });

    it('409 de endereço em uso: erro no campo do slug, com foco nele; editar limpa o erro', async () => {
      api.cadastrar.mockReturnValue(
        throwError(() =>
          erroHttp(409, {
            statusCode: 409,
            code: 'SLUG_EM_USO',
            message: 'Endereço já em uso. Tente outro.',
            details: { campo: 'slug' },
          }),
        ),
      );
      await preencherValido();

      await enviar();

      const slug = campo('Endereço do link');
      expect(erroDe(slug)).toBe('Endereço já em uso. Tente outro.');
      expect(document.activeElement).toBe(slug);
      expect(slug.disabled).toBe(false);
      expect(anuncioDoSlug()).toBe('');
      expect(raiz.textContent).not.toContain('Disponível');

      digitar(slug, 'residencial-jardim-2');
      await esperar();
      expect(erroDe(slug)).toBeUndefined();
      expect(anuncioDoSlug()).toBe('Endereço do link disponível.');
    });

    it('400 de validação: mapeia o campo aninhado para o campo do formulário', async () => {
      api.cadastrar.mockReturnValue(
        throwError(() =>
          erroHttp(400, {
            statusCode: 400,
            code: 'VALIDACAO_FALHOU',
            message: 'Os dados enviados são inválidos.',
            details: [
              {
                campo: 'sindico.telefone',
                erros: ['Informe um celular com DDD, como (11) 91234-5678.'],
              },
            ],
          }),
        ),
      );
      await preencherValido();

      await enviar();

      const telefone = campo('Telefone (celular)');
      expect(erroDe(telefone)).toBe('Informe um celular com DDD, como (11) 91234-5678.');
      expect(document.activeElement).toBe(telefone);
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('erro de rede: mantém o que foi digitado, sem erro de campo, e devolve o foco ao botão', async () => {
      api.cadastrar.mockReturnValue(throwError(() => erroHttp(0, null)));
      await preencherValido();

      await enviar();

      expect(campo('Nome do condomínio').value).toBe('Residencial Jardim das Flores');
      expect(campo('Nome do condomínio').disabled).toBe(false);
      expect(raiz.querySelector('form [aria-invalid="true"]')).toBeNull();
      expect(toasts.erro).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(botaoEnviar());
    });

    it('erro 4xx sem campo: mostra a mensagem da API em toast', async () => {
      api.cadastrar.mockReturnValue(
        throwError(() =>
          erroHttp(400, {
            statusCode: 400,
            code: 'VALIDACAO_FALHOU',
            message: 'Os dados enviados são inválidos.',
            details: [{ campo: 'sindico', erros: ['Informe os dados do síndico.'] }],
          }),
        ),
      );
      await preencherValido();

      await enviar();

      expect(toasts.erro).toHaveBeenCalledWith('Os dados enviados são inválidos.');
    });
  });
});
