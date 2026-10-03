import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AtualizarCondominioRequisicao, CondominioAdmin } from '@ocorrencias/contratos';
import { Observable } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../../../core/interceptors/erro-http.interceptor';

const CAMINHO = '/admin/condominio';

@Injectable({ providedIn: 'root' })
export class CondominioAdminService {
  private readonly http = inject(HttpClient);

  obter(): Observable<CondominioAdmin> {
    return this.http.get<CondominioAdmin>(CAMINHO, {
      context: new HttpContext().set(SEM_TOAST_DE_ERRO, true),
    });
  }

  atualizar(requisicao: AtualizarCondominioRequisicao): Observable<CondominioAdmin> {
    return this.http.put<CondominioAdmin>(CAMINHO, requisicao);
  }
}
