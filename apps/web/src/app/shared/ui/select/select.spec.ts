import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OpcaoSelect, Select } from './select';

@Component({
  imports: [Select, ReactiveFormsModule],
  template: `
    <ui-select
      rotulo="Urgência"
      dica="O morador não vê a urgência."
      placeholder="Escolha a urgência"
      [opcoes]="opcoes"
      [erro]="erro()"
      [formControl]="controle"
    />
  `,
})
class Hospedeiro {
  readonly opcoes: readonly OpcaoSelect[] = [
    { valor: 'CRITICA', rotulo: 'Crítica' },
    { valor: 'ALTA', rotulo: 'Alta' },
  ];
  readonly erro = signal<string | null>(null);
  readonly controle = new FormControl('', { nonNullable: true });
}

describe('ui-select', () => {
  let fixture: ComponentFixture<Hospedeiro>;
  let raiz: HTMLElement;

  const select = () => raiz.querySelector('select') as HTMLSelectElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Hospedeiro);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('mostra o placeholder como opção desabilitada e selecionada enquanto não há valor', () => {
    const primeira = select().options[0];

    expect(primeira.textContent?.trim()).toBe('Escolha a urgência');
    expect(primeira.disabled).toBe(true);
    expect(select().selectedIndex).toBe(0);
    expect(select().options).toHaveLength(3);
  });

  it('liga o rótulo e a dica ao select', () => {
    expect((raiz.querySelector('label') as HTMLLabelElement).htmlFor).toBe(select().id);
    const idDica = select().getAttribute('aria-describedby');
    expect(raiz.querySelector(`#${idDica}`)?.textContent).toBe('O morador não vê a urgência.');
  });

  it('sincroniza o valor com o formulário nos dois sentidos', async () => {
    const { controle } = fixture.componentInstance;

    controle.setValue('ALTA');
    await fixture.whenStable();
    expect(select().value).toBe('ALTA');

    select().value = 'CRITICA';
    select().dispatchEvent(new Event('change'));
    select().dispatchEvent(new Event('blur'));
    expect(controle.value).toBe('CRITICA');
    expect(controle.touched).toBe(true);
  });

  it('volta ao placeholder quando o formulário é limpo', async () => {
    fixture.componentInstance.controle.setValue('ALTA');
    await fixture.whenStable();

    fixture.componentInstance.controle.reset();
    await fixture.whenStable();

    expect(select().selectedIndex).toBe(0);
  });

  it('com erro: marca aria-invalid e descreve pela mensagem', async () => {
    fixture.componentInstance.erro.set('Escolha a urgência.');
    await fixture.whenStable();

    const ids = (select().getAttribute('aria-describedby') ?? '').split(' ');
    expect(select().getAttribute('aria-invalid')).toBe('true');
    expect(raiz.querySelector(`#${ids[1]}`)?.textContent).toContain('Escolha a urgência.');
  });

  it('respeita o estado desabilitado do formulário', async () => {
    fixture.componentInstance.controle.disable();
    await fixture.whenStable();

    expect(select().disabled).toBe(true);
  });

  it('reserva espaço à direita para a seta', () => {
    expect(select().classList).toContain('pr-10');
    expect(select().classList).not.toContain('px-3');
  });
});
