import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AtualizarCondominioRequisicao,
  CondominioAdmin,
  NOMES_UF,
  REGRAS_CIDADE,
  REGRAS_NOME_CONDOMINIO,
  ufValida,
  UFS,
} from '@ocorrencias/contratos';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
} from '../../../../core/interceptors/erro-http.interceptor';
import { Botao } from '../../../../shared/components/botao/botao';
import { Campo } from '../../../../shared/components/campo/campo';
import { OpcaoSelect, Select } from '../../../../shared/components/select/select';
import { ToastService } from '../../../../shared/services/toast.service';
import { errosPorCampo, lerErroApi } from '../../../../shared/utils/erro-api';
import {
  maximo,
  mensagemDeErro,
  obrigatorio,
  Regra,
  validarCom,
} from '../../../../shared/validators/validadores';
import { CondominioAdminService } from '../../services/condominio-admin.service';

export type CampoDados = 'nome' | 'cidade' | 'uf';

const CAMPOS: readonly CampoDados[] = ['nome', 'cidade', 'uf'];

export const MENSAGEM_DADOS_SALVOS = 'Dados do condomínio salvos.';
export const DICA_ENDERECO =
  'O endereço não pode ser alterado: os QR codes impressos deixariam de funcionar.';

const OPCOES_UF: readonly OpcaoSelect[] = UFS.map((uf) => ({
  valor: uf,
  rotulo: `${uf} – ${NOMES_UF[uf]}`,
}));

function ehCampoDados(campo: string): campo is CampoDados {
  return (CAMPOS as readonly string[]).includes(campo);
}

function texto(valor: string, ...regras: readonly Regra[]): FormControl<string> {
  return new FormControl(valor, { nonNullable: true, validators: validarCom(...regras) });
}

@Component({
  selector: 'app-dados-condominio',
  imports: [ReactiveFormsModule, Botao, Campo, Select],
  host: { class: 'block' },
  template: `
    <form class="space-y-6" novalidate [formGroup]="formulario" (ngSubmit)="salvar()">
      <ui-campo
        formControlName="nome"
        rotulo="Nome do condomínio"
        autocomplete="off"
        [maxlength]="maxNome"
        [erro]="erro('nome')"
      />
      <ui-campo
        formControlName="cidade"
        rotulo="Cidade"
        autocomplete="address-level2"
        [maxlength]="maxCidade"
        [erro]="erro('cidade')"
      />
      <ui-select
        formControlName="uf"
        rotulo="UF"
        placeholder="Escolha a UF"
        [opcoes]="opcoesUf"
        [erro]="erro('uf')"
      />
      <ui-campo
        rotulo="Endereço do link"
        somenteLeitura
        prefixo="/c/"
        [dica]="dicaEndereco"
        [formControl]="endereco"
      />
      <button type="submit" ui-botao bloco rotuloCarregando="Salvando…" [carregando]="salvando()">
        Salvar alterações
      </button>
    </form>
  `,
})
export class DadosCondominio implements OnInit {
  readonly condominio = input.required<CondominioAdmin>();
  readonly salvo = output<CondominioAdmin>();

  private readonly api = inject(CondominioAdminService);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly maxNome = REGRAS_NOME_CONDOMINIO.max;
  protected readonly maxCidade = REGRAS_CIDADE.max;
  protected readonly opcoesUf = OPCOES_UF;
  protected readonly dicaEndereco = DICA_ENDERECO;

  protected readonly formulario = new FormGroup({
    nome: texto('', obrigatorio('Informe o nome do condomínio.'), maximo(REGRAS_NOME_CONDOMINIO.max)),
    cidade: texto('', obrigatorio('Informe a cidade.'), maximo(REGRAS_CIDADE.max)),
    uf: texto('', obrigatorio('Escolha a UF.')),
  });
  protected readonly endereco = new FormControl('', { nonNullable: true });

  protected readonly enviado = signal(false);
  protected readonly salvando = signal(false);
  private readonly errosDoServidor = signal<Partial<Record<CampoDados, string>>>({});

  constructor() {
    for (const campo of CAMPOS) {
      this.formulario.controls[campo].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.limparErroDoServidor(campo));
    }
  }

  ngOnInit(): void {
    this.preencher(this.condominio());
  }

  protected erro(campo: CampoDados): string | null {
    const controle = this.formulario.controls[campo];
    const visivel = this.enviado() || (controle.dirty && controle.touched);
    const doCliente = visivel ? mensagemDeErro(controle) : null;
    return doCliente ?? this.errosDoServidor()[campo] ?? null;
  }

  protected salvar(): void {
    if (this.salvando()) {
      return;
    }
    this.enviado.set(true);
    const requisicao = this.montarRequisicao();
    if (this.formulario.invalid || !requisicao) {
      this.focarPrimeiroInvalido();
      return;
    }
    this.salvando.set(true);
    this.formulario.disable({ emitEvent: false });
    this.api
      .atualizar(requisicao)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (condominio) => this.concluir(condominio),
        error: (erro: unknown) => this.falhar(erro),
      });
  }

  private montarRequisicao(): AtualizarCondominioRequisicao | null {
    const valor = this.formulario.getRawValue();
    if (!ufValida(valor.uf)) {
      return null;
    }
    return { nome: valor.nome.trim(), cidade: valor.cidade.trim(), uf: valor.uf };
  }

  private preencher(condominio: CondominioAdmin): void {
    this.formulario.reset(
      { nome: condominio.nome, cidade: condominio.cidade ?? '', uf: condominio.uf ?? '' },
      { emitEvent: false },
    );
    this.endereco.setValue(condominio.slug);
  }

  private concluir(condominio: CondominioAdmin): void {
    this.salvando.set(false);
    this.enviado.set(false);
    this.formulario.enable({ emitEvent: false });
    this.preencher(condominio);
    this.toasts.sucesso(MENSAGEM_DADOS_SALVOS);
    this.salvo.emit(condominio);
  }

  private falhar(erro: unknown): void {
    this.salvando.set(false);
    this.formulario.enable({ emitEvent: false });
    if (erro instanceof HttpErrorResponse && mensagemDeErroGlobal(erro)) {
      this.focarBotaoDeEnvio();
      return;
    }
    const corpo = lerErroApi(erro);
    const porCampo: Partial<Record<CampoDados, string>> = {};
    for (const [campo, mensagem] of Object.entries(errosPorCampo(corpo))) {
      if (ehCampoDados(campo)) {
        porCampo[campo] = mensagem;
      }
    }
    if (Object.keys(porCampo).length > 0) {
      this.errosDoServidor.set(porCampo);
      this.focarPrimeiroInvalido();
      return;
    }
    this.toasts.erro(corpo?.message ?? MENSAGEM_ERRO_INESPERADO);
    this.focarBotaoDeEnvio();
  }

  private limparErroDoServidor(campo: CampoDados): void {
    if (this.errosDoServidor()[campo] === undefined) {
      return;
    }
    this.errosDoServidor.update((erros) => {
      const restantes = { ...erros };
      delete restantes[campo];
      return restantes;
    });
  }

  private focarPrimeiroInvalido(): void {
    afterNextRender(
      () => this.elemento.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }

  private focarBotaoDeEnvio(): void {
    afterNextRender(
      () => this.elemento.querySelector<HTMLElement>('button[type="submit"]')?.focus(),
      { injector: this.injector },
    );
  }
}
