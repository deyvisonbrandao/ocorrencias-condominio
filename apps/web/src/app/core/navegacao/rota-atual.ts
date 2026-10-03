import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { NomeIcone } from '../../shared/ui/icone/icones';

export interface Pilha {
  readonly voltarPara: string;
  readonly rotuloVoltar: string;
  readonly icone: Extract<NomeIcone, 'voltar' | 'fechar'>;
  readonly destino?: string;
}

export interface DadosDaTela {
  readonly titulo: string;
  readonly pilha: Pilha | null;
}

function ehPilha(valor: unknown): valor is Pilha {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const candidato = valor as Record<string, unknown>;
  return (
    typeof candidato['voltarPara'] === 'string' &&
    typeof candidato['rotuloVoltar'] === 'string' &&
    (candidato['icone'] === 'voltar' || candidato['icone'] === 'fechar') &&
    (candidato['destino'] === undefined || typeof candidato['destino'] === 'string')
  );
}

function folha(raiz: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let atual = raiz;
  while (atual.firstChild) {
    atual = atual.firstChild;
  }
  return atual;
}

function dadosDe(snapshot: ActivatedRouteSnapshot): DadosDaTela {
  const pilha: unknown = snapshot.data['pilha'];
  return { titulo: snapshot.title ?? '', pilha: ehPilha(pilha) ? pilha : null };
}

export function dadosDaTelaAtual(): Signal<DadosDaTela> {
  const router = inject(Router);
  const atual = () => dadosDe(folha(router.routerState.snapshot.root));
  return toSignal(
    router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(atual),
    ),
    { initialValue: atual() },
  );
}
