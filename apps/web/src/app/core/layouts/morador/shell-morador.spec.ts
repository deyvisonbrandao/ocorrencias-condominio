import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UsuarioSessao } from '@ocorrencias/contratos';
import { SessaoService } from '../../services/sessao.service';
import rotasMorador from './morador.routes';

const MORADOR: UsuarioSessao = {
  nome: 'Bia Souza',
  telefone: '+5511912345678',
  papel: 'MORADOR',
  status: 'ATIVO',
  senhaTemporaria: false,
  condominio: { nome: 'Residencial Jardim', slug: 'jardim' },
};

describe('ShellMorador', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'app', children: rotasMorador }]),
        {
          provide: SessaoService,
          useValue: { usuario: signal(MORADOR), saindo: signal(false), erroAoSair: signal(null) },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  async function navegar(url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  }

  it.each(['/app/ocorrencias', '/app/minhas', '/app/perfil'])(
    'mostra a bottom-nav na tela raiz %s, com o item atual marcado',
    async (url) => {
      const shell = await navegar(url);
      const navegacao = shell.querySelector('ui-bottom-nav');

      expect(navegacao).not.toBeNull();
      expect(navegacao?.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe(url);
    },
  );

  it.each([
    ['/app/nova', 'Cancelar e voltar', 'Nova ocorrência'],
    ['/app/ocorrencias/57', 'Voltar para ocorrências', 'Ocorrência #57'],
  ])('na tela empilhada %s, troca a bottom-nav pela barra com voltar', async (url, rotuloVoltar, titulo) => {
    const shell = await navegar(url);

    expect(shell.querySelector('ui-bottom-nav')).toBeNull();
    const voltar = shell.querySelector(`a[aria-label="${rotuloVoltar}"]`);
    expect(voltar?.getAttribute('href')).toBe('/app/ocorrencias');
    expect(shell.querySelector('ui-barra-superior')?.textContent).toContain(titulo);
  });

  it.each(['/app/nova', '/app/ocorrencias/57'])(
    'na tela empilhada %s, põe o link de retorno antes do h1 a partir de md',
    async (url) => {
      const shell = await navegar(url);
      const principal = shell.querySelector('main') as HTMLElement;
      const retorno = principal.querySelector('a') as HTMLAnchorElement;

      expect(retorno.getAttribute('href')).toBe('/app/ocorrencias');
      expect(retorno.textContent?.replace(/\s+/g, ' ').trim()).toBe('Voltar para Condomínio');
      expect(retorno.classList).toContain('md:inline-flex');
      expect(retorno.compareDocumentPosition(principal.querySelector('h1') as HTMLElement)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
  );

  it('nas telas raiz, não há link de retorno no conteúdo', async () => {
    const shell = await navegar('/app/minhas');

    expect(shell.querySelector('main a')).toBeNull();
  });

  it('redireciona /app para o feed do condomínio', async () => {
    await navegar('/app');

    expect(TestBed.inject(Router).url).toBe('/app/ocorrencias');
  });

  it('mostra o nome do condomínio da sessão na barra superior', async () => {
    const shell = await navegar('/app/ocorrencias');

    expect(shell.querySelector('ui-barra-superior')?.textContent).toContain('Residencial Jardim');
  });
});
