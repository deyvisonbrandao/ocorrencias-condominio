import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink } from '@angular/router';
import { Botao } from './botao';

@Component({
  imports: [Botao],
  template: `
    <button
      type="button"
      ui-botao
      rotuloCarregando="Registrando…"
      [carregando]="carregando()"
      [desabilitado]="desabilitado()"
      (click)="cliques = cliques + 1"
    >
      Registrar ocorrência
    </button>
  `,
})
class Hospedeiro {
  readonly carregando = signal(false);
  readonly desabilitado = signal(false);
  cliques = 0;
}

describe('ui-botao', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let botao: HTMLButtonElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Hospedeiro);
    await fixture.whenStable();
    botao = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  });

  it('repassa o clique quando está ocioso', () => {
    botao.click();

    expect(fixture.componentInstance.cliques).toBe(1);
    expect(botao.getAttribute('aria-disabled')).toBeNull();
    expect(botao.getAttribute('aria-busy')).toBeNull();
  });

  it('carregando: bloqueia clique duplo, anuncia ocupado e troca o rótulo pelo gerúndio', async () => {
    fixture.componentInstance.carregando.set(true);
    await fixture.whenStable();

    botao.click();
    botao.click();

    expect(fixture.componentInstance.cliques).toBe(0);
    expect(botao.getAttribute('aria-busy')).toBe('true');
    expect(botao.getAttribute('aria-disabled')).toBe('true');
    expect(botao.disabled).toBe(false);
    expect(botao.innerText ?? botao.textContent).toContain('Registrando…');
    expect(botao.querySelector('span.hidden')?.textContent).toContain('Registrar ocorrência');
  });

  it('desabilitado: continua focável, mas não executa a ação', async () => {
    fixture.componentInstance.desabilitado.set(true);
    await fixture.whenStable();

    botao.click();

    expect(fixture.componentInstance.cliques).toBe(0);
    expect(botao.getAttribute('aria-disabled')).toBe('true');
    expect(botao.disabled).toBe(false);
  });

  it('impede o envio de formulário enquanto carrega', async () => {
    fixture.componentInstance.carregando.set(true);
    await fixture.whenStable();
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });

    botao.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
  });
});

@Component({ template: '<h1>Destino</h1>' })
class Destino {}

@Component({
  imports: [Botao, RouterLink],
  template: `<a ui-botao routerLink="/destino" [desabilitado]="desabilitado()">Ir para o destino</a>`,
})
class HospedeiroLink {
  readonly desabilitado = signal(true);
}

describe('a[ui-botao]', () => {
  let fixture: ComponentFixture<HospedeiroLink>;
  let link: HTMLAnchorElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'destino', component: Destino }])],
    });
    fixture = TestBed.createComponent(HospedeiroLink);
    await fixture.whenStable();
    link = (fixture.nativeElement as HTMLElement).querySelector('a') as HTMLAnchorElement;
  });

  it('desabilitado: não navega pelo routerLink nem segue o href', async () => {
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });

    link.dispatchEvent(evento);
    await fixture.whenStable();

    expect(evento.defaultPrevented).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/');
    expect(link.getAttribute('aria-disabled')).toBe('true');
  });

  it('habilitado: navega pelo routerLink', async () => {
    fixture.componentInstance.desabilitado.set(false);
    await fixture.whenStable();

    link.click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/destino');
  });
});
