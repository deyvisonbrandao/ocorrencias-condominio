import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  StatusOcorrencia,
  TipoOcorrencia,
  Urgencia,
} from '@ocorrencias/contratos';
import { Abas, Aba } from '../shared/ui/abas/abas';
import { Alerta } from '../shared/ui/alerta/alerta';
import { AreaTexto } from '../shared/ui/area-texto/area-texto';
import { BadgeStatus } from '../shared/ui/badge/badge-status';
import { BadgeTipo } from '../shared/ui/badge/badge-tipo';
import { BadgeUrgencia } from '../shared/ui/badge/badge-urgencia';
import { Marcador } from '../shared/ui/badge/marcador';
import { Botao } from '../shared/ui/botao/botao';
import { CaixaSelecao } from '../shared/ui/caixa-selecao/caixa-selecao';
import { Campo } from '../shared/ui/campo/campo';
import { Copiar } from '../shared/ui/copiar/copiar';
import { TIPO_OCORRENCIA, URGENCIA } from '../shared/ui/dominio';
import { Drawer } from '../shared/ui/drawer/drawer';
import { EstadoErro } from '../shared/ui/estados/estado-erro';
import { EstadoVazio } from '../shared/ui/estados/estado-vazio';
import { Skeleton } from '../shared/ui/estados/skeleton';
import { Icone } from '../shared/ui/icone/icone';
import { Modal } from '../shared/ui/modal/modal';
import { OpcaoSelect, Select } from '../shared/ui/select/select';
import { ToastService } from '../shared/ui/toast/toast.service';

@Component({
  selector: 'app-vitrine-ui',
  imports: [
    ReactiveFormsModule,
    Abas,
    Alerta,
    AreaTexto,
    BadgeStatus,
    BadgeTipo,
    BadgeUrgencia,
    Marcador,
    Botao,
    CaixaSelecao,
    Campo,
    Copiar,
    Drawer,
    EstadoErro,
    EstadoVazio,
    Skeleton,
    Icone,
    Modal,
    Select,
  ],
  templateUrl: './vitrine-ui.html',
})
export class VitrineUi {
  private readonly toasts = inject(ToastService);

  protected readonly status = Object.values(StatusOcorrencia);
  protected readonly tipos = Object.values(TipoOcorrencia);
  protected readonly urgencias: readonly (Urgencia | null)[] = [null, ...Object.values(Urgencia)];
  protected readonly opcoesUrgencia: readonly OpcaoSelect[] = Object.values(Urgencia)
    .reverse()
    .map((valor) => ({ valor, rotulo: URGENCIA[valor].rotulo }));
  protected readonly abas: readonly Aba[] = [
    { rotulo: 'Pendentes', rota: '/dev/ui', queryParams: { aba: 'pendentes' }, contador: 3 },
    { rotulo: 'Ativos', rota: '/dev/ui', queryParams: { aba: 'ativos' } },
    { rotulo: 'Recusados e inativos', rota: '/dev/ui', queryParams: { aba: 'recusados' } },
  ];

  protected readonly opcoesTipo: readonly OpcaoSelect[] = Object.values(TipoOcorrencia).map(
    (valor) => ({ valor, rotulo: TIPO_OCORRENCIA[valor].rotulo }),
  );

  protected readonly carregando = signal(false);
  protected readonly arquivando = signal(false);
  protected readonly enviado = signal(false);

  protected readonly formulario = new FormGroup({
    titulo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.minLength(8)] }),
    local: new FormControl('', { nonNullable: true }),
    prazo: new FormControl('', { nonNullable: true }),
    urgencia: new FormControl('', { nonNullable: true }),
    descricao: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(20)],
    }),
    aceite: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  protected erroDoTitulo(): string | null {
    const controle = this.formulario.controls.titulo;
    if (!this.enviado() || controle.valid) {
      return null;
    }
    return controle.hasError('required') ? 'Informe um título.' : 'Use pelo menos 5 caracteres.';
  }

  protected erroDaSenha(): string | null {
    const controle = this.formulario.controls.senha;
    return this.enviado() && controle.invalid ? 'A senha precisa ter pelo menos 8 caracteres.' : null;
  }

  protected erroDaDescricao(): string | null {
    const controle = this.formulario.controls.descricao;
    if (!this.enviado() || controle.valid) {
      return null;
    }
    return controle.hasError('required')
      ? 'Descreva a ocorrência.'
      : 'A descrição precisa ter pelo menos 20 caracteres.';
  }

  protected erroDoAceite(): string | null {
    return this.enviado() && this.formulario.controls.aceite.invalid
      ? 'Para continuar, aceite os termos de uso e a política de privacidade.'
      : null;
  }

  protected validar(): void {
    this.enviado.set(true);
  }

  protected simularEnvio(): void {
    this.carregando.set(true);
    setTimeout(() => {
      this.carregando.set(false);
      this.toasts.sucesso('Ocorrência #63 registrada.');
    }, 1500);
  }

  protected arquivar(modal: Modal): void {
    this.arquivando.set(true);
    setTimeout(() => {
      this.arquivando.set(false);
      modal.fechar();
      this.toasts.sucesso('Ocorrência arquivada.');
    }, 4000);
  }

  protected mostrarSucesso(): void {
    this.toasts.sucesso('Comentário enviado.');
  }

  protected mostrarErro(): void {
    this.toasts.erro('Sem conexão. Verifique a internet e tente de novo.');
  }
}
