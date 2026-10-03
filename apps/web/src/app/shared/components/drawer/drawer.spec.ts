import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../../../testes/dialogo-nativo';
import { Drawer, LadoDrawer } from './drawer';

@Component({
  imports: [Drawer],
  template: `
    <button type="button" id="abridor" (click)="gaveta.abrir()">Filtros</button>
    <ui-drawer #gaveta titulo="Filtros" rotuloFechar="Fechar filtros" [lado]="lado()" (fechado)="fechamentos = fechamentos + 1">
      <a href="/destino" id="item">Item</a>
    </ui-drawer>
  `,
})
class Hospedeiro {
  readonly lado = signal<LadoDrawer>('esquerda');
  readonly drawer = viewChild.required(Drawer);
  fechamentos = 0;
}

describe('ui-drawer', () => {
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

  async function abrir(): Promise<void> {
    abridor().focus();
    abridor().click();
    await fixture.whenStable();
  }

  it('abre como diálogo modal nomeado pelo título', async () => {
    await abrir();

    expect(dialogo().hasAttribute('open')).toBe(true);
    expect(fixture.componentInstance.drawer().aberto()).toBe(true);
    const idTitulo = dialogo().getAttribute('aria-labelledby') ?? '';
    expect(raiz.querySelector(`#${idTitulo}`)?.textContent?.trim()).toBe('Filtros');
  });

  it('o botão de fechar tem nome próprio, fecha e devolve o foco a quem abriu', async () => {
    await abrir();
    const fechar = raiz.querySelector('button[aria-label="Fechar filtros"]') as HTMLButtonElement;

    fechar.click();
    await fixture.whenStable();

    expect(dialogo().hasAttribute('open')).toBe(false);
    expect(fixture.componentInstance.drawer().aberto()).toBe(false);
    expect(document.activeElement).toBe(abridor());
    expect(fixture.componentInstance.fechamentos).toBe(1);
  });

  it('fecha pelo método público', async () => {
    await abrir();

    fixture.componentInstance.drawer().fechar();
    await fixture.whenStable();

    expect(dialogo().hasAttribute('open')).toBe(false);
  });

  it.each([
    ['esquerda', 'ui-dialogo-esquerda'],
    ['base', 'ui-dialogo-folha'],
  ] as const)('lado %s usa a animação %s', async (lado, classe) => {
    fixture.componentInstance.lado.set(lado);
    await fixture.whenStable();

    expect(dialogo().classList).toContain(classe);
  });
});
