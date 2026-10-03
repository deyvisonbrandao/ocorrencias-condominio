import { ViewportScroller } from '@angular/common';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ContagemMoradores, PaginaMoradores, PainelAdmin, Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { NEVER, Observable, of } from 'rxjs';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../../../testes/dialogo-nativo';
import { MoradoresService } from '../../../features/moradores/services/moradores.service';
import { PainelService } from '../../../features/painel/services/painel.service';
import { ContagemMoradoresService } from '../../services/contagem-moradores.service';
import { focarTituloERolarAoNavegar } from '../../services/foco-na-navegacao';
import { SessaoService } from '../../services/sessao.service';
import rotasAdmin from './admin.routes';

function usuario(papel: Papel): UsuarioSessao {
  return {
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    papel,
    status: 'ATIVO',
    senhaTemporaria: false,
    condominio: { nome: 'Residencial Jardim', slug: 'jardim' },
  };
}

describe('ShellAdmin', () => {
  let harness: RouterTestingHarness;
  let raiz: HTMLElement;
  const sessao = {
    usuario: signal<UsuarioSessao | null>(usuario('SINDICO')),
    saindo: signal(false),
    erroAoSair: signal<string | null>(null),
    sair: vi.fn(),
    descartarErroAoSair: vi.fn(),
    carregar: () => of(sessao.usuario()),
  };
  const valorDaContagem = signal<ContagemMoradores | null>(null);
  const contagem = {
    contagem: valorDaContagem.asReadonly(),
    pendentes: computed(() => valorDaContagem()?.pendentes ?? 0),
    recarregar: vi.fn(),
    limpar: vi.fn(),
  };

  const gaveta = () => raiz.querySelector('ui-drawer dialog') as HTMLDialogElement;
  const botaoMenu = () => raiz.querySelector('button[aria-label="Abrir menu"]') as HTMLButtonElement;
  const itemDaGaveta = (rotulo: string) =>
    [...gaveta().querySelectorAll<HTMLAnchorElement>('a')].find((a) => a.textContent?.trim() === rotulo) as HTMLAnchorElement;

  async function abrirMenu(): Promise<void> {
    botaoMenu().focus();
    botaoMenu().click();
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    sessao.usuario.set(usuario('SINDICO'));
    sessao.erroAoSair.set(null);
    sessao.sair.mockReset();
    valorDaContagem.set(null);
    contagem.recarregar.mockReset();
    contagem.limpar.mockReset();
    simularDialogoNativo();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin', children: rotasAdmin }]),
        { provide: SessaoService, useValue: sessao },
        { provide: PainelService, useValue: { obter: (): Observable<PainelAdmin> => NEVER } },
        { provide: MoradoresService, useValue: { listar: (): Observable<PaginaMoradores> => NEVER } },
        { provide: ContagemMoradoresService, useValue: contagem },
        {
          provide: ViewportScroller,
          useValue: {
            setHistoryScrollRestoration: vi.fn(),
            getScrollPosition: () => [0, 0],
            scrollToPosition: vi.fn(),
          },
        },
      ],
    });
    TestBed.runInInjectionContext(() => focarTituloERolarAoNavegar());
    harness = await RouterTestingHarness.create();
    raiz = harness.fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    await harness.navigateByUrl('/admin');
  });

  afterEach(() => {
    raiz.remove();
    restaurarDialogoNativo();
  });

  it('redireciona /admin para o painel e marca o item atual na sidebar', () => {
    expect(TestBed.inject(Router).url).toBe('/admin/painel');
    const atual = raiz.querySelector('aside a[aria-current="page"]');
    expect(atual?.textContent?.trim()).toBe('Painel');
  });

  it('o botão de menu abre o drawer e informa aria-expanded', async () => {
    expect(botaoMenu().getAttribute('aria-expanded')).toBe('false');

    await abrirMenu();

    expect(gaveta().hasAttribute('open')).toBe(true);
    expect(botaoMenu().getAttribute('aria-expanded')).toBe('true');
  });

  it('ao escolher um item, navega, fecha o drawer e leva o foco ao h1 da tela', async () => {
    await abrirMenu();

    itemDaGaveta('Moradores').click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin/moradores');
    expect(gaveta().hasAttribute('open')).toBe(false);
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent?.trim()).toBe('Moradores');
  });

  it('fecha o drawer mesmo ao escolher o item da tela atual', async () => {
    await abrirMenu();

    itemDaGaveta('Painel').click();
    await harness.fixture.whenStable();

    expect(gaveta().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(botaoMenu());
  });

  it('em tela empilhada, troca o menu pelo voltar para a fila', async () => {
    await harness.navigateByUrl('/admin/ocorrencias/57');

    expect(botaoMenu()).toBeNull();
    const voltar = raiz.querySelector('a[aria-label="Voltar para ocorrências"]');
    expect(voltar?.getAttribute('href')).toBe('/admin/ocorrencias');
  });

  it('mostra o condomínio e a pessoa logada com o papel na sidebar', () => {
    const lateral = raiz.querySelector('aside') as HTMLElement;

    expect(lateral.textContent).toContain('Residencial Jardim');
    expect(lateral.textContent).toContain('Ana Lima · Síndico(a)');
    expect(raiz.querySelector('ui-barra-superior')?.textContent).toContain('Residencial Jardim');
  });

  it('"Sair" na sidebar encerra a sessão', () => {
    const sair = [...raiz.querySelectorAll<HTMLButtonElement>('aside button')].find(
      (botao) => botao.textContent?.trim() === 'Sair',
    );

    sair?.click();

    expect(sessao.sair).toHaveBeenCalledTimes(1);
  });

  it('"Sair" também fica no menu do celular e mostra o erro ali dentro', async () => {
    await abrirMenu();
    sessao.erroAoSair.set('Sem conexão. Verifique a internet e tente de novo.');
    await harness.fixture.whenStable();

    const sair = [...gaveta().querySelectorAll<HTMLButtonElement>('button')].find(
      (botao) => botao.textContent?.trim() === 'Sair',
    );
    sair?.click();

    expect(sessao.sair).toHaveBeenCalledTimes(1);
    expect(gaveta().querySelector('ui-alerta[role="alert"]')?.textContent).toContain('Sem conexão');
  });

  it.each<[Papel, boolean]>([
    ['SINDICO', true],
    ['SUBSINDICO', false],
  ])('%s vê o item Equipe: %s', async (papel, ve) => {
    sessao.usuario.set(usuario(papel));
    await harness.fixture.whenStable();

    const rotulos = [...raiz.querySelectorAll('aside nav a')].map((a) => a.textContent?.trim());
    expect(rotulos.includes('Equipe')).toBe(ve);
  });

  it.each<[Papel, string]>([
    ['SINDICO', '/admin/equipe'],
    ['SUBSINDICO', '/admin/painel'],
  ])('acesso direto a /admin/equipe como %s termina em %s', async (papel, destino) => {
    sessao.usuario.set(usuario(papel));

    await harness.navigateByUrl('/admin/equipe');

    expect(TestBed.inject(Router).url).toBe(destino);
  });

  it('ao entrar na área admin, busca a contagem de moradores', () => {
    expect(contagem.recarregar).toHaveBeenCalled();
  });

  it('mostra os cadastros pendentes no item Moradores, com texto para o leitor de tela', async () => {
    valorDaContagem.set({ pendentes: 3, ativos: 2, recusados: 0, inativos: 0 });
    await harness.fixture.whenStable();

    const moradores = [...raiz.querySelectorAll<HTMLAnchorElement>('aside nav a')].find((a) =>
      a.textContent?.includes('Moradores'),
    ) as HTMLAnchorElement;

    expect(moradores.querySelector('span[aria-hidden="true"]')?.textContent?.trim()).toBe('3');
    expect(moradores.querySelector('.sr-only')?.textContent?.trim()).toBe('3 cadastros pendentes');
  });

  it('um único pendente usa o singular, e sem pendentes o contador some', async () => {
    valorDaContagem.set({ pendentes: 1, ativos: 0, recusados: 0, inativos: 0 });
    await harness.fixture.whenStable();
    const moradores = () =>
      [...raiz.querySelectorAll<HTMLAnchorElement>('aside nav a')].find((a) =>
        a.textContent?.includes('Moradores'),
      ) as HTMLAnchorElement;

    expect(moradores().querySelector('.sr-only')?.textContent?.trim()).toBe('1 cadastro pendente');

    valorDaContagem.set({ pendentes: 0, ativos: 1, recusados: 0, inativos: 0 });
    await harness.fixture.whenStable();

    expect(moradores().querySelector('.sr-only')).toBeNull();
  });

  it('o subsíndico lê /admin/condominio (não é bloqueado)', async () => {
    sessao.usuario.set(usuario('SUBSINDICO'));

    await harness.navigateByUrl('/admin/condominio');

    expect(TestBed.inject(Router).url).toBe('/admin/condominio');
  });
});
