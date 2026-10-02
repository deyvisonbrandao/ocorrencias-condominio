import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Botao } from '../../shared/ui/botao/botao';
import { Icone } from '../../shared/ui/icone/icone';
import { NomeIcone } from '../../shared/ui/icone/icones';

interface Destaque {
  readonly titulo: string;
  readonly icone: NomeIcone;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, Botao, Icone],
  template: `
    <section class="py-4 md:py-8">
      <h1 tabindex="-1" class="text-3xl leading-9 font-bold md:text-4xl md:leading-10">
        Ocorrências do condomínio, organizadas
      </h1>
      <p class="mt-3 text-base text-texto-secundario">
        Os moradores registram pelo celular e o síndico acompanha tudo num só lugar.
      </p>
      <a ui-botao bloco routerLink="/cadastrar-condominio" class="mt-6">Cadastrar meu condomínio</a>
    </section>

    <ul class="mt-8 grid gap-3 md:grid-cols-3">
      @for (destaque of destaques; track destaque.titulo) {
        <li class="flex items-center gap-3 rounded-cartao border border-borda bg-superficie p-4 md:flex-col md:items-start">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-controle bg-primaria-suave text-primaria">
            <ui-icone [nome]="destaque.icone" />
          </span>
          <p class="text-base font-semibold">{{ destaque.titulo }}</p>
        </li>
      }
    </ul>
  `,
})
export class Landing {
  protected readonly destaques: readonly Destaque[] = [
    { titulo: 'Moradores registram em 1 minuto', icone: 'relogio' },
    { titulo: 'Reclamações ficam restritas à administração', icone: 'cadeado' },
    { titulo: 'Prazos e histórico em cada ocorrência', icone: 'lista' },
  ];
}
