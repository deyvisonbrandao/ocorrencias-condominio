import { computed, Injectable, signal } from '@angular/core';

export type TipoToast = 'sucesso' | 'erro';

export interface Toast {
  readonly id: number;
  readonly tipo: TipoToast;
  readonly mensagem: string;
}

export type MotivoPausa = 'ponteiro' | 'foco';

interface Cronometro {
  restante: number;
  inicio: number;
  temporizador: ReturnType<typeof setTimeout> | null;
  readonly pausas: Set<MotivoPausa>;
}

export const DURACAO_TOAST_SUCESSO_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly lista = signal<readonly Toast[]>([]);
  private readonly cronometros = new Map<number, Cronometro>();
  private proximoId = 0;

  readonly sucessos = computed(() => this.lista().filter((toast) => toast.tipo === 'sucesso'));
  readonly erros = computed(() => this.lista().filter((toast) => toast.tipo === 'erro'));

  sucesso(mensagem: string): number {
    const id = this.adicionar('sucesso', mensagem);
    if (!this.cronometros.has(id)) {
      const cronometro: Cronometro = {
        restante: DURACAO_TOAST_SUCESSO_MS,
        inicio: 0,
        temporizador: null,
        pausas: new Set(),
      };
      this.cronometros.set(id, cronometro);
      this.contar(id, cronometro);
    }
    return id;
  }

  erro(mensagem: string): number {
    return this.adicionar('erro', mensagem);
  }

  fechar(id: number): void {
    const cronometro = this.cronometros.get(id);
    if (cronometro?.temporizador) {
      clearTimeout(cronometro.temporizador);
    }
    this.cronometros.delete(id);
    this.lista.update((lista) => lista.filter((toast) => toast.id !== id));
  }

  pausar(id: number, motivo: MotivoPausa): void {
    const cronometro = this.cronometros.get(id);
    if (!cronometro) {
      return;
    }
    cronometro.pausas.add(motivo);
    if (!cronometro.temporizador) {
      return;
    }
    clearTimeout(cronometro.temporizador);
    cronometro.temporizador = null;
    cronometro.restante -= Date.now() - cronometro.inicio;
  }

  retomar(id: number, motivo: MotivoPausa): void {
    const cronometro = this.cronometros.get(id);
    if (!cronometro) {
      return;
    }
    cronometro.pausas.delete(motivo);
    this.contar(id, cronometro);
  }

  private contar(id: number, cronometro: Cronometro): void {
    if (cronometro.temporizador || cronometro.pausas.size > 0) {
      return;
    }
    cronometro.inicio = Date.now();
    cronometro.temporizador = setTimeout(() => this.fechar(id), Math.max(cronometro.restante, 0));
  }

  private adicionar(tipo: TipoToast, mensagem: string): number {
    const repetido = this.lista().find((toast) => toast.tipo === tipo && toast.mensagem === mensagem);
    if (repetido) {
      return repetido.id;
    }
    this.proximoId += 1;
    const toast: Toast = { id: this.proximoId, tipo, mensagem };
    this.lista.update((lista) => [...lista, toast]);
    return toast.id;
  }
}
