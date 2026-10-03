import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Botao } from '../../../../shared/components/botao/botao';
import { Campo } from '../../../../shared/components/campo/campo';
import { Copiar } from '../../../../shared/components/copiar/copiar';
import { Icone } from '../../../../shared/components/icone/icone';
import { QrCode } from '../../../../shared/components/qrcode/qrcode';
import { MENSAGEM_FALHA_QRCODE, QrCodeService } from '../../../../shared/services/qrcode.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-link-de-cadastro',
  imports: [ReactiveFormsModule, RouterLink, Botao, Campo, Copiar, Icone, QrCode],
  host: { class: 'block' },
  template: `
    <ui-campo
      rotulo="Link completo"
      dica="Moradores usam este link para se cadastrar e registrar ocorrências."
      somenteLeitura
      [corretor]="false"
      [formControl]="campoLink"
    />
    <ui-copiar class="mt-4" bloco [valor]="url()" />
    <div class="mt-6 flex justify-center md:justify-start">
      <ui-qrcode [url]="url()" [descricao]="descricaoQr()" />
    </div>
    <div class="mt-6 flex flex-col gap-3 md:flex-row">
      <button
        type="button"
        ui-botao
        variante="secundario"
        bloco
        rotuloCarregando="Gerando PNG…"
        [carregando]="baixando()"
        (click)="baixar()"
      >
        <ui-icone nome="baixar" />
        Baixar QR code (PNG)
      </button>
      <a ui-botao variante="secundario" bloco routerLink="/admin/condominio/cartaz">
        <ui-icone nome="imprimir" />
        Imprimir cartaz
      </a>
    </div>
  `,
})
export class LinkDeCadastro {
  readonly url = input.required<string>();
  readonly nome = input.required<string>();
  readonly slug = input.required<string>();

  private readonly qrcode = inject(QrCodeService);
  private readonly toasts = inject(ToastService);

  protected readonly campoLink = new FormControl('', { nonNullable: true });
  protected readonly baixando = signal(false);
  protected readonly descricaoQr = computed(() => `QR code do link de cadastro do ${this.nome()}`);

  constructor() {
    effect(() => this.campoLink.setValue(this.url()));
  }

  protected async baixar(): Promise<void> {
    if (this.baixando()) {
      return;
    }
    this.baixando.set(true);
    try {
      await this.qrcode.baixarPng(this.url(), `qrcode-${this.slug()}.png`);
    } catch {
      this.toasts.erro(MENSAGEM_FALHA_QRCODE);
    } finally {
      this.baixando.set(false);
    }
  }
}
