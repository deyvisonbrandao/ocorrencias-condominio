import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AcaoMorador,
  MoradorAdmin,
  PaginaMoradores,
  RecusarMoradorRequisicao,
  StatusUsuario,
} from '@ocorrencias/contratos';
import { Observable } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../../../core/interceptors/erro-http.interceptor';

const MORADORES = '/admin/moradores';

export interface ConsultaMoradores {
  readonly status: readonly StatusUsuario[];
  readonly q?: string;
  readonly cursor?: string;
}

export type AcaoSemCorpo = Exclude<AcaoMorador, 'recusar'>;

// A lista mostra o próprio estado de erro e as ações rodam dentro de diálogo, onde o toast fica inerte.
function semToast(): HttpContext {
  return new HttpContext().set(SEM_TOAST_DE_ERRO, true);
}

function urlDaAcao(id: string, acao: AcaoMorador): string {
  return `${MORADORES}/${encodeURIComponent(id)}/${acao}`;
}

@Injectable({ providedIn: 'root' })
export class MoradoresService {
  private readonly http = inject(HttpClient);

  listar(consulta: ConsultaMoradores): Observable<PaginaMoradores> {
    let params = new HttpParams().set('status', consulta.status.join(','));
    const q = consulta.q?.trim();
    if (q) {
      params = params.set('q', q);
    }
    if (consulta.cursor) {
      params = params.set('cursor', consulta.cursor);
    }
    return this.http.get<PaginaMoradores>(MORADORES, { params, context: semToast() });
  }

  executar(acao: AcaoSemCorpo, id: string): Observable<MoradorAdmin> {
    return this.http.post<MoradorAdmin>(urlDaAcao(id, acao), null, { context: semToast() });
  }

  recusar(id: string, motivo: string): Observable<MoradorAdmin> {
    const corpo: RecusarMoradorRequisicao = { motivo };
    return this.http.post<MoradorAdmin>(urlDaAcao(id, 'recusar'), corpo, { context: semToast() });
  }
}
