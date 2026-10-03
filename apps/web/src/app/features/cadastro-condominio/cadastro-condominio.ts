import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  CadastrarCondominioRequisicao,
  CondominioCriado,
  REGRAS_NOME_CONDOMINIO,
  REGRAS_NOME_PESSOA,
  REGRAS_SLUG,
} from '@ocorrencias/contratos';
import { startWith } from 'rxjs';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
} from '../../core/interceptors/erro-http.interceptor';
import { NOME_PRODUTO } from '../../core/config/marca';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { Botao } from '../../shared/components/botao/botao';
import { CaixaSelecao } from '../../shared/components/caixa-selecao/caixa-selecao';
import { Campo } from '../../shared/components/campo/campo';
import { Copiar } from '../../shared/components/copiar/copiar';
import { Icone } from '../../shared/components/icone/icone';
import { ToastService } from '../../shared/services/toast.service';
import { errosPorCampo, lerErroApi } from '../../shared/utils/erro-api';
import { derivarSlug, MENSAGEM_SLUG_EM_USO, problemaDoSlug } from '../../shared/utils/slug';
import {
  aceiteObrigatorio,
  celularBr,
  emailOpcional,
  maximo,
  mensagemDeErro,
  obrigatorio,
  Regra,
  senha,
  validarCom,
} from '../../shared/validators/validadores';
import { ESPERA_VERIFICACAO_SLUG, verificarSlug } from './services/verificacao-slug';

export type CampoCadastro =
  | 'nome'
  | 'slug'
  | 'sindico.nome'
  | 'sindico.telefone'
  | 'sindico.email'
  | 'sindico.senha'
  | 'aceite';

const CAMPOS: readonly CampoCadastro[] = [
  'nome',
  'slug',
  'sindico.nome',
  'sindico.telefone',
  'sindico.email',
  'sindico.senha',
  'aceite',
];

function ehCampoCadastro(campo: string): campo is CampoCadastro {
  return (CAMPOS as readonly string[]).includes(campo);
}

function texto(...regras: readonly Regra[]): FormControl<string> {
  return new FormControl('', { nonNullable: true, validators: validarCom(...regras) });
}

@Component({
  selector: 'app-cadastro-condominio',
  imports: [ReactiveFormsModule, RouterLink, Botao, CaixaSelecao, Campo, Copiar, Icone],
  templateUrl: './cadastro-condominio.html',
})
export class CadastroCondominio {
  private readonly api = inject(CondominiosPublicoService);
  private readonly toasts = inject(ToastService);
  private readonly titulo = inject(Title);
  private readonly documento = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly maxNomeCondominio = REGRAS_NOME_CONDOMINIO.max;
  protected readonly maxNomePessoa = REGRAS_NOME_PESSOA.max;
  protected readonly maxSlug = REGRAS_SLUG.max;
  protected readonly host = this.documento.location.host;

  protected readonly formulario = new FormGroup({
    nome: texto(obrigatorio('Informe o nome do condomínio.'), maximo(REGRAS_NOME_CONDOMINIO.max)),
    slug: texto(problemaDoSlug),
    sindico: new FormGroup({
      nome: texto(obrigatorio('Informe seu nome.'), maximo(REGRAS_NOME_PESSOA.max)),
      telefone: texto(celularBr),
      email: texto(emailOpcional),
      senha: texto(senha),
    }),
    aceite: new FormControl(false, { nonNullable: true, validators: aceiteObrigatorio }),
  });

  protected readonly enviado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly criado = signal<CondominioCriado | null>(null);
  private readonly errosDoServidor = signal<Partial<Record<CampoCadastro, string>>>({});
  private readonly slugAutomatico = signal(true);

  private readonly slugs = this.formulario.controls.slug.valueChanges.pipe(
    startWith(this.formulario.controls.slug.value),
  );
  private readonly slugAtual = toSignal(this.slugs, { initialValue: '' });

  protected readonly estadoSlug = toSignal(
    verificarSlug(
      this.slugs,
      (slug) => this.api.disponibilidade(slug),
      inject(ESPERA_VERIFICACAO_SLUG),
    ),
    { initialValue: 'ocioso' },
  );

