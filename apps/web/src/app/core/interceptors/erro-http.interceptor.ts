import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

/**
 * Desliga o toast global de erro para uma requisição.
 * Obrigatório em requisições feitas de dentro de um `ui-modal` ou `ui-drawer`: com `showModal()`,
 * o resto da página fica inerte e o toast não pode ser lido nem fechado. Nesse caso, a tela mostra
 * o erro dentro do próprio diálogo (um `ui-alerta` com `anunciar`).
 */
export const SEM_TOAST_DE_ERRO = new HttpContextToken<boolean>(() => false);

export const MENSAGEM_SEM_CONEXAO = 'Sem conexão. Verifique a internet e tente de novo.';
export const MENSAGEM_ERRO_INESPERADO = 'Algo deu errado do nosso lado. Tente de novo em instantes.';

function mensagemDeLimite(retryAfter: string | null): string {
  const segundos = retryAfter === null ? Number.NaN : Number(retryAfter);
  if (!Number.isFinite(segundos) || segundos <= 0) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  if (segundos < 60) {
    return 'Muitas tentativas. Aguarde alguns segundos e tente de novo.';
  }
  const minutos = Math.ceil(segundos / 60);
  return `Muitas tentativas. Aguarde ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} e tente de novo.`;
}

export function mensagemDeErroGlobal(erro: HttpErrorResponse): string | null {
  if (erro.status === 0) {
    return MENSAGEM_SEM_CONEXAO;
  }
  if (erro.status === 429) {
    return mensagemDeLimite(erro.headers.get('Retry-After'));
  }
  if (erro.status >= 500) {
    return MENSAGEM_ERRO_INESPERADO;
  }
  return null;
}

export const erroHttpInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const toasts = inject(ToastService);
  return proximo(requisicao).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && !requisicao.context.get(SEM_TOAST_DE_ERRO)) {
        const mensagem = mensagemDeErroGlobal(erro);
        if (mensagem) {
          toasts.erro(mensagem);
        }
      }
      return throwError(() => erro);
    }),
  );
};
