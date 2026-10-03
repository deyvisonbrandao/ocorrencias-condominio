import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ItemNavegacao, Sidebar } from './sidebar';

@Component({ template: '' })
class Vazia {}

function nomeAcessivel(elemento: Element): string {
  const partes: string[] = [];
  const percorrer = (no: Node) => {
    if (no instanceof Element && no.getAttribute('aria-hidden') === 'true') {
      return;
    }
    if (no.nodeType === Node.TEXT_NODE) {
      partes.push(no.textContent ?? '');
      return;
    }
    no.childNodes.forEach(percorrer);
  };
  percorrer(elemento);
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

describe('ui-sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;
  let raiz: HTMLElement;

  const link = (rotulo: string) =>
    [...raiz.querySelectorAll('a')].find((a) => a.textContent?.includes(rotulo)) as HTMLAnchorElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Vazia }])] });
    fixture = TestBed.createComponent(Sidebar);
    const itens: ItemNavegacao[] = [
      { rotulo: 'Moradores', rota: '/admin/moradores', icone: 'usuarios', contador: 3, rotuloContador: 'cadastros pendentes' },
      { rotulo: 'Ocorrências', rota: '/admin/ocorrencias', icone: 'lista', contador: 7 },
      { rotulo: 'Painel', rota: '/admin/painel', icone: 'painel' },
    ];
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('rotulo', 'Navegação da administração');
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('com rótulo do contador, o nome acessível lê o número uma vez só, por extenso', () => {
    expect(nomeAcessivel(link('Moradores'))).toBe('Moradores 3 cadastros pendentes');
  });

  it('sem rótulo do contador, mantém o número visível exposto', () => {
    expect(nomeAcessivel(link('Ocorrências'))).toBe('Ocorrências 7');
  });

  it('sem contador, o nome é só o rótulo do item', () => {
    expect(nomeAcessivel(link('Painel'))).toBe('Painel');
  });

  it('avisa quando um item é escolhido', async () => {
    let escolhas = 0;
    fixture.componentInstance.escolheu.subscribe(() => (escolhas += 1));

    link('Painel').click();
    await fixture.whenStable();

    expect(escolhas).toBe(1);
  });
});