  protected readonly slugDaPrevia = computed(() => this.slugAtual().trim() || 'seu-condominio');

  protected readonly anuncioSlug = computed(() => {
    switch (this.estadoSlug()) {
      case 'disponivel':
        return 'Endereço do link disponível.';
      case 'em-uso':
        return MENSAGEM_SLUG_EM_USO;
      default:
        return '';
    }
  });

  protected readonly linkDoCondominio = computed(() => {
    const condominio = this.criado();
    return condominio ? `${this.documento.location.origin}/c/${condominio.slug}` : '';
  });

  constructor() {
    this.formulario.controls.nome.valueChanges.pipe(takeUntilDestroyed()).subscribe((nome) => {
      if (this.slugAutomatico()) {
        this.formulario.controls.slug.setValue(derivarSlug(nome));
      }
    });
    for (const campo of CAMPOS) {
      this.controle(campo)
        .valueChanges.pipe(takeUntilDestroyed())
        .subscribe(() => this.limparErroDoServidor(campo));
    }
  }

  protected erro(campo: CampoCadastro): string | null {
    const controle = this.controle(campo);
    const visivel = this.enviado() || (controle.dirty && controle.touched);
    const doCliente = visivel ? mensagemDeErro(controle) : null;
    const emUso = campo === 'slug' && this.estadoSlug() === 'em-uso' ? MENSAGEM_SLUG_EM_USO : null;
    return doCliente ?? this.errosDoServidor()[campo] ?? emUso;
  }

  protected aoEditarSlug(): void {
    this.slugAutomatico.set(this.formulario.controls.slug.value === '');
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    this.enviado.set(true);
    if (this.formulario.invalid) {
      this.focarPrimeiroInvalido();
      return;
    }
    this.enviando.set(true);
    const requisicao = this.montarRequisicao();
    this.formulario.disable({ emitEvent: false });
    this.api
      .cadastrar(requisicao)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (criado) => this.concluir(criado),
        error: (erro: unknown) => this.falhar(erro),
      });
  }

  private montarRequisicao(): CadastrarCondominioRequisicao {
    const valor = this.formulario.getRawValue();
    const email = valor.sindico.email.trim();
    return {
      nome: valor.nome.trim(),
      slug: valor.slug.trim(),
      sindico: {
        nome: valor.sindico.nome.trim(),
        telefone: valor.sindico.telefone,
        senha: valor.sindico.senha,
        ...(email ? { email } : {}),
      },
    };
  }

  private concluir(criado: CondominioCriado): void {
    this.enviando.set(false);
    this.criado.set(criado);
    this.titulo.setTitle(`Condomínio criado · ${NOME_PRODUTO}`);
    afterNextRender(() => this.elemento.querySelector<HTMLElement>('h1')?.focus(), {
      injector: this.injector,
    });
  }

  private falhar(erro: unknown): void {
    this.enviando.set(false);
    this.formulario.enable({ emitEvent: false });
    if (erro instanceof HttpErrorResponse && mensagemDeErroGlobal(erro)) {
      this.focarBotaoDeEnvio();
      return;
    }
    const corpo = lerErroApi(erro);
    const porCampo: Partial<Record<CampoCadastro, string>> = {};
    for (const [campo, mensagem] of Object.entries(errosPorCampo(corpo))) {
      if (ehCampoCadastro(campo)) {
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

  private controle(campo: CampoCadastro): AbstractControl {
    const controle = this.formulario.get(campo);
    if (!controle) {
      throw new Error(`Campo inexistente no formulário: ${campo}`);
    }
    return controle;
  }

  private limparErroDoServidor(campo: CampoCadastro): void {
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
      () => this.elemento.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus(),
      {
        injector: this.injector,
      },
    );
  }

  private focarBotaoDeEnvio(): void {
    afterNextRender(
      () => this.elemento.querySelector<HTMLElement>('form button[type="submit"]')?.focus(),
      {
        injector: this.injector,
      },
    );
  }
}
