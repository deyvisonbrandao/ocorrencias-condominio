import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Campo, TipoCampo } from './campo';

@Component({
  imports: [Campo, ReactiveFormsModule],
  template: `
    <ui-campo
      rotulo="Título"
      [tipo]="tipo()"
      [dica]="dica()"
      [erro]="erro()"
      [opcional]="opcional()"
      [formControl]="controle"
    />
  `,
})
class Hospedeiro {
  readonly tipo = signal<TipoCampo>('text');
  readonly dica = signal<string | undefined>('Resuma em poucas palavras.');
  readonly erro = signal<string | null>(null);
  readonly opcional = signal(false);
  readonly controle = new FormControl('', { nonNullable: true });
}

describe('ui-campo', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let raiz: HTMLElement;

  const entrada = () => raiz.querySelector('input') as HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Hospedeiro);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('liga o rótulo visível ao campo', () => {
    const rotulo = raiz.querySelector('label') as HTMLLabelElement;

    expect(rotulo.htmlFor).toBe(entrada().id);
    expect(rotulo.textContent?.trim()).toBe('Título');
  });

  it('descreve o campo pela dica e não marca inválido sem erro', () => {
    const idDica = entrada().getAttribute('aria-describedby');

    expect(raiz.querySelector(`#${idDica}`)?.textContent).toBe('Resuma em poucas palavras.');
    expect(entrada().getAttribute('aria-invalid')).toBeNull();
  });

  it('com erro: marca aria-invalid e inclui a mensagem no aria-describedby', async () => {
    fixture.componentInstance.erro.set('Informe um título.');
    await fixture.whenStable();

    const ids = (entrada().getAttribute('aria-describedby') ?? '').split(' ');

    expect(entrada().getAttribute('aria-invalid')).toBe('true');
    expect(ids).toHaveLength(2);
    expect(raiz.querySelector(`#${ids[1]}`)?.textContent).toContain('Informe um título.');
  });

  it('sem dica nem erro, não deixa aria-describedby vazio', async () => {
    fixture.componentInstance.dica.set(undefined);
    await fixture.whenStable();

    expect(entrada().hasAttribute('aria-describedby')).toBe(false);
  });

  it('marca o campo opcional no rótulo', async () => {
    fixture.componentInstance.opcional.set(true);
    await fixture.whenStable();

    expect(raiz.querySelector('label')?.textContent).toContain('(opcional)');
  });

  it('sincroniza o valor com o formulário nos dois sentidos', async () => {
    const { controle } = fixture.componentInstance;

    controle.setValue('Portão quebrado');
    await fixture.whenStable();
    expect(entrada().value).toBe('Portão quebrado');

    entrada().value = 'Elevador parado';
    entrada().dispatchEvent(new Event('input'));
    entrada().dispatchEvent(new Event('blur'));
    expect(controle.value).toBe('Elevador parado');
    expect(controle.touched).toBe(true);
  });

  it('respeita o estado desabilitado do formulário', async () => {
    fixture.componentInstance.controle.disable();
    await fixture.whenStable();

    expect(entrada().disabled).toBe(true);
  });

  it('senha: o botão Mostrar senha alterna o tipo e o aria-pressed', async () => {
    fixture.componentInstance.tipo.set('password');
    await fixture.whenStable();
    const mostrar = raiz.querySelector('button[aria-label="Mostrar senha"]') as HTMLButtonElement;

    expect(entrada().type).toBe('password');
    expect(mostrar.getAttribute('aria-pressed')).toBe('false');

    mostrar.click();
    await fixture.whenStable();

    expect(entrada().type).toBe('text');
    expect(mostrar.getAttribute('aria-pressed')).toBe('true');
  });
});

@Component({
  imports: [Campo, ReactiveFormsModule],
  template: `
    <ui-campo rotulo="Telefone" tipo="tel" mascara="telefone" [formControl]="controle">
      <p class="status">Conteúdo abaixo do campo</p>
    </ui-campo>
  `,
})
class HospedeiroTelefone {
  readonly controle = new FormControl('', { nonNullable: true });
}

describe('ui-campo com máscara de telefone', () => {
  let fixture: ComponentFixture<HospedeiroTelefone>;
  let raiz: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HospedeiroTelefone);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('formata o que é digitado e entrega o texto formatado ao formulário', () => {
    const entrada = raiz.querySelector('input') as HTMLInputElement;

    entrada.value = '11912345678';
    entrada.dispatchEvent(new Event('input'));

    expect(entrada.value).toBe('(11) 91234-5678');
    expect(fixture.componentInstance.controle.value).toBe('(11) 91234-5678');
  });

  it('mostra o conteúdo projetado junto ao campo', () => {
    expect(raiz.querySelector('ui-moldura-campo .status')?.textContent).toBe('Conteúdo abaixo do campo');
  });
});
