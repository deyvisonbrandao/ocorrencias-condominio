import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CodigoErroSessao } from '@ocorrencias/contratos';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { lerErroApi } from '../../shared/utils/erro-api';
import { destinoAposLogin, MENSAGEM_SEM_ACESSO, rotaDoLogin } from '../services/navegacao-da-sessao';
import { SessaoService, SONDAGEM_DE_SESSAO } from '../services/sessao.service';

function acessoNegado(erro: HttpErrorResponse): boolean {
  return erro.status === 403 && lerErroApi(erro)?.code === CodigoErroSessao.ACESSO_NEGADO;
}

export const sessaoExpiradaInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (requisicao.context.get(SONDAGEM_DE_SESSAO)) {
    return proximo(requisicao);
  }
  const sessao = inject(SessaoService);
  const router = inject(Router);
  const toasts = inject(ToastService);

  const levarAoLogin = (slug: string) => {
    const voltar = router.url;
    sessao.expirar();
    void router.navigateByUrl(rotaDoLogin(router, slug, voltar));
  };

  // O papel em cache pode estar velho (rebaixamento): relê o /me e manda para a área atual da pessoa.
  const reavaliarAcesso = (slug: string) => {
    sessao.invalidar();
    sessao.carregar().subscribe({
      next: (atual) => {
        if (!atual) {
          levarAoLogin(slug);
          return;
        }
        toasts.erro(MENSAGEM_SEM_ACESSO);
        void router.navigateByUrl(destinoAposLogin(atual, null));
      },
      error: () => undefined,
    });
  };

  return proximo(requisicao).pipe(
    catchError((erro: unknown) => {
      const usuario = sessao.usuario();
      // Só reage com sessão conhecida: várias chamadas recusadas juntas geram um único redirecionamento.
      if (erro instanceof HttpErrorResponse && usuario) {
        if (erro.status === 401) {
          levarAoLogin(usuario.condominio.slug);
        } else if (acessoNegado(erro)) {
          reavaliarAcesso(usuario.condominio.slug);
        }
      }
      return throwError(() => erro);
    }),
  );
};
