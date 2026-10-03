import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CaixaSelecao } from './caixa-selecao';

@Component({
  imports: [CaixaSelecao, ReactiveFormsModule],
  template: `
    <ui-caixa-selecao [formControl]="controle" [erro]="erro()">
      Li e aceito os <a href="/termos">termos de uso</a>
    </ui-caixa-selecao>
  `,
})
class Hospedeiro {
  readonly controle = new FormControl(false, { nonNullable: true });
  readonly erro = signal<string | null>(null);
}

describe('ui-caixa-selecao', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let raiz: HTMLElement;

  const caixa = () => raiz.querySelector('input[type="checkbox"]') as HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Hospedeiro);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('o rótulo projetado, com links, nomeia a caixa', () => {
    const rotulo = caixa().closest('label');

    expect(rotulo?.textContent).toContain('Li e aceito os termos de uso');
    expect(rotulo?.querySelector('a')?.getAttribute('href')).toBe('/termos');
  });

  it('sincroniza o valor com o formulário nos dois sentidos', async () => {
    const { controle } = fixture.componentInstance;

    caixa().click();
    caixa().dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(controle.value).toBe(true);
    expect(controle.touched).toBe(true);

    controle.setValue(false);
    await fixture.whenStable();
    expect(caixa().checked).toBe(false);
  });

  it('com erro: marca aria-invalid e descreve a caixa pela mensagem', async () => {
    fixture.componentInstance.erro.set('Para continuar, aceite os termos.');
    await fixture.whenStable();

    const idErro = caixa().getAttribute('aria-describedby');
    expect(caixa().getAttribute('aria-invalid')).toBe('true');
    expect(raiz.querySelector(`#${idErro}`)?.textContent).toContain(
      'Para continuar, aceite os termos.',
    );
  });

  it('sem erro, não deixa aria-invalid nem aria-describedby', () => {
    expect(caixa().hasAttribute('aria-invalid')).toBe(false);
    expect(caixa().hasAttribute('aria-describedby')).toBe(false);
  });

  it('respeita o estado desabilitado do formulário', async () => {
    fixture.componentInstance.controle.disable();
    await fixture.whenStable();

    expect(caixa().disabled).toBe(true);
  });
});
