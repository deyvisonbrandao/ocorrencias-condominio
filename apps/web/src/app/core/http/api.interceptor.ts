import { HttpInterceptorFn } from '@angular/common/http';

export const PREFIXO_API = '/api/v1';

const URL_ABSOLUTA = /^([a-z][a-z\d+\-.]*:)?\/\//i;

export const apiInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (URL_ABSOLUTA.test(requisicao.url)) {
    return proximo(requisicao);
  }
  const caminho = requisicao.url.startsWith('/') ? requisicao.url : `/${requisicao.url}`;
  const url = caminho.startsWith(`${PREFIXO_API}/`) ? caminho : `${PREFIXO_API}${caminho}`;
  return proximo(requisicao.clone({ url, withCredentials: true }));
};
