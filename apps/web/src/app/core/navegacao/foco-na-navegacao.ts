import { DOCUMENT } from '@angular/common';
import { afterNextRender, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, skip } from 'rxjs';
import { focarTituloDoConteudo } from '../../shared/ui/pular-conteudo/pular-conteudo';

export function focarTituloAoNavegar(): void {
  const documento = inject(DOCUMENT);
  const injector = inject(Injector);
  inject(Router)
    .events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      skip(1),
      takeUntilDestroyed(),
    )
    .subscribe(() => {
      afterNextRender(() => focarTituloDoConteudo(documento), { injector });
    });
}
