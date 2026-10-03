import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CadastrarCondominioRequisicao,
  CodigoErroCondominio,
  CondominioCriado,
  CondominioPublico,
} from '@ocorrencias/contratos';
import { catchError, map, Observable, of } from 'rxjs';
import { lerErroApi } from '../../shared/utils/erro-api';
import { SEM_TOAST_DE_ERRO } from '../http/erro-http.interceptor';

export type DisponibilidadeSlug = 'disponivel' | 'em-uso' | 'desconhecida';

const RECURSO = '/public/condominios';

@Injectable({ providedIn: 'root' })
export class CondominiosPublicoService {
  private readonly http = inject(HttpClient);

  cadastrar(requisicao: CadastrarCondominioRequisicao): Observable<CondominioCriado> {
    return this.http.post<CondominioCriado>(RECURSO, requisicao);
  }

  buscarPorSlug(slug: string, contexto?: HttpContext): Observable<CondominioPublico> {
    return this.http.get<CondominioPublico>(`${RECURSO}/${encodeURIComponent(slug)}`, {
      context: contexto,
    });
  }

  disponibilidade(slug: string): Observable<DisponibilidadeSlug> {
    return this.buscarPorSlug(slug, new HttpContext().set(SEM_TOAST_DE_ERRO, true)).pipe(
      map((): DisponibilidadeSlug => 'em-uso'),
      catchError((erro: unknown) =>
        of<DisponibilidadeSlug>(
          lerErroApi(erro)?.code === CodigoErroCondominio.CONDOMINIO_NAO_ENCONTRADO
            ? 'disponivel'
            : 'desconhecida',
        ),
      ),
    );
  }
}
