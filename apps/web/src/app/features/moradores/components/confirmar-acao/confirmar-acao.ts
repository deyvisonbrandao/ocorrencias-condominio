import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AcaoMorador, CodigoErroMorador, MoradorAdmin, REGRAS_MOTIVO_RECUSA } from '@ocorrencias/contratos';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
} from '../../../../core/interceptors/erro-http.interceptor';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { AreaTexto } from '../../../../shared/components/area-texto/area-texto';
import { Botao, VarianteBotao } from '../../../../shared/components/botao/botao';
import { Modal, TipoModal } from '../../../../shared/components/modal/modal';
import { errosPorCampo, lerErroApi } from '../../../../shared/utils/erro-api';
import { maximo, mensagemDeErro, obrigatorio, validarCom } from '../../../../shared/validators/validadores';
import { MoradoresService } from '../../services/moradores.service';
import { PedidoAcao } from '../lista-moradores/lista-moradores';

export interface AcaoConcluida {
  readonly acao: AcaoMorador;
  readonly anterior: MoradorAdmin;
  readonly atualizado: MoradorAdmin;
}

interface TextosDaAcao {
  readonly titulo: (nome: string) => string;
  readonly corpo: ((nome: string) => string) | null;
  readonly confirmar: string;
  readonly confirmando: string;
  readonly variante: VarianteBotao;
  readonly tipo: TipoModal;
}

export const MENSAGEM_MOTIVO_OBRIGATORIO = 'Informe o motivo.';
export const DICA_MOTIVO_RECUSA = 'O motivo fica registrado na auditoria.';
export const MENSAGEM_TRANSICAO_INVALIDA =
  'Esta ação não está mais disponível para este morador. Recarregue para ver o status atual.';
export const MENSAGEM_MORADOR_NAO_ENCONTRADO = 'Morador não encontrado.';

const TEXTOS: Readonly<Record<AcaoMorador, TextosDaAcao>> = {
  aprovar: {
    titulo: (nome) => `Aprovar o cadastro de ${nome}?`,
    corpo: (nome) => `${nome} passa a ter acesso ao condomínio com o telefone e a senha que cadastrou.`,
    confirmar: 'Aprovar',
    confirmando: 'Aprovando…',
    variante: 'primario',
    tipo: 'alertdialog',
  },
  recusar: {
    titulo: (nome) => `Recusar o cadastro de ${nome}?`,
    corpo: null,
    confirmar: 'Recusar',
    confirmando: 'Recusando…',
    variante: 'perigo',
    tipo: 'dialog',
  },
  inativar: {
    titulo: (nome) => `Inativar ${nome}?`,
    corpo: (nome) => `${nome} perde o acesso na hora. Você pode reativar depois.`,
    confirmar: 'Inativar',
    confirmando: 'Inativando…',
    variante: 'perigo',
    tipo: 'alertdialog',
  },
  reativar: {
    titulo: (nome) => `Reativar ${nome}?`,
    corpo: (nome) => `${nome} volta a ter acesso ao condomínio.`,
    confirmar: 'Reativar',
    confirmando: 'Reativando…',
    variante: 'primario',
    tipo: 'alertdialog',
  },
};

