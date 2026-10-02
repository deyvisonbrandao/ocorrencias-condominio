import { TestBed } from '@angular/core/testing';
import { DURACAO_TOAST_SUCESSO_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  let servico: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    servico = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fecha o toast de sucesso sozinho depois de 5 segundos', () => {
    servico.sucesso('Comentário enviado.');

    vi.advanceTimersByTime(DURACAO_TOAST_SUCESSO_MS - 1);
    expect(servico.sucessos()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(servico.sucessos()).toHaveLength(0);
  });

  it('pausa a contagem enquanto o toast está em foco ou sob o ponteiro', () => {
    const id = servico.sucesso('Comentário enviado.');

    vi.advanceTimersByTime(3000);
    servico.pausar(id);
    vi.advanceTimersByTime(10_000);
    expect(servico.sucessos()).toHaveLength(1);

    servico.retomar(id);
    vi.advanceTimersByTime(1999);
    expect(servico.sucessos()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(servico.sucessos()).toHaveLength(0);
  });

  it('mantém o toast de erro até ser fechado', () => {
    const id = servico.erro('Sem conexão. Verifique a internet e tente de novo.');

    vi.advanceTimersByTime(60_000);
    expect(servico.erros()).toHaveLength(1);

    servico.fechar(id);
    expect(servico.erros()).toHaveLength(0);
  });

  it('não empilha a mesma mensagem repetida', () => {
    const primeiro = servico.erro('Sem conexão. Verifique a internet e tente de novo.');
    const segundo = servico.erro('Sem conexão. Verifique a internet e tente de novo.');

    expect(segundo).toBe(primeiro);
    expect(servico.erros()).toHaveLength(1);
  });

  it('separa sucessos e erros', () => {
    servico.sucesso('Triagem salva.');
    servico.erro('Algo deu errado do nosso lado. Tente de novo em instantes.');

    expect(servico.sucessos().map((toast) => toast.mensagem)).toEqual(['Triagem salva.']);
    expect(servico.erros().map((toast) => toast.mensagem)).toEqual([
      'Algo deu errado do nosso lado. Tente de novo em instantes.',
    ]);
  });
});
