import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AreaTexto } from './area-texto';

describe('ui-area-texto', () => {
  let fixture: ComponentFixture<AreaTexto>;
  let raiz: HTMLElement;

  const area = () => raiz.querySelector('textarea') as HTMLTextAreaElement;
  const anuncio = () => raiz.querySelector('[aria-live="polite"]')?.textContent?.trim() ?? '';

  async function digitar(texto: string): Promise<void> {
    area().value = texto;
    area().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(AreaTexto);
    fixture.componentRef.setInput('rotulo', 'Descrição');
    fixture.componentRef.setInput('min', 20);
    fixture.componentRef.setInput('max', 200);
    fixture.componentRef.setInput('contador', true);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('mostra o contador n/max', async () => {
    await digitar('abc');

    expect(raiz.textContent).toContain('3/200');
  });

  it('não anuncia a cada tecla antes de um limiar', async () => {
    await digitar('a'.repeat(5));
    await digitar('a'.repeat(10));

    expect(anuncio()).toBe('');
  });

  it('anuncia uma vez ao cruzar o mínimo', async () => {
    await digitar('a'.repeat(19));
    await digitar('a'.repeat(20));

    expect(anuncio()).toBe('Mínimo de 20 caracteres atingido.');
  });

  it('anuncia quando faltam 100 caracteres para o máximo', async () => {
    await digitar('a'.repeat(99));
    await digitar('a'.repeat(100));

    expect(anuncio()).toBe('Restam 100 caracteres.');
  });

  it('limita o texto ao máximo', () => {
    expect(area().getAttribute('maxlength')).toBe('200');
  });
});
