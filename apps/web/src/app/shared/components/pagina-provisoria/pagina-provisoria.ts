import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EstadoVazio } from '../estados/estado-vazio';

@Component({
  selector: 'app-pagina-provisoria',
  imports: [EstadoVazio],
  template: `
    <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">{{ titulo() }}</h1>
    <ui-estado-vazio class="mt-6" icone="info" titulo="Tela em construção" [texto]="texto()" />
  `,
})
export class PaginaProvisoria {
  private readonly rota = inject(ActivatedRoute);
  private readonly dados = toSignal(this.rota.data, { initialValue: this.rota.snapshot.data });

  protected readonly titulo = toSignal(this.rota.title, { initialValue: this.rota.snapshot.title });
  protected readonly texto = computed(() => {
    const issue: unknown = this.dados()['issue'];
    return typeof issue === 'number'
      ? `Esta tela chega com a issue #${issue}.`
      : 'Esta tela ainda não foi implementada.';
  });
}
