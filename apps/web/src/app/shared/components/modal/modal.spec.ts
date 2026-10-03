import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../../../testes/dialogo-nativo';
import { Modal, TipoModal } from './modal';

@Component({
  imports: [Modal],
  template: `
    <button type="button" id="abridor" (click)="modal.abrir()">Abrir</button>
    <ui-modal #modal titulo="Arquivar ocorrência #57" [tipo]="tipo()" [ocupado]="ocupado()" (fechado)="fechamentos = fechamentos + 1">
      @if (tipo() === 'dialog') {
        <label for="motivo">Motivo</label>
        <input id="motivo" />
      } @else {
        O que você escreveu será perdido.
      }
      <ng-container acoes>
        <button
          type="button"
          id="seguro"
          [attr.data-foco-inicial]="tipo() === 'alertdialog' ? '' : null"
          (click)="modal.fechar()"
        >
          Continuar escrevendo
        </button>
        <button type="button" id="destrutivo">Descartar</button>
      </ng-container>
    </ui-modal>
  `,
})
class Hospedeiro {
  readonly tipo = signal<TipoModal>('dialog');
  readonly ocupado = signal(false);
  readonly modal = viewChild.required(Modal);
  fechamentos = 0;
}

describe('ui-modal', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let raiz: HTMLElement;

  const dialogo = () => raiz.querySelector('dialog') as HTMLDialogElement;
  const abridor = () => raiz.querySelector('#abridor') as HTMLButtonElement;

  beforeEach(async () => {
    simularDialogoNativo();
    fixture = TestBed.createComponent(Hospedeiro);
    raiz = fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    await fixture.whenStable();
  });

  afterEach(() => {
    raiz.remove();
    restaurarDialogoNativo();
  });

  async function abrirPeloBotao(): Promise<void> {
    abridor().focus();
    abridor().click();
    await fixture.whenStable();
  }

  it('abre como modal e leva o foco para o primeiro campo', async () => {
    await abrirPeloBotao();

    expect(dialogo().hasAttribute('open')).toBe(true);
    expect(fixture.componentInstance.modal().aberto()).toBe(true);
    expect(document.activeElement?.id).toBe('motivo');
  });

  it('usa o título como nome acessível do diálogo', async () => {
    const idTitulo = dialogo().getAttribute('aria-labelledby') ?? '';

    expect(document.getElementById(idTitulo)?.textContent?.trim()).toBe('Arquivar ocorrência #57');
  });

  it('em confirmação, usa role alertdialog e foca o botão não destrutivo', async () => {
    fixture.componentInstance.tipo.set('alertdialog');
    await fixture.whenStable();

    await abrirPeloBotao();

    expect(dialogo().getAttribute('role')).toBe('alertdialog');
    expect(document.activeElement?.id).toBe('seguro');
    const idCorpo = dialogo().getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(idCorpo)?.textContent).toContain('O que você escreveu será perdido.');
  });

  it('ao fechar, devolve o foco a quem abriu e avisa o fechamento', async () => {
    await abrirPeloBotao();

    fixture.componentInstance.modal().fechar();
    await fixture.whenStable();

    expect(dialogo().hasAttribute('open')).toBe(false);
    expect(fixture.componentInstance.modal().aberto()).toBe(false);
    expect(document.activeElement).toBe(abridor());
    expect(fixture.componentInstance.fechamentos).toBe(1);
  });

  it('o botão Fechar do cabeçalho fecha o diálogo', async () => {
    await abrirPeloBotao();
    const fechar = raiz.querySelector('button[aria-label="Fechar"]') as HTMLButtonElement;

    fechar.click();
    await fixture.whenStable();

    expect(dialogo().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(abridor());
  });

  it('enquanto está ocupado, a pessoa não fecha nem por Esc nem pelo botão Fechar', async () => {
    await abrirPeloBotao();
    fixture.componentInstance.ocupado.set(true);
    await fixture.whenStable();

    const tecla = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    (raiz.querySelector('#motivo') as HTMLInputElement).dispatchEvent(tecla);
    const cancelamento = new Event('cancel', { cancelable: true });
    dialogo().dispatchEvent(cancelamento);
    (raiz.querySelector('button[aria-label="Fechar"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(tecla.defaultPrevented).toBe(true);
    expect(cancelamento.defaultPrevented).toBe(true);
    expect(dialogo().hasAttribute('open')).toBe(true);
  });

  it('a tela ainda fecha pelo método fechar ao concluir o envio', async () => {
    await abrirPeloBotao();
    fixture.componentInstance.ocupado.set(true);
    await fixture.whenStable();

    fixture.componentInstance.modal().fechar();
    await fixture.whenStable();

    expect(dialogo().hasAttribute('open')).toBe(false);
  });

  it('permite o Esc nativo quando não está ocupado', async () => {
    await abrirPeloBotao();

    const tecla = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    dialogo().dispatchEvent(tecla);
    const cancelamento = new Event('cancel', { cancelable: true });
    dialogo().dispatchEvent(cancelamento);

    expect(tecla.defaultPrevented).toBe(false);
    expect(cancelamento.defaultPrevented).toBe(false);
  });
});
