import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AcaoMorador, ContagemMoradores, MoradorAdmin, PaginaMoradores } from '@ocorrencias/contratos';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../../testes/dialogo-nativo';
import { ContagemMoradoresService } from '../../core/services/contagem-moradores.service';
import { ToastService } from '../../shared/services/toast.service';
import { ESPERA_DA_BUSCA_MS, Moradores } from './moradores';
import { ConsultaMoradores, MoradoresService } from './services/moradores.service';

@Component({ template: '' })
class Vazia {}

function morador(id: string, nome: string, dados: Partial<MoradorAdmin> = {}): MoradorAdmin {
  return {
    id,
    nome,
    telefone: '+5511912345678',
    bloco: 'B',
    apto: '302',
    status: 'PENDENTE',
    criadoEm: '2020-09-01T12:00:00Z',
    motivoRecusa: null,
    ...dados,
  };
}

function pagina(itens: MoradorAdmin[], proximoCursor: string | null = null): PaginaMoradores {
  return { itens, proximoCursor };
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe('Moradores', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;
  const api = {
    listar: vi.fn<(consulta: ConsultaMoradores) => Observable<PaginaMoradores>>(),
    executar: vi.fn<(acao: AcaoMorador, id: string) => Observable<MoradorAdmin>>(),
    recusar: vi.fn<(id: string, motivo: string) => Observable<MoradorAdmin>>(),
  };
  const valorDaContagem = signal<ContagemMoradores | null>(null);
  const contagem = {
    contagem: valorDaContagem.asReadonly(),
    pendentes: computed(() => valorDaContagem()?.pendentes ?? 0),
    recarregar: vi.fn(),
    limpar: vi.fn(),
  };

  const url = () => TestBed.inject(Router).url;
  const ultimaConsulta = () => api.listar.mock.lastCall?.[0];
  const abaAtual = () => raiz.querySelector('ui-abas a[aria-current="page"]')?.textContent?.replace(/\s+/g, ' ').trim();
  const campoBusca = () => raiz.querySelector('input[type="search"]') as HTMLInputElement;
  const cartoes = () => [...raiz.querySelectorAll<HTMLElement>('app-lista-moradores ul > li')];
  const nomes = () => cartoes().map((cartao) => cartao.querySelector('h2')?.textContent?.trim());
  const dialogo = () => raiz.querySelector('app-confirmar-acao dialog') as HTMLDialogElement;
  const botaoCom = (dentro: ParentNode, inicio: string) =>
    [...dentro.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(inicio)) as
      | HTMLButtonElement
      | undefined;

  async function abrir(caminho = '/admin/moradores'): Promise<void> {
    await harness.navigateByUrl(caminho);
    await harness.fixture.whenStable();
  }

  async function estabilizar(): Promise<void> {
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    simularDialogoNativo();
    api.listar.mockReset().mockReturnValue(of(pagina([])));
    api.executar.mockReset();
    api.recusar.mockReset();
    contagem.recarregar.mockReset();
    valorDaContagem.set({ pendentes: 2, ativos: 1, recusados: 0, inativos: 0 });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'admin/moradores', component: Moradores },
          { path: 'admin/condominio', component: Vazia },
        ]),
        { provide: MoradoresService, useValue: api },
        { provide: ContagemMoradoresService, useValue: contagem },
      ],
    });
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
  });

  afterEach(() => {
    raiz.remove();
    restaurarDialogoNativo();
  });

  it('abre na aba Pendentes, com o contador, e recarrega a contagem', async () => {
    api.listar.mockReturnValue(of(pagina([morador('m1', 'Ana Lima')])));

    await abrir();

    expect(raiz.querySelector('h1')?.textContent?.trim()).toBe('Moradores');
    expect(abaAtual()).toBe('Pendentes 2');
    expect(ultimaConsulta()).toEqual({ status: ['PENDENTE'], q: '' });
    expect(nomes()).toEqual(['Ana Lima']);
    expect(contagem.recarregar).toHaveBeenCalled();
  });

  it('a aba vem da URL: Recusados e inativos pede os dois status', async () => {
    await abrir('/admin/moradores?aba=recusados-inativos');

    expect(abaAtual()).toBe('Recusados e inativos');
    expect(ultimaConsulta()).toEqual({ status: ['RECUSADO', 'INATIVO'], q: '' });
  });

  it('aba desconhecida ou explícita de pendentes vira a URL canônica', async () => {
    await abrir('/admin/moradores?aba=qualquer');
    expect(url()).toBe('/admin/moradores');

    await abrir('/admin/moradores?aba=pendentes&q=%20302%20');
    expect(url()).toBe('/admin/moradores?q=302');
  });

  it('a busca da URL preenche o campo, filtra a aba atual e segue nos links das abas', async () => {
    await abrir('/admin/moradores?aba=ativos&q=302');

    expect(campoBusca().value).toBe('302');
    expect(ultimaConsulta()).toEqual({ status: ['ATIVO'], q: '302' });
    expect(abaAtual()).toBe('Ativos');
    const links = [...raiz.querySelectorAll('ui-abas a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual([
      '/admin/moradores?q=302',
      '/admin/moradores?aba=ativos&q=302',
      '/admin/moradores?aba=recusados-inativos&q=302',
    ]);
  });

  it('digitar busca depois de 300ms, atualiza a URL sem perder a aba', async () => {
    await abrir('/admin/moradores?aba=ativos');

    campoBusca().value = 'bloco b';
    campoBusca().dispatchEvent(new Event('input'));
    await esperar(ESPERA_DA_BUSCA_MS - 100);
    expect(url()).toBe('/admin/moradores?aba=ativos');

    await esperar(200);
    await estabilizar();

    expect(url()).toBe('/admin/moradores?aba=ativos&q=bloco%20b');
    expect(ultimaConsulta()).toEqual({ status: ['ATIVO'], q: 'bloco b' });
    expect(campoBusca().value).toBe('bloco b');
  });

  it('sem resultado na busca: avisa, anuncia e "Limpar busca" volta à lista da aba', async () => {
    await abrir('/admin/moradores?q=zzz');

    expect(raiz.querySelector('ui-estado-vazio')?.textContent).toContain("Nenhum morador encontrado para 'zzz'.");
    expect(raiz.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe(
      "Nenhum morador encontrado para 'zzz'.",
    );

    botaoCom(raiz, 'Limpar busca')?.click();
    await estabilizar();

    expect(url()).toBe('/admin/moradores');
    expect(campoBusca().value).toBe('');
    expect(ultimaConsulta()).toEqual({ status: ['PENDENTE'], q: '' });
    expect(document.activeElement).toBe(campoBusca());
  });

  it('com busca e resultados, anuncia quantos foram encontrados', async () => {
    api.listar.mockReturnValue(of(pagina([morador('m1', 'Ana Lima'), morador('m2', 'Bruno Costa')], 'c2')));

    await abrir('/admin/moradores?q=b');

    expect(raiz.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('Mais de 2 moradores encontrados.');
  });

  it.each([
    ['/admin/moradores', 'Nenhum cadastro esperando aprovação.'],
    ['/admin/moradores?aba=ativos', 'Nenhum morador ativo ainda.'],
    ['/admin/moradores?aba=recusados-inativos', 'Nenhum morador recusado ou inativo.'],
  ])('vazio de %s: "%s"', async (caminho, titulo) => {
    await abrir(caminho);

    expect(raiz.querySelector('ui-estado-vazio h2')?.textContent?.trim()).toBe(titulo);
  });

  it('vazio de Ativos sugere compartilhar o link do condomínio', async () => {
    await abrir('/admin/moradores?aba=ativos');

    const link = raiz.querySelector('ui-estado-vazio a');
    expect(raiz.querySelector('ui-estado-vazio')?.textContent).toContain('Compartilhe o link do condomínio.');
    expect(link?.getAttribute('href')).toBe('/admin/condominio');
  });

  it('falha ao carregar: mostra o erro e "Tentar de novo" busca de novo', async () => {
    api.listar.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    await abrir();
    expect(raiz.querySelector('ui-estado-erro')?.textContent).toContain('Não foi possível carregar os moradores.');

    botaoCom(raiz.querySelector('ui-estado-erro') as HTMLElement, 'Tentar de novo')?.click();
    await estabilizar();

    expect(api.listar).toHaveBeenCalledTimes(2);
    expect(raiz.querySelector('ui-estado-erro')).toBeNull();
  });

  it('"Carregar mais" traz a próxima página pelo cursor e leva o foco ao primeiro item novo', async () => {
    api.listar
      .mockReturnValueOnce(of(pagina([morador('m1', 'Ana Lima')], 'c2')))
      .mockReturnValueOnce(of(pagina([morador('m2', 'Bruno Costa')])));
    await abrir();

    botaoCom(raiz, 'Carregar mais')?.click();
    await estabilizar();

    expect(ultimaConsulta()).toEqual({ status: ['PENDENTE'], q: '', cursor: 'c2' });
    expect(nomes()).toEqual(['Ana Lima', 'Bruno Costa']);
    expect(raiz.querySelector('ui-carregar-mais')?.textContent?.trim()).toBe('Isso é tudo.');
    expect(document.activeElement?.textContent?.trim()).toBe('Bruno Costa');
  });

  it('falha no "Carregar mais": mantém os itens e mostra o erro no lugar do botão', async () => {
    api.listar
      .mockReturnValueOnce(of(pagina([morador('m1', 'Ana Lima')], 'c2')))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    await abrir();

    botaoCom(raiz, 'Carregar mais')?.click();
    await estabilizar();

    expect(nomes()).toEqual(['Ana Lima']);
    expect(raiz.querySelector('ui-carregar-mais [role="alert"]')?.textContent).toContain(
      'Não foi possível carregar mais moradores.',
    );
  });

  it('aprovar: confirma, tira o item da aba, mostra o toast, recarrega a contagem e foca o seguinte', async () => {
    api.listar.mockReturnValue(of(pagina([morador('m1', 'Ana Lima'), morador('m2', 'Bruno Costa')])));
    api.executar.mockReturnValue(of(morador('m1', 'Ana Lima', { status: 'ATIVO' })));
    await abrir();
    contagem.recarregar.mockClear();

    botaoCom(cartoes()[0], 'Aprovar')?.click();
    await estabilizar();
    expect(dialogo().hasAttribute('open')).toBe(true);

    botaoCom(dialogo(), 'Aprovar')?.click();
    await estabilizar();

    expect(api.executar).toHaveBeenCalledWith('aprovar', 'm1');
    expect(nomes()).toEqual(['Bruno Costa']);
    expect(TestBed.inject(ToastService).sucessos().map((t) => t.mensagem)).toContain(
      'Cadastro de Ana Lima aprovado.',
    );
    expect(contagem.recarregar).toHaveBeenCalledTimes(1);
    expect(document.activeElement?.textContent?.trim()).toBe('Bruno Costa');
  });

  it('o último item da aba saiu: foca o título e mostra o vazio', async () => {
    api.listar.mockReturnValue(of(pagina([morador('m1', 'Ana Lima', { status: 'INATIVO' })])));
    api.executar.mockReturnValue(of(morador('m1', 'Ana Lima', { status: 'ATIVO' })));
    await abrir('/admin/moradores?aba=recusados-inativos');

    botaoCom(cartoes()[0], 'Reativar')?.click();
    await estabilizar();
    botaoCom(dialogo(), 'Reativar')?.click();
    await estabilizar();

    expect(TestBed.inject(ToastService).sucessos().map((t) => t.mensagem)).toContain('Ana Lima foi reativado.');
    expect(raiz.querySelector('ui-estado-vazio h2')?.textContent?.trim()).toBe('Nenhum morador recusado ou inativo.');
    expect(document.activeElement?.tagName).toBe('H1');
  });

  it('ação desatualizada (409): mostra o aviso, recarrega a lista e a contagem', async () => {
    api.listar.mockReturnValue(of(pagina([morador('m1', 'Ana Lima', { status: 'ATIVO' })])));
    api.executar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              statusCode: 409,
              code: 'TRANSICAO_MORADOR_INVALIDA',
              message: 'Esta ação não está mais disponível para este morador.',
              details: { statusAtual: 'INATIVO' },
            },
          }),
      ),
    );
    await abrir('/admin/moradores?aba=ativos');
    api.listar.mockClear();
    contagem.recarregar.mockClear();

    (cartoes()[0].querySelector('button[aria-label="Mais ações para Ana Lima"]') as HTMLButtonElement).click();
    await estabilizar();
    botaoCom(cartoes()[0], 'Inativar')?.click();
    await estabilizar();
    botaoCom(dialogo(), 'Inativar')?.click();
    await estabilizar();

    const aviso = raiz.querySelector('ui-alerta[data-aviso]');
    expect(aviso?.textContent).toContain('Esta ação não está mais disponível para este morador.');
    expect(api.listar).toHaveBeenCalledTimes(1);
    expect(contagem.recarregar).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(aviso);
  });

  it('trocar de aba apaga o aviso de ação desatualizada', async () => {
    api.listar.mockReturnValue(of(pagina([morador('m1', 'Ana Lima')])));
    api.executar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { statusCode: 404, code: 'MORADOR_NAO_ENCONTRADO', message: 'Morador não encontrado.' },
          }),
      ),
    );
    await abrir();
    botaoCom(cartoes()[0], 'Aprovar')?.click();
    await estabilizar();
    botaoCom(dialogo(), 'Aprovar')?.click();
    await estabilizar();
    expect(raiz.querySelector('ui-alerta[data-aviso]')).not.toBeNull();

    await abrir('/admin/moradores?aba=ativos');

    expect(raiz.querySelector('ui-alerta[data-aviso]')).toBeNull();
  });

  it('carregando: nada aparece antes de 300ms, depois o skeleton', async () => {
    api.listar.mockReturnValue(NEVER);
    await abrir();

    expect(raiz.querySelector('ui-skeleton')).toBeNull();

    await esperar(350);
    await estabilizar();

    const formas = [...raiz.querySelectorAll('ui-skeleton')].map((sk) => sk.parentElement?.className);
    expect(formas).toEqual(['md:hidden', 'hidden md:block']);
    expect(raiz.querySelector('.hidden ui-skeleton .border-b')).not.toBeNull();
  });

  it('sem pendentes, a aba não mostra "0" (como o menu)', async () => {
    valorDaContagem.set({ pendentes: 0, ativos: 1, recusados: 0, inativos: 0 });

    await abrir();

    expect(abaAtual()).toBe('Pendentes');
  });

  it('a página local esvaziou mas ainda há cursor: recarrega a aba em vez de mostrar o vazio', async () => {
    api.listar
      .mockReturnValueOnce(of(pagina([morador('m1', 'Ana Lima')], 'c2')))
      .mockReturnValueOnce(of(pagina([morador('m2', 'Bruno Costa')])));
    api.executar.mockReturnValue(of(morador('m1', 'Ana Lima', { status: 'ATIVO' })));
    await abrir();

    botaoCom(cartoes()[0], 'Aprovar')?.click();
    await estabilizar();
    botaoCom(dialogo(), 'Aprovar')?.click();
    await estabilizar();

    expect(api.listar).toHaveBeenCalledTimes(2);
    expect(ultimaConsulta()).toEqual({ status: ['PENDENTE'], q: '' });
    expect(raiz.querySelector('ui-estado-vazio')).toBeNull();
    expect(nomes()).toEqual(['Bruno Costa']);
    expect(document.activeElement?.textContent?.trim()).toBe('Bruno Costa');
  });

  it('cursor recusado pela API no "Carregar mais": recomeça a aba do início', async () => {
    api.listar
      .mockReturnValueOnce(of(pagina([morador('m1', 'Ana Lima')], 'velho')))
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { statusCode: 400, code: 'CURSOR_INVALIDO', message: 'Cursor inválido.' },
            }),
        ),
      )
      .mockReturnValueOnce(of(pagina([morador('m1', 'Ana Lima'), morador('m2', 'Bruno Costa')])));
    await abrir();

    botaoCom(raiz, 'Carregar mais')?.click();
    await estabilizar();

    expect(api.listar).toHaveBeenCalledTimes(3);
    expect(ultimaConsulta()).toEqual({ status: ['PENDENTE'], q: '' });
    expect(nomes()).toEqual(['Ana Lima', 'Bruno Costa']);
    expect(raiz.querySelector('ui-carregar-mais [role="alert"]')).toBeNull();
  });

  it('sair da tela com "Carregar mais" em curso cancela o pedido', async () => {
    const proxima = new Subject<PaginaMoradores>();
    api.listar
      .mockReturnValueOnce(of(pagina([morador('m1', 'Ana Lima')], 'c2')))
      .mockReturnValueOnce(proxima);
    await abrir();
    botaoCom(raiz, 'Carregar mais')?.click();
    await estabilizar();
    expect(proxima.observed).toBe(true);

    await abrir('/admin/condominio');

    expect(proxima.observed).toBe(false);
    expect(() => proxima.next(pagina([morador('m2', 'Bruno Costa')]))).not.toThrow();
  });

  it('busca com termo curto sem resultado explica que ele procura só bloco e apto', async () => {
    await abrir('/admin/moradores?q=al');

    expect(raiz.querySelector('ui-estado-vazio')?.textContent).toContain(
      'Termos com até 2 caracteres procuram só o bloco ou o início do apto.',
    );
  });

  it('busca com termos longos sem resultado não mostra a explicação', async () => {
    await abrir('/admin/moradores?q=alves');

    expect(raiz.querySelector('ui-estado-vazio')?.textContent).not.toContain('Termos com até');
  });
});
