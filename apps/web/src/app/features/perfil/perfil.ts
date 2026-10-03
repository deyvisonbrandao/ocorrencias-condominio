import { Component, inject } from '@angular/core';
import { SessaoService } from '../../core/services/sessao.service';
import { Alerta } from '../../shared/components/alerta/alerta';
import { Botao } from '../../shared/components/botao/botao';
import { EstadoVazio } from '../../shared/components/estados/estado-vazio';
import { Icone } from '../../shared/components/icone/icone';
import { Modal } from '../../shared/components/modal/modal';

@Component({
  selector: 'app-perfil',
  imports: [Alerta, Botao, EstadoVazio, Icone, Modal],
  template: `
    <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">Perfil</h1>
    <ui-estado-vazio
      class="mt-6"
      icone="info"
      titulo="Tela em construção"
      texto="Seus dados e a troca de senha chegam com a issue #9."
    />
    <button type="button" ui-botao variante="texto" class="mt-6" (click)="confirmacao.abrir()">
      <ui-icone nome="sair" />
      Sair
    </button>

    <ui-modal
      #confirmacao
      tipo="alertdialog"
      titulo="Sair da sua conta?"
      [ocupado]="sessao.saindo()"
      (fechado)="sessao.descartarErroAoSair()"
    >
      Para voltar, você vai entrar de novo com telefone e senha.
      @if (sessao.erroAoSair(); as erro) {
        <ui-alerta class="mt-4" tom="perigo" anunciar>{{ erro }}</ui-alerta>
      }
      <ng-container acoes>
        <button
          type="button"
          ui-botao
          variante="secundario"
          data-foco-inicial
          [desabilitado]="sessao.saindo()"
          (click)="confirmacao.fechar()"
        >
          Cancelar
        </button>
        <button type="button" ui-botao rotuloCarregando="Saindo…" [carregando]="sessao.saindo()" (click)="sessao.sair()">
          Sair
        </button>
      </ng-container>
    </ui-modal>
  `,
})
export class Perfil {
  protected readonly sessao = inject(SessaoService);
}
