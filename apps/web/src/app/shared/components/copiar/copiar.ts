import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { Botao } from '../botao/botao';
import { Icone } from '../icone/icone';

type EstadoCopia = 'ocioso' | 'copiado' | 'erro';

export const DURACAO_COPIADO_MS = 2000;
export const MENSAGEM_FALHA_COPIA = 'Não foi possível copiar. Selecione o link e copie.';

@Component({
  selector: 'ui-copiar',
  imports: [Botao, Icone],
  host: { class: 'block' },
  template: `
    <button type="button" ui-botao variante="secundario" [bloco]="bloco()" (click)="copiar()">
      <ui-icone [nome]="estado() === 'copiado' ? 'check' : 'copiar'" />
      {{ estado() === 'copiado' ? rotuloCopiado() : rotulo() }}
    </button>
    @if (estado() === 'erro') {
      <p class="mt-2 flex items-start gap-1.5 text-sm font-medium text-perigo">
        <ui-icone nome="alerta" [tamanho]="16" class="mt-0.5" />
        <span>{{ mensagemFalha }}</span>
      </p>
    }
    <span class="sr-only" aria-live="polite">{{ anuncio() }}</span>
  `,
})
export class Copiar {
  readonly valor = input.required<string>();
  readonly rotulo = input('Copiar link');
  readonly rotuloCopiado = input('Link copiado');
  readonly bloco = input(false, { transform: booleanAttribute });

  protected readonly mensagemFalha = MENSAGEM_FALHA_COPIA;
  protected readonly estado = signal<EstadoCopia>('ocioso');
  protected readonly anuncio = computed(() => {
    switch (this.estado()) {
      case 'copiado':
        return `${this.rotuloCopiado()}.`;
      case 'erro':
        return MENSAGEM_FALHA_COPIA;
      default:
        return '';
    }
  });

  private readonly navegador = inject(DOCUMENT).defaultView?.navigator;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limparTemporizador());
  }

  protected async copiar(): Promise<void> {
    this.limparTemporizador();
    this.estado.set('ocioso');
    try {
      if (!this.navegador?.clipboard) {
        throw new Error('Área de transferência indisponível');
      }
      await this.navegador.clipboard.writeText(this.valor());
      this.estado.set('copiado');
      this.temporizador = setTimeout(() => this.estado.set('ocioso'), DURACAO_COPIADO_MS);
    } catch {
      this.estado.set('erro');
    }
  }

  private limparTemporizador(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
