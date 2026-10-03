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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CodigoErroSessao } from '@ocorrencias/contratos';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
} from '../../core/interceptors/erro-http.interceptor';
import {
  condominioDaRota,
  TITULO_CONDOMINIO_NAO_ENCONTRADO,
} from '../../core/services/condominio-da-rota';
import {
  destinoAposLogin,
  MENSAGEM_SESSAO_TERMINOU,
} from '../../core/services/navegacao-da-sessao';
import { SessaoService } from '../../core/services/sessao.service';
import { Alerta, TomAlerta } from '../../shared/components/alerta/alerta';
import { Botao } from '../../shared/components/botao/botao';
import { Campo } from '../../shared/components/campo/campo';
import { CondominioNaoEncontrado } from '../../shared/components/estados/condominio-nao-encontrado';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { Skeleton } from '../../shared/components/estados/skeleton';
import { errosPorCampo, lerErroApi } from '../../shared/utils/erro-api';
import {
  celularBr,
  mensagemDeErro,
  obrigatorio,
  validarCom,
} from '../../shared/validators/validadores';

export const MENSAGEM_SENHA_VAZIA = 'Informe sua senha.';

export const MENSAGENS_DE_LOGIN: Readonly<Record<string, string>> = {
  [CodigoErroSessao.CREDENCIAIS_INVALIDAS]: 'Telefone ou senha inválidos.',
  [CodigoErroSessao.CADASTRO_PENDENTE]: 'Seu cadastro ainda aguarda aprovação da administração.',
  [CodigoErroSessao.CADASTRO_RECUSADO]:
    'Seu cadastro não foi aprovado. Fale com a administração do condomínio.',
  [CodigoErroSessao.ACESSO_INATIVO]:
    'Seu acesso está desativado. Fale com a administração do condomínio.',
};

type CampoLogin = 'telefone' | 'senha';

interface AlertaDoLogin {
  readonly tom: TomAlerta;
  readonly mensagem: string;
}

function ehCampoLogin(campo: string): campo is CampoLogin {
  return campo === 'telefone' || campo === 'senha';
}

@Component({
  selector: 'app-entrar',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Alerta,
    Botao,
    Campo,
    CondominioNaoEncontrado,
    EstadoErro,
    Skeleton,
  ],
  templateUrl: './entrar.html',
})
export class Entrar {
  private readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly pagina = condominioDaRota();

  protected readonly slug = this.pagina.slug;
  protected readonly estado = this.pagina.estado;
  protected readonly condominio = this.pagina.condominio;
  protected readonly esperaLonga = this.pagina.esperaLonga;
  protected readonly tituloNaoEncontrado = TITULO_CONDOMINIO_NAO_ENCONTRADO;

  protected readonly formulario = new FormGroup({
    telefone: new FormControl('', { nonNullable: true, validators: validarCom(celularBr) }),
    senha: new FormControl('', {
      nonNullable: true,
      validators: validarCom(obrigatorio(MENSAGEM_SENHA_VAZIA)),
    }),
  });

  protected readonly enviado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly alerta = signal<AlertaDoLogin | null>(
    this.sessao.consumirAvisoDeExpiracao() ? { tom: 'aviso', mensagem: MENSAGEM_SESSAO_TERMINOU } : null,
  );
  private readonly errosDoServidor = signal<Partial<Record<CampoLogin, string>>>({});

  constructor() {
    for (const campo of ['telefone', 'senha'] as const) {
      this.formulario.controls[campo].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.limparErroDoServidor(campo));
    }
  }

  protected erro(campo: CampoLogin): string | null {
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
    this.alerta.set(null);
    this.enviando.set(true);
    const { telefone, senha } = this.formulario.getRawValue();
    this.formulario.disable({ emitEvent: false });
    this.sessao
      .entrar({ slug: this.slug(), telefone, senha })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuario) => {
          const voltar = this.rota.snapshot.queryParamMap.get('voltar');
          this.router.navigateByUrl(destinoAposLogin(usuario, voltar)).then(
            (navegou) => {
              if (!navegou) {
                this.falhar(null);
              }
            },
            () => this.falhar(null),
          );
        },
        error: (erro: unknown) => this.falhar(erro),
      });
  }

  private falhar(erro: unknown): void {
    this.enviando.set(false);
    this.formulario.enable({ emitEvent: false });
    const global = erro instanceof HttpErrorResponse ? mensagemDeErroGlobal(erro) : null;
    const corpo = global ? null : lerErroApi(erro);
    const porCampo: Partial<Record<CampoLogin, string>> = {};
    for (const [campo, mensagem] of Object.entries(errosPorCampo(corpo))) {
      if (ehCampoLogin(campo)) {
        porCampo[campo] = mensagem;
      }
    }
    if (Object.keys(porCampo).length > 0) {
      this.errosDoServidor.set(porCampo);
      this.focar('form [aria-invalid="true"]');
      return;
    }
    const mensagem =
      global ?? (corpo ? (MENSAGENS_DE_LOGIN[corpo.code] ?? corpo.message) : MENSAGEM_ERRO_INESPERADO);
    this.alerta.set({ tom: 'perigo', mensagem });
    this.focar('ui-alerta');
  }

  private limparErroDoServidor(campo: CampoLogin): void {
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
