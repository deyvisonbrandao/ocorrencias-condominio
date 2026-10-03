import { HttpInterceptorFn } from '@angular/common/http';

export const PREFIXO_API = '/api/v1';

const URL_ABSOLUTA = /^([a-z][a-z\d+\-.]*:)?\/\//i;

function jaTemPrefixo(caminho: string): boolean {
  if (!caminho.startsWith(PREFIXO_API)) {
    return false;
  }
  const seguinte = caminho.charAt(PREFIXO_API.length);
  return seguinte === '' || seguinte === '/' || seguinte === '?' || seguinte === '#';
}

export const apiInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (URL_ABSOLUTA.test(requisicao.url)) {
    return proximo(requisicao);
  }
  const caminho = requisicao.url.startsWith('/') ? requisicao.url : `/${requisicao.url}`;
  const url = jaTemPrefixo(caminho) ? caminho : `${PREFIXO_API}${caminho}`;
  return proximo(requisicao.clone({ url, withCredentials: true }));
};