@Component({
  selector: 'app-confirmar-acao',
  imports: [ReactiveFormsModule, Alerta, AreaTexto, Botao, Modal],
  template: `
    <ui-modal #modal [titulo]="titulo()" [tipo]="textos().tipo" [ocupado]="enviando()">
      @if (pedido(); as atual) {
        @if (atual.acao === 'recusar') {
          <ui-area-texto
            class="mt-3"
            rotulo="Motivo"
            [dica]="dicaMotivo"
            [linhas]="4"
            [max]="maximoMotivo"
            contador
            [formControl]="motivo"
            [erro]="erroDoMotivo()"
          />
        } @else {
          <p>{{ corpo() }}</p>
        }
        @if (erro(); as mensagem) {
          <ui-alerta class="mt-4" tom="perigo" anunciar>{{ mensagem }}</ui-alerta>
        }
      }
      <ng-container acoes>
        <button
          type="button"
          ui-botao
          variante="secundario"
          [attr.data-foco-inicial]="textos().tipo === 'alertdialog' ? '' : null"
          [desabilitado]="enviando()"
          (click)="modal.fechar()"
        >
          Cancelar
        </button>
        <button
          type="button"
          ui-botao
          [variante]="textos().variante"
          [rotuloCarregando]="textos().confirmando"
          [carregando]="enviando()"
          (click)="confirmar()"
        >
          {{ textos().confirmar }}
        </button>
      </ng-container>
    </ui-modal>
  `,
})
export class ConfirmarAcao {
  private readonly api = inject(MoradoresService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modal = viewChild.required<Modal>('modal');

  readonly concluiu = output<AcaoConcluida>();
  readonly desatualizou = output<string>();

  protected readonly dicaMotivo = DICA_MOTIVO_RECUSA;
  protected readonly maximoMotivo = REGRAS_MOTIVO_RECUSA.max;
  protected readonly pedido = signal<PedidoAcao | null>(null);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  private readonly enviado = signal(false);
  private readonly erroDoServidor = signal<string | null>(null);

  protected readonly textos = computed(() => TEXTOS[this.pedido()?.acao ?? 'aprovar']);
  protected readonly titulo = computed(() => {
    const pedido = this.pedido();
    return pedido ? this.textos().titulo(pedido.morador.nome) : '';
  });
  protected readonly corpo = computed(() => {
    const pedido = this.pedido();
    const corpo = this.textos().corpo;
    return pedido && corpo ? corpo(pedido.morador.nome) : '';
  });

  protected readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: validarCom(obrigatorio(MENSAGEM_MOTIVO_OBRIGATORIO), maximo(REGRAS_MOTIVO_RECUSA.max)),
  });

  constructor() {
    this.motivo.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.erroDoServidor.set(null));
  }

  abrir(pedido: PedidoAcao): void {
    if (this.enviando()) {
      return;
    }
    this.pedido.set(pedido);
    this.enviado.set(false);
    this.erro.set(null);
    this.motivo.reset('', { emitEvent: false });
    this.motivo.enable({ emitEvent: false });
    this.erroDoServidor.set(null);
    afterNextRender(() => this.modal().abrir(), { injector: this.injector });
  }

  protected erroDoMotivo(): string | null {
    return (this.enviado() ? mensagemDeErro(this.motivo) : null) ?? this.erroDoServidor();
  }

  protected confirmar(): void {
    const pedido = this.pedido();
    if (!pedido || this.enviando()) {
      return;
    }
    const recusando = pedido.acao === 'recusar';
    if (recusando) {
      this.enviado.set(true);
      if (this.motivo.invalid) {
        this.focarCampoInvalido();
        return;
      }
    }
    this.erro.set(null);
    this.enviando.set(true);
    this.motivo.disable({ emitEvent: false });
    const { morador, acao } = pedido;
    const envio =
      acao === 'recusar'
        ? this.api.recusar(morador.id, this.motivo.getRawValue().trim())
        : this.api.executar(acao, morador.id);
    envio.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (atualizado) => {
        this.enviando.set(false);
        this.modal().fechar();
        this.concluiu.emit({ acao, anterior: morador, atualizado });
      },
      error: (erro: unknown) => this.falhar(erro),
    });
  }

  private falhar(erro: unknown): void {
    this.enviando.set(false);
    this.motivo.enable({ emitEvent: false });
    const global = erro instanceof HttpErrorResponse ? mensagemDeErroGlobal(erro) : null;
    if (global) {
      this.erro.set(global);
      return;
    }
    const corpo = lerErroApi(erro);
    if (
      corpo?.code === CodigoErroMorador.TRANSICAO_MORADOR_INVALIDA ||
      corpo?.code === CodigoErroMorador.MORADOR_NAO_ENCONTRADO
    ) {
      this.modal().fechar();
      this.desatualizou.emit(
        corpo.code === CodigoErroMorador.TRANSICAO_MORADOR_INVALIDA
          ? MENSAGEM_TRANSICAO_INVALIDA
          : MENSAGEM_MORADOR_NAO_ENCONTRADO,
      );
      return;
    }
    const doMotivo = errosPorCampo(corpo)['motivo'];
    if (doMotivo && this.pedido()?.acao === 'recusar') {
      this.erroDoServidor.set(doMotivo);
      this.focarCampoInvalido();
      return;
    }
    this.erro.set(corpo?.message ?? MENSAGEM_ERRO_INESPERADO);
  }

  private focarCampoInvalido(): void {
    afterNextRender(() => this.elemento.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), {
      injector: this.injector,
    });
  }
}
