import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CadastrarMoradorRequisicao,
  CodigoErroCadastroMorador,
  CodigoErroCondominio,
  normalizarApto,
  normalizarBloco,
  REGRAS_APTO,
  REGRAS_BLOCO,
  REGRAS_NOME_PESSOA,
} from '@ocorrencias/contratos';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
} from '../../core/interceptors/erro-http.interceptor';
import { condominioDaRota } from '../../core/services/condominio-da-rota';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { Botao } from '../../shared/components/botao/botao';
import { Campo } from '../../shared/components/campo/campo';
import { CondominioNaoEncontrado } from '../../shared/components/estados/condominio-nao-encontrado';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { Skeleton } from '../../shared/components/estados/skeleton';
import { ToastService } from '../../shared/services/toast.service';
import { errosPorCampo, lerErroApi } from '../../shared/utils/erro-api';
import {
  celularBr,
  emailOpcional,
  maximo,
  mensagemDeErro,
  obrigatorio,
  Regra,
  senha,
  validarCom,
} from '../../shared/validators/validadores';

export const MENSAGEM_TELEFONE_EM_USO = 'Este telefone já tem cadastro neste condomínio.';

export type CampoCadastroMorador = 'nome' | 'telefone' | 'bloco' | 'apto' | 'email' | 'senha';

const CAMPOS: readonly CampoCadastroMorador[] = ['nome', 'telefone', 'bloco', 'apto', 'email', 'senha'];

function ehCampoCadastroMorador(campo: string): campo is CampoCadastroMorador {
  return (CAMPOS as readonly string[]).includes(campo);
}

function texto(...regras: readonly Regra[]): FormControl<string> {
  return new FormControl('', { nonNullable: true, validators: validarCom(...regras) });
}

@Component({
  selector: 'app-cadastro-morador',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Botao,
    Campo,
    CondominioNaoEncontrado,
    EstadoErro,
    Skeleton,
  ],
  templateUrl: './cadastro-morador.html',
})
export class CadastroMorador {
  private readonly api = inject(CondominiosPublicoService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly pagina = condominioDaRota();

  protected readonly slug = this.pagina.slug;
  protected readonly estado = this.pagina.estado;
  protected readonly condominio = this.pagina.condominio;
  protected readonly esperaLonga = this.pagina.esperaLonga;
  protected readonly maxNome = REGRAS_NOME_PESSOA.max;
  protected readonly mensagemTelefoneEmUso = MENSAGEM_TELEFONE_EM_USO;

  protected readonly formulario = new FormGroup({
    nome: texto(obrigatorio('Informe seu nome.'), maximo(REGRAS_NOME_PESSOA.max)),
    telefone: texto(celularBr),
    bloco: texto(obrigatorio('Informe o bloco.'), maximo(REGRAS_BLOCO.max, normalizarBloco)),
    apto: texto(obrigatorio('Informe o apartamento.'), maximo(REGRAS_APTO.max, normalizarApto)),
    email: texto(emailOpcional),
    senha: texto(senha),
  });

  protected readonly enviado = signal(false);
  protected readonly enviando = signal(false);
  private readonly errosDoServidor = signal<Partial<Record<CampoCadastroMorador, string>>>({});

  constructor() {
    for (const campo of CAMPOS) {
      this.formulario.controls[campo].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.limparErroDoServidor(campo));
    }
  }

  protected erro(campo: CampoCadastroMorador): string | null {
    const controle = this.formulario.controls[campo];
    const visivel = this.enviado() || (controle.dirty && controle.touched);
    return (visivel ? mensagemDeErro(controle) : null) ?? this.errosDoServidor()[campo] ?? null;
  }

  protected tentarDeNovo(): void {
    this.pagina.recarregar();
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }
    this.enviado.set(true);
    if (this.formulario.invalid) {
      this.focar('form [aria-invalid="true"]');
      return;
    }
    this.enviando.set(true);
    const slug = this.slug();
    const requisicao = this.montarRequisicao();
    this.formulario.disable({ emitEvent: false });
    this.api
      .cadastrarMorador(slug, requisicao)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/c', slug, 'aguardando-aprovacao']).then(
            (navegou) => {
              if (!navegou) {
                this.liberar();
              }
            },
            () => this.liberar(),
          );
        },
        error: (erro: unknown) => this.falhar(erro),
      });
  }

  private montarRequisicao(): CadastrarMoradorRequisicao {
    const valor = this.formulario.getRawValue();
    const email = valor.email.trim();
    return {
      nome: valor.nome.trim(),
      telefone: valor.telefone,
      bloco: valor.bloco.trim(),
      apto: valor.apto.trim(),
      senha: valor.senha,
      ...(email ? { email } : {}),
    };
  }

  private liberar(): void {
    this.enviando.set(false);
    this.formulario.enable({ emitEvent: false });
  }

  private falhar(erro: unknown): void {
    this.liberar();
    if (erro instanceof HttpErrorResponse && mensagemDeErroGlobal(erro)) {
      this.focar('form button[type="submit"]');
      return;
    }
    const corpo = lerErroApi(erro);
    if (corpo?.code === CodigoErroCondominio.CONDOMINIO_NAO_ENCONTRADO) {
      this.pagina.recarregar();
      this.focar('h1');
      return;
    }
    const porCampo: Partial<Record<CampoCadastroMorador, string>> = {};
    for (const [campo, mensagem] of Object.entries(errosPorCampo(corpo))) {
      if (ehCampoCadastroMorador(campo)) {
        porCampo[campo] = mensagem;
      }
    }
    if (corpo?.code === CodigoErroCadastroMorador.TELEFONE_EM_USO) {
      porCampo.telefone = MENSAGEM_TELEFONE_EM_USO;
    }
    if (Object.keys(porCampo).length > 0) {
      this.errosDoServidor.set(porCampo);
      this.focar('form [aria-invalid="true"]');
      return;
    }
    this.toasts.erro(corpo?.message ?? MENSAGEM_ERRO_INESPERADO);
    this.focar('form button[type="submit"]');
  }

  private limparErroDoServidor(campo: CampoCadastroMorador): void {
    if (this.errosDoServidor()[campo] === undefined) {
      return;
    }
    this.errosDoServidor.update((erros) => {
      const restantes = { ...erros };
      delete restantes[campo];
      return restantes;
    });
  }

  private focar(seletor: string): void {
    afterNextRender(() => this.elemento.querySelector<HTMLElement>(seletor)?.focus(), {
      injector: this.injector,
    });
  }
}
