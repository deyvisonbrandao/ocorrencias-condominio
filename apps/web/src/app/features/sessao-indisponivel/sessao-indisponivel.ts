import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ROTA_SESSAO_INDISPONIVEL } from '../../core/services/navegacao-da-sessao';
import { EstadoErro } from '../../shared/components/estados/estado-erro';

@Component({
  selector: 'app-sessao-indisponivel',
  imports: [EstadoErro],
  template: `
    <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">
      Não foi possível abrir a página
    </h1>
    <ui-estado-erro class="mt-6" titulo="Não foi possível verificar sua sessão." (tentarDeNovo)="tentarDeNovo()" />
  `,
})
export class SessaoIndisponivel {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected tentarDeNovo(): void {
    const destino = this.location.path();
    const caminho = destino.split(/[?#]/, 1)[0];
    void this.router.navigateByUrl(caminho === '' || caminho === ROTA_SESSAO_INDISPONIVEL ? '/' : destino);
  }
}
