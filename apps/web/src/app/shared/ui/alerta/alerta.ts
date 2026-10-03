import { booleanAttribute, Component, computed, input } from '@angular/core';
import { Icone } from '../icone/icone';
import { NomeIcone } from '../icone/icones';

export type TomAlerta = 'info' | 'aviso' | 'perigo' | 'sucesso';

interface ApresentacaoAlerta {
  readonly classes: string;
  readonly icone: NomeIcone;
}

const TONS: Readonly<Record<TomAlerta, ApresentacaoAlerta>> = {
  info: { classes: 'border-info-linha bg-info-suave text-info-texto', icone: 'info' },
  aviso: { classes: 'border-aviso-linha bg-aviso-suave text-aviso-texto', icone: 'alerta' },
  perigo: { classes: 'border-perigo-linha bg-perigo-suave text-perigo-texto', icone: 'alerta' },
  sucesso: { classes: 'border-sucesso-linha bg-sucesso-suave text-sucesso-texto', icone: 'check-circulo' },
};

@Component({
  selector: 'ui-alerta',
  imports: [Icone],
  host: {
    class: 'flex items-start gap-3 rounded-cartao border p-4 text-sm',
    '[class]': 'apresentacao().classes',
    '[attr.role]': 'anunciar() ? "alert" : null',
  },
  template: `
    <ui-icone [nome]="apresentacao().icone" class="mt-0.5" />
    <div class="min-w-0 flex-1">
      @if (titulo()) {
        <p class="font-semibold">{{ titulo() }}</p>
      }
      <div [class.mt-1]="!!titulo()">
        <ng-content />
      </div>
      <ng-content select="[acao]" />
    </div>
  `,
})
export class Alerta {
  readonly tom = input<TomAlerta>('info');
  readonly titulo = input<string>();
  readonly anunciar = input(false, { transform: booleanAttribute });

  protected readonly apresentacao = computed(() => TONS[this.tom()]);
}
