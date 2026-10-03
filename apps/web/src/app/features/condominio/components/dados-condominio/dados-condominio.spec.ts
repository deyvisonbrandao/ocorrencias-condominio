import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AtualizarCondominioRequisicao, CondominioAdmin } from '@ocorrencias/contratos';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { CondominioAdminService } from '../../services/condominio-admin.service';
import { DadosCondominio, DICA_ENDERECO, MENSAGEM_DADOS_SALVOS } from './dados-condominio';

const CONDOMINIO: CondominioAdmin = { nome: 'Residencial Jardim', slug: 'jardim', cidade: 'Campinas', uf: 'SP' };

function erroHttp(status: number, corpo: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: corpo });
}

describe('DadosCondominio', () => {
  let fixture: ComponentFixture<DadosCondominio>;
  let raiz: HTMLElement;
  let salvos: CondominioAdmin[];
  const api = { atualizar: vi.fn<(requisicao: AtualizarCondominioRequisicao) => Observable<CondominioAdmin>>() };
  const toasts = { sucesso: vi.fn(), erro: vi.fn() };

  function controle<T extends HTMLElement>(rotulo: string): T {
    const label = [...raiz.querySelectorAll('label')].find(
      (item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim() === rotulo,
    );
    const elemento = label ? raiz.querySelector<T>(`#${label.htmlFor}`) : null;
    if (!elemento) {
      throw new Error(`Campo não encontrado: ${rotulo}`);
    }
    return elemento;
  }

  const nome = () => controle<HTMLInputElement>('Nome do condomínio');
  const cidade = () => controle<HTMLInputElement>('Cidade');
  const uf = () => controle<HTMLSelectElement>('UF');
  const endereco = () => controle<HTMLInputElement>('Endereço do link');
  const botao = () => raiz.querySelector('button[type="submit"]') as HTMLButtonElement;

  function erroDe(elemento: HTMLElement): string | undefined {
    const id = (elemento.getAttribute('aria-describedby') ?? '').split(' ').find((item) => item.endsWith('-erro'));
    return id ? raiz.querySelector(`#${id}`)?.textContent?.trim() : undefined;
  }

  function digitar(elemento: HTMLInputElement, valor: string): void {
    elemento.value = valor;
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function escolher(valor: string): void {
    uf().value = valor;
    uf().dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function esperar(): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 0));
    await fixture.whenStable();
  }

  async function criar(condominio: CondominioAdmin = CONDOMINIO): Promise<void> {
    fixture = TestBed.createComponent(DadosCondominio);
    fixture.componentRef.setInput('condominio', condominio);
    fixture.componentInstance.salvo.subscribe((salvo) => salvos.push(salvo));
    raiz = fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    await fixture.whenStable();
  }

  async function salvar(): Promise<void> {
    botao().click();
    await esperar();
  }

  beforeEach(() => {
    salvos = [];
    api.atualizar.mockReset();
    toasts.sucesso.mockReset();
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: CondominioAdminService, useValue: api },
        { provide: ToastService, useValue: toasts },
      ],
    });
  });

  afterEach(() => raiz.remove());

  it('preenche com os dados atuais e mostra o endereço só para leitura, com a dica', async () => {
    await criar();

    expect(nome().value).toBe('Residencial Jardim');
    expect(cidade().value).toBe('Campinas');
    expect(uf().value).toBe('SP');
    expect(uf().options).toHaveLength(28);
    expect(uf().querySelector('option[value="SP"]')?.textContent?.trim()).toBe('SP – São Paulo');
    expect(endereco().value).toBe('jardim');
    expect(endereco().readOnly).toBe(true);
    expect(raiz.textContent).toContain(DICA_ENDERECO);
    expect(botao().textContent?.trim()).toBe('Salvar alterações');
  });

  it('condomínio antigo sem cidade e UF: campos vazios, UF com placeholder', async () => {
    await criar({ ...CONDOMINIO, cidade: null, uf: null });

    expect(cidade().value).toBe('');
    expect(uf().value).toBe('');
    expect(uf().selectedOptions[0]?.textContent?.trim()).toBe('Escolha a UF');
  });

  it('sem nome, cidade e UF: mostra os três erros, foca o primeiro e não chama a API', async () => {
    await criar({ ...CONDOMINIO, cidade: null, uf: null });
    digitar(nome(), '   ');

    await salvar();

    expect(erroDe(nome())).toBe('Informe o nome do condomínio.');
    expect(erroDe(cidade())).toBe('Informe a cidade.');
    expect(erroDe(uf())).toBe('Escolha a UF.');
    expect(nome().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(nome());
    expect(api.atualizar).not.toHaveBeenCalled();
  });

  it('nome acima de 120 e cidade acima de 80 caracteres não passam', async () => {
    await criar();
    digitar(nome(), 'a'.repeat(121));
    digitar(cidade(), 'b'.repeat(81));

    await salvar();

    expect(erroDe(nome())).toBe('Use no máximo 120 caracteres.');
    expect(erroDe(cidade())).toBe('Use no máximo 80 caracteres.');
    expect(api.atualizar).not.toHaveBeenCalled();
  });

  it('salva sem espaços nas pontas, avisa com toast e entrega o condomínio salvo', async () => {
    const resposta = new Subject<CondominioAdmin>();
    api.atualizar.mockReturnValue(resposta);
    await criar({ ...CONDOMINIO, cidade: null, uf: null });
    digitar(nome(), '  Jardim II  ');
    digitar(cidade(), ' Campinas ');
    escolher('SP');

    await salvar();

    expect(api.atualizar).toHaveBeenCalledWith({ nome: 'Jardim II', cidade: 'Campinas', uf: 'SP' });
    expect(botao().getAttribute('aria-busy')).toBe('true');
    expect(botao().textContent).toContain('Salvando…');

    const salvo: CondominioAdmin = { nome: 'Jardim II', slug: 'jardim', cidade: 'Campinas', uf: 'SP' };
    resposta.next(salvo);
    resposta.complete();
    await esperar();

    expect(toasts.sucesso).toHaveBeenCalledWith(MENSAGEM_DADOS_SALVOS);
    expect(salvos).toEqual([salvo]);
    expect(nome().value).toBe('Jardim II');
    expect(botao().getAttribute('aria-busy')).toBeNull();
  });

  it('erros por campo da API aparecem no campo e somem ao editar', async () => {
    api.atualizar.mockReturnValue(
      throwError(() =>
        erroHttp(400, {
          statusCode: 400,
          code: 'VALIDACAO_FALHOU',
          message: 'Dados inválidos.',
          details: [{ campo: 'cidade', erros: ['Informe a cidade.'] }],
        }),
      ),
    );
    await criar();

    await salvar();

    expect(erroDe(cidade())).toBe('Informe a cidade.');
    expect(document.activeElement).toBe(cidade());
    expect(toasts.erro).not.toHaveBeenCalled();

    digitar(cidade(), 'Campinas ');
    await esperar();

    expect(erroDe(cidade())).toBeUndefined();
  });

  it('erro sem campo (403): toast com a mensagem da API e o formulário mantém o que foi digitado', async () => {
    api.atualizar.mockReturnValue(
      throwError(() =>
        erroHttp(403, { statusCode: 403, code: 'ACESSO_NEGADO', message: 'Você não tem acesso a essa página.' }),
      ),
    );
    await criar();
    digitar(nome(), 'Jardim II');

    await salvar();

    expect(toasts.erro).toHaveBeenCalledWith('Você não tem acesso a essa página.');
    expect(nome().value).toBe('Jardim II');
    expect(document.activeElement).toBe(botao());
    expect(salvos).toEqual([]);
  });

  it('erro global (500): não repete o toast do interceptor e devolve o foco ao botão', async () => {
    api.atualizar.mockReturnValue(throwError(() => erroHttp(500, null)));
    await criar();

    await salvar();

    expect(toasts.erro).not.toHaveBeenCalled();
    expect(toasts.sucesso).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(botao());
    expect(nome().disabled).toBe(false);
  });

  it('ignora o clique duplo enquanto salva', async () => {
    api.atualizar.mockReturnValue(new Subject<CondominioAdmin>());
    await criar();

    await salvar();
    await salvar();

    expect(api.atualizar).toHaveBeenCalledTimes(1);
  });

  it('não envia o endereço (slug) na requisição', async () => {
    api.atualizar.mockReturnValue(of(CONDOMINIO));
    await criar();

    await salvar();

    expect(api.atualizar.mock.calls[0]?.[0]).not.toHaveProperty('slug');
  });
});
