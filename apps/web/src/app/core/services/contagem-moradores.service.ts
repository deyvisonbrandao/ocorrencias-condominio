import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ContagemMoradores } from '@ocorrencias/contratos';
import { Subscription } from 'rxjs';
import { SEM_TOAST_DE_ERRO } from '../interceptors/erro-http.interceptor';

const CONTAGEM = '/admin/moradores/contagem';

@Injectable({ providedIn: 'root' })
export class ContagemMoradoresService {
  private readonly http = inject(HttpClient);
  private readonly valor = signal<ContagemMoradores | null>(null);
  private pedido: Subscription | null = null;

  readonly contagem = this.valor.asReadonly();
  readonly pendentes = computed(() => this.valor()?.pendentes ?? 0);

  recarregar(): void {
    this.pedido?.unsubscribe();
    // O contador é secundário: se falhar, fica o último valor conhecido e a tela segue sem toast.
    this.pedido = this.http
      .get<ContagemMoradores>(CONTAGEM, { context: new HttpContext().set(SEM_TOAST_DE_ERRO, true) })
      .subscribe({ next: (contagem) => this.valor.set(contagem), error: () => undefined });
  }

  limpar(): void {
    this.pedido?.unsubscribe();
    this.pedido = null;
    this.valor.set(null);
  }
}
