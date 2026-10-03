import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  convertToParamMap,
  GuardResult,
  MaybeAsync,
  provideRouter,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, isObservable, Observable, of, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { MENSAGEM_SEM_ACESSO } from '../services/navegacao-da-sessao';
import { SessaoService } from '../services/sessao.service';
import { UltimoCondominio } from '../services/ultimo-condominio';
import { areaAdmin, areaMorador, loginSemSessao, somenteSindico } from './sessao.guards';

function usuario(papel: Papel, extras: Partial<UsuarioSessao> = {}): UsuarioSessao {
  return {
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    papel,
    status: 'ATIVO',
    senhaTemporaria: false,
    condominio: { nome: 'Jardim', slug: 'jardim' },
    ...extras,
  };
}

describe('guards de sessão', () => {
  const sessao = { carregar: vi.fn<() => Observable<UsuarioSessao | null>>() };
  const ultimo = { ler: vi.fn<() => string | null>() };
  const toasts = { erro: vi.fn() };

  beforeEach(() => {
    sessao.carregar.mockReset();
    ultimo.ler.mockReset().mockReturnValue(null);
    toasts.erro.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessaoService, useValue: sessao },
        { provide: UltimoCondominio, useValue: ultimo },
        { provide: ToastService, useValue: toasts },
      ],
    });
  });

  async function executar(
    guarda: CanActivateFn,
    url: string,
    rota: Partial<ActivatedRouteSnapshot> = {},
  ): Promise<string | boolean> {
    const resultado: MaybeAsync<GuardResult> = TestBed.runInInjectionContext(() =>
      guarda(rota as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    const final = isObservable(resultado) ? await firstValueFrom(resultado) : await resultado;
    if (final instanceof UrlTree) {
      return TestBed.inject(Router).serializeUrl(final);
    }
    if (final instanceof RedirectCommand) {
      const sem = final.navigationBehaviorOptions?.skipLocationChange ? ' (sem trocar a URL)' : '';
      return TestBed.inject(Router).serializeUrl(final.redirectTo) + sem;
    }
    return final;
  }

  describe('área admin', () => {
    it('sem sessão, leva ao login do último condomínio com voltar', async () => {
      sessao.carregar.mockReturnValue(of(null));
      ultimo.ler.mockReturnValue('jardim');

      expect(await executar(areaAdmin, '/admin/ocorrencias?visao=atrasadas')).toBe(
        '/c/jardim/entrar?voltar=%2Fadmin%2Focorrencias%3Fvisao%3Datrasadas',
      );
    });

    it('sem sessão e sem condomínio conhecido, cai na landing', async () => {
      sessao.carregar.mockReturnValue(of(null));

      expect(await executar(areaAdmin, '/admin/painel')).toBe('/');
    });

    it.each<Papel>(['SINDICO', 'SUBSINDICO'])('%s entra', async (papel) => {
      sessao.carregar.mockReturnValue(of(usuario(papel)));

      expect(await executar(areaAdmin, '/admin/painel')).toBe(true);
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('morador é mandado para a própria área com o aviso de acesso', async () => {
      sessao.carregar.mockReturnValue(of(usuario('MORADOR')));

      expect(await executar(areaAdmin, '/admin/painel')).toBe('/app/ocorrencias');
      expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_SEM_ACESSO);
    });

    it('com senha temporária, vai para a troca de senha', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SINDICO', { senhaTemporaria: true })));

      expect(await executar(areaAdmin, '/admin/painel')).toBe('/trocar-senha');
    });
  });

  describe('sem conseguir verificar a sessão (rede, 5xx)', () => {
    const falhaDeRede = () => throwError(() => new HttpErrorResponse({ status: 0 }));

    it('na abertura do app, mostra o erro sem trocar a URL e sem mandar ao login', async () => {
      sessao.carregar.mockReturnValue(falhaDeRede());
      ultimo.ler.mockReturnValue('jardim');

      expect(await executar(areaAdmin, '/admin/painel')).toBe('/sessao-indisponivel (sem trocar a URL)');
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('com uma tela já aberta, cancela a navegação e fica nela', async () => {
      TestBed.inject(Router).navigated = true;
      sessao.carregar.mockReturnValue(falhaDeRede());

      expect(await executar(areaMorador, '/app/minhas')).toBe(false);
    });

    it('no login, mostra o formulário sem nova tentativa', async () => {
      sessao.carregar.mockReturnValue(falhaDeRede());

      expect(
        await executar(loginSemSessao, '/c/jardim/entrar', {
          paramMap: convertToParamMap({ slug: 'jardim' }),
          queryParamMap: convertToParamMap({}),
        }),
      ).toBe(true);
      expect(sessao.carregar).toHaveBeenCalledTimes(1);
    });
  });

  describe('somente síndico (Equipe)', () => {
    it('síndico entra', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SINDICO')));

      expect(await executar(somenteSindico, '/admin/equipe')).toBe(true);
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('subsíndico vai para o painel com o aviso de acesso', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SUBSINDICO')));

      expect(await executar(somenteSindico, '/admin/equipe')).toBe('/admin/painel');
      expect(toasts.erro).toHaveBeenCalledTimes(1);
      expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_SEM_ACESSO);
    });

    it('morador vai para a própria área com um único aviso', async () => {
      sessao.carregar.mockReturnValue(of(usuario('MORADOR')));

      expect(await executar(somenteSindico, '/admin/equipe')).toBe('/app/ocorrencias');
      expect(toasts.erro).toHaveBeenCalledTimes(1);
    });

    it('sem sessão, segue o fluxo do guard da área: login com voltar', async () => {
      sessao.carregar.mockReturnValue(of(null));
      ultimo.ler.mockReturnValue('jardim');

      expect(await executar(somenteSindico, '/admin/equipe')).toBe(
        '/c/jardim/entrar?voltar=%2Fadmin%2Fequipe',
      );
      expect(toasts.erro).not.toHaveBeenCalled();
    });

    it('subsíndico com senha temporária vai para a troca de senha', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SUBSINDICO', { senhaTemporaria: true })));

      expect(await executar(somenteSindico, '/admin/equipe')).toBe('/trocar-senha');
    });
  });

  describe('área do morador', () => {
    it('morador entra', async () => {
      sessao.carregar.mockReturnValue(of(usuario('MORADOR')));

      expect(await executar(areaMorador, '/app/ocorrencias')).toBe(true);
    });

    it('síndico é mandado para o painel', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SINDICO')));

      expect(await executar(areaMorador, '/app/minhas')).toBe('/admin/painel');
      expect(toasts.erro).toHaveBeenCalledWith(MENSAGEM_SEM_ACESSO);
    });

    it('com senha temporária, vai para a troca de senha', async () => {
      sessao.carregar.mockReturnValue(of(usuario('MORADOR', { senhaTemporaria: true })));

      expect(await executar(areaMorador, '/app/ocorrencias')).toBe('/trocar-senha');
    });
  });

  describe('login', () => {
    function rotaDoLogin(slug: string, voltar?: string): Partial<ActivatedRouteSnapshot> {
      return {
        paramMap: convertToParamMap({ slug }),
        queryParamMap: convertToParamMap(voltar ? { voltar } : {}),
      };
    }

    it('sem sessão, mostra o formulário', async () => {
      sessao.carregar.mockReturnValue(of(null));

      expect(await executar(loginSemSessao, '/c/jardim/entrar', rotaDoLogin('jardim'))).toBe(true);
    });

    it('já com sessão no mesmo condomínio, segue para o voltar válido', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SINDICO')));

      expect(
        await executar(loginSemSessao, '/c/jardim/entrar', rotaDoLogin('jardim', '/admin/moradores')),
      ).toBe('/admin/moradores');
    });

    it('já com sessão, ignora voltar externo e vai para o início da área', async () => {
      sessao.carregar.mockReturnValue(of(usuario('MORADOR')));

      expect(
        await executar(loginSemSessao, '/c/jardim/entrar', rotaDoLogin('jardim', '//evil.com')),
      ).toBe('/app/ocorrencias');
    });

    it('com sessão de outro condomínio, mostra o formulário', async () => {
      sessao.carregar.mockReturnValue(of(usuario('SINDICO')));

      expect(await executar(loginSemSessao, '/c/outro/entrar', rotaDoLogin('outro'))).toBe(true);
    });
  });
});
