import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Botao } from '../../shared/components/botao/botao';
import { EstadoVazio } from '../../shared/components/estados/estado-vazio';

@Component({
  selector: 'app-pagina-nao-encontrada',
  imports: [RouterLink, Botao, EstadoVazio],
  template: `
    <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">Página não encontrada</h1>
    <ui-estado-vazio
      class="mt-6"
      icone="alerta"
      titulo="O endereço não existe"
      texto="Confira o link ou volte para o início."
    >
      <a ui-botao variante="secundario" routerLink="/">Ir para o início</a>
    </ui-estado-vazio>
  `,
})
export class PaginaNaoEncontrada {}
