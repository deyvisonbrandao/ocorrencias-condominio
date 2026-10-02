import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import rotasMorador from './morador.routes';

describe('ShellMorador', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'app', children: rotasMorador }])],
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

  it('redireciona /app para o feed do condomínio', async () => {
    await navegar('/app');

    expect(TestBed.inject(Router).url).toBe('/app/ocorrencias');
  });
});
