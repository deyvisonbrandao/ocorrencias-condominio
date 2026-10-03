import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Botao } from '../botao/botao';

@Component({
  selector: 'ui-condominio-nao-encontrado',
  imports: [RouterLink, Botao],
  host: { class: 'block' },
  template: `
    <p class="mt-2 text-base text-texto-secundario">
      Confira o link com a administração do seu condomínio.
    </p>
    <a ui-botao variante="secundario" routerLink="/" class="mt-6">Ir para o início</a>
  `,
})
export class CondominioNaoEncontrado {}
