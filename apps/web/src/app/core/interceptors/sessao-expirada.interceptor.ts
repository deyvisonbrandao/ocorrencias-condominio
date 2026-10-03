import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { rotaDoLogin } from '../services/navegacao-da-sessao';
import { SessaoService, SONDAGEM_DE_SESSAO } from '../services/sessao.service';

export const sessaoExpiradaInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (requisicao.context.get(SONDAGEM_DE_SESSAO)) {
    return proximo(requisicao);
  }
  const sessao = inject(SessaoService);
  const router = inject(Router);
  return proximo(requisicao).pipe(
    catchError((erro: unknown) => {
      const usuario = sessao.usuario();
      // Só reage com sessão conhecida: várias chamadas recusadas juntas geram um único redirecionamento.
      if (erro instanceof HttpErrorResponse && erro.status === 401 && usuario) {
        const voltar = router.url;
        sessao.expirar();
        void router.navigateByUrl(rotaDoLogin(router, usuario.condominio.slug, voltar));
      }
      return throwError(() => erro);
    }),
  );
};
