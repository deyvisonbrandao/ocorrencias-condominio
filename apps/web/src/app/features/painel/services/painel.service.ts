import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PainelAdmin } from '@ocorrencias/contratos';
import { Observable } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../../../core/interceptors/erro-http.interceptor';

@Injectable({ providedIn: 'root' })
export class PainelService {
  private readonly http = inject(HttpClient);

  obter(): Observable<PainelAdmin> {
    return this.http.get<PainelAdmin>('/admin/painel', {
      context: new HttpContext().set(SEM_TOAST_DE_ERRO, true),
    });
  }
}
