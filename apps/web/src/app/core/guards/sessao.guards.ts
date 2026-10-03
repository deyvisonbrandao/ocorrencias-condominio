import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AreaDaSessao } from '../models/sessao';
import {
  areaDoPapel,
  destinoAposLogin,
  MENSAGEM_SEM_ACESSO,
  ROTA_INICIAL,
  ROTA_SESSAO_INDISPONIVEL,
  ROTA_TROCAR_SENHA,
  rotaDoLogin,
} from '../services/navegacao-da-sessao';
import { SessaoService } from '../services/sessao.service';
import { UltimoCondominio } from '../services/ultimo-condominio';

export function exigirArea(area: AreaDaSessao): CanActivateFn {
  return (_rota, estado) => {
    const sessao = inject(SessaoService);
    const router = inject(Router);
    const ultimoCondominio = inject(UltimoCondominio);
    const toasts = inject(ToastService);
    return sessao.carregar().pipe(
      map((usuario) => {
        if (!usuario) {
          return rotaDoLogin(router, ultimoCondominio.ler(), estado.url);
        }
        if (usuario.senhaTemporaria) {
          return router.parseUrl(ROTA_TROCAR_SENHA);
        }
        const areaDoUsuario = areaDoPapel(usuario.papel);
        if (areaDoUsuario !== area) {
          toasts.erro(MENSAGEM_SEM_ACESSO);
          return router.parseUrl(ROTA_INICIAL[areaDoUsuario]);
        }
        return true;
      }),
      // Não deu para verificar (rede, 5xx): não é "sem sessão". O toast global já avisou;
      // com tela aberta, fica nela; na abertura do app, mostra o erro sem trocar a URL.
      catchError(() =>
        of(
          router.navigated
            ? false
            : new RedirectCommand(router.parseUrl(ROTA_SESSAO_INDISPONIVEL), {
                skipLocationChange: true,
              }),
        ),
      ),
    );
  };
}

export const areaAdmin = exigirArea('admin');
export const areaMorador = exigirArea('morador');

export const loginSemSessao: CanActivateFn = (rota) => {
  const router = inject(Router);
  const slug = rota.paramMap.get('slug');
  const voltar = rota.queryParamMap.get('voltar');
  return inject(SessaoService)
    .carregar()
    .pipe(
      map((usuario) =>
        usuario && usuario.condominio.slug === slug
          ? router.parseUrl(destinoAposLogin(usuario, voltar))
          : true,
      ),
      catchError(() => of(true)),
    );
};
