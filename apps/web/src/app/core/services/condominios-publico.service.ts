import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CadastrarCondominioRequisicao,
  CadastrarMoradorRequisicao,
  CondominioCriado,
  CondominioPublico,
  MoradorCadastrado,
} from '@ocorrencias/contratos';
import { catchError, map, Observable, of } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';

export type DisponibilidadeSlug = 'disponivel' | 'em-uso' | 'desconhecida';

const RECURSO = '/public/condominios';

@Injectable({ providedIn: 'root' })
export class CondominiosPublicoService {
  private readonly http = inject(HttpClient);

  cadastrar(requisicao: CadastrarCondominioRequisicao): Observable<CondominioCriado> {
    return this.http.post<CondominioCriado>(RECURSO, requisicao);
  }

  cadastrarMorador(
    slug: string,
    requisicao: CadastrarMoradorRequisicao,
  ): Observable<MoradorCadastrado> {
    return this.http.post<MoradorCadastrado>(
      `${RECURSO}/${encodeURIComponent(slug)}/moradores`,
      requisicao,
    );
  }

  buscarPorSlug(slug: string, contexto?: HttpContext): Observable<CondominioPublico> {
    return this.http.get<CondominioPublico>(`${RECURSO}/${encodeURIComponent(slug)}`, {
      context: contexto,
    });
  }

  disponibilidade(slug: string): Observable<DisponibilidadeSlug> {
    return this.http
      .get<{ disponivel: boolean }>(
        `${RECURSO}/${encodeURIComponent(slug)}/disponibilidade`,
        { context: new HttpContext().set(SEM_TOAST_DE_ERRO, true) },
      )
      .pipe(
        map(({ disponivel }): DisponibilidadeSlug => (disponivel ? 'disponivel' : 'em-uso')),
        catchError(() => of<DisponibilidadeSlug>('desconhecida')),
      );
  }
}
