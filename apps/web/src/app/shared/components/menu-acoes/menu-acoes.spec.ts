import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemMenu, MenuAcoes } from './menu-acoes';

@Component({
  imports: [MenuAcoes, ItemMenu],
  template: `
    <ui-menu-acoes rotulo="Mais ações para Ana Lima">
      <button ui-item-menu (click)="escolhido = 'editar'">Editar</button>
      <button ui-item-menu perigo (click)="escolhido = 'inativar'">Inativar</button>
    </ui-menu-acoes>
    <button type="button" id="fora">Fora</button>
  `,
})
class Hospedeiro {
  escolhido: string | null = null;
}

describe('ui-menu-acoes', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let raiz: HTMLElement;

  const gatilho = () => raiz.querySelector('button[aria-label="Mais ações para Ana Lima"]') as HTMLButtonElement;
  const painel = () => raiz.querySelector(`#${gatilho().getAttribute('aria-controls')}`) as HTMLElement;
  const item = (rotulo: string) =>
    [...painel().querySelectorAll('button')].find((b) => b.textContent?.trim() === rotulo) as HTMLButtonElement;
  const tecla = (alvo: HTMLElement, key: string) =>
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  async function abrir(): Promise<void> {
    gatilho().focus();
    gatilho().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(Hospedeiro);
    raiz = fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    await fixture.whenStable();
  });

  afterEach(() => raiz.remove());

  it('começa fechado, com o botão ícone ligado ao painel', () => {
    expect(gatilho().getAttribute('aria-expanded')).toBe('false');
    expect(painel().hidden).toBe(true);
  });

  it('abre, informa aria-expanded e leva o foco ao primeiro item', async () => {
    await abrir();

    expect(gatilho().getAttribute('aria-expanded')).toBe('true');
    expect(painel().hidden).toBe(false);
    expect(document.activeElement).toBe(item('Editar'));
  });

  it('setas percorrem os itens em ciclo', async () => {
    await abrir();

    tecla(item('Editar'), 'ArrowDown');
    expect(document.activeElement).toBe(item('Inativar'));

    tecla(item('Inativar'), 'ArrowDown');
    expect(document.activeElement).toBe(item('Editar'));

    tecla(item('Editar'), 'ArrowUp');
    expect(document.activeElement).toBe(item('Inativar'));
  });

  it('Esc fecha e devolve o foco ao botão', async () => {
    await abrir();

    tecla(item('Editar'), 'Escape');
    await fixture.whenStable();

    expect(painel().hidden).toBe(true);
    expect(document.activeElement).toBe(gatilho());
  });

  it('escolher um item executa a ação, fecha o menu e deixa o foco no botão', async () => {
    await abrir();

    item('Inativar').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.escolhido).toBe('inativar');
    expect(painel().hidden).toBe(true);
    expect(document.activeElement).toBe(gatilho());
  });

  it('clicar fora fecha o menu', async () => {
    await abrir();

    (raiz.querySelector('#fora') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(painel().hidden).toBe(true);
  });

  it('o mesmo botão alterna entre abrir e fechar', async () => {
    await abrir();

    gatilho().click();
    await fixture.whenStable();

    expect(gatilho().getAttribute('aria-expanded')).toBe('false');
  });
});
