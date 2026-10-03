import { DOCUMENT, ViewportScroller } from '@angular/common';
import { afterNextRender, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { focarTituloDoConteudo } from '../../shared/components/pular-conteudo/pular-conteudo';

type Posicao = [number, number];

function caminhoDe(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

export function focarTituloERolarAoNavegar(): void {
  const router = inject(Router);
  const documento = inject(DOCUMENT);
  const injector = inject(Injector);
  const rolagem = inject(ViewportScroller);

  const posicoes = new Map<number, Posicao>();
  let idAtual = 0;
  let caminhoAtual: string | null = null;
  let posicaoAoVoltar: Posicao | undefined;

  rolagem.setHistoryScrollRestoration('manual');

  router.events.pipe(takeUntilDestroyed()).subscribe((evento) => {
    if (evento instanceof NavigationStart) {
      posicoes.set(idAtual, rolagem.getScrollPosition());
      const idRestaurado = evento.restoredState?.navigationId;
      posicaoAoVoltar =
        evento.navigationTrigger === 'popstate' && idRestaurado !== undefined
          ? posicoes.get(idRestaurado)
          : undefined;
      return;
    }
    if (!(evento instanceof NavigationEnd)) {
      return;
    }
    idAtual = evento.id;
    const caminho = caminhoDe(evento.urlAfterRedirects);
    const anterior = caminhoAtual;
    caminhoAtual = caminho;
    // Mudança só de query ou fragmento (filtros, abas) não move foco nem rola: WCAG 3.2.2.
    if (anterior === null || anterior === caminho) {
      return;
    }
    const posicao = posicaoAoVoltar ?? [0, 0];
    afterNextRender(
      () => {
        focarTituloDoConteudo(documento);
        rolagem.scrollToPosition(posicao);
      },
      { injector },
    );
  });
}
