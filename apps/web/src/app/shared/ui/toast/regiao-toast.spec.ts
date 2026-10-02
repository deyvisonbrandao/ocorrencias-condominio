import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegiaoToast } from './regiao-toast';
import { Toast, ToastService } from './toast.service';

describe('ui-regiao-toast', () => {
  let fixture: ComponentFixture<RegiaoToast>;
  let raiz: HTMLElement;
  const lista = signal<Toast[]>([]);
  const servico = {
    sucessos: computed(() => lista().filter((toast) => toast.tipo === 'sucesso')),
    erros: computed(() => lista().filter((toast) => toast.tipo === 'erro')),
    fechar: vi.fn(),
    pausar: vi.fn(),
    retomar: vi.fn(),
  };

  beforeEach(async () => {
    lista.set([
      { id: 1, tipo: 'sucesso', mensagem: 'Triagem salva.' },
      { id: 2, tipo: 'erro', mensagem: 'Sem conexão. Verifique a internet e tente de novo.' },
    ]);
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: servico }] });
    fixture = TestBed.createComponent(RegiaoToast);
    raiz = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('anuncia sucesso em região polite e erro em role="alert"', () => {
    expect(raiz.querySelector('[aria-live="polite"]')?.textContent).toContain('Triagem salva.');
    expect(raiz.querySelector('[role="alert"]')?.textContent).toContain('Sem conexão.');
  });

  it('o botão "Fechar aviso" fecha o toast correspondente', () => {
    const botoes = raiz.querySelectorAll<HTMLButtonElement>('button[aria-label="Fechar aviso"]');

    botoes[1].click();

    expect(servico.fechar).toHaveBeenCalledWith(2);
  });

  it('pausa o sucesso com o ponteiro ou o foco e retoma ao sair', () => {
    const cartao = raiz.querySelector('[aria-live="polite"] > div') as HTMLElement;

    cartao.dispatchEvent(new Event('mouseenter'));
    cartao.dispatchEvent(new Event('focusout'));

    expect(servico.pausar).toHaveBeenCalledWith(1);
    expect(servico.retomar).toHaveBeenCalledWith(1);
  });
});
