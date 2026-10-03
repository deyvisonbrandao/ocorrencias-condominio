import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CodigoErroCondominio, CodigoErroSessao, CondominioPublico } from '@ocorrencias/contratos';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { NOME_PRODUTO } from '../../core/config/marca';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
  SEM_TOAST_DE_ERRO,
} from '../../core/interceptors/erro-http.interceptor';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import {
  destinoAposLogin,
  MENSAGEM_SESSAO_TERMINOU,
} from '../../core/services/navegacao-da-sessao';
import { SessaoService } from '../../core/services/sessao.service';
import { Alerta, TomAlerta } from '../../shared/components/alerta/alerta';
import { Botao } from '../../shared/components/botao/botao';
import { Campo } from '../../shared/components/campo/campo';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { ESPERA_ANTES_DO_SKELETON_MS, Skeleton } from '../../shared/components/estados/skeleton';
import { errosPorCampo, lerErroApi } from '../../shared/utils/erro-api';
import { slugValido } from '../../shared/utils/slug';
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

type EstadoCondominio =
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'pronto'; readonly condominio: CondominioPublico }
  | { readonly tipo: 'nao-encontrado' }
  | { readonly tipo: 'erro' };

interface AlertaDoLogin {
  readonly tom: TomAlerta;
  readonly mensagem: string;
}

function ehCampoLogin(campo: string): campo is CampoLogin {
  return campo === 'telefone' || campo === 'senha';
}

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, Alerta, Botao, Campo, EstadoErro, Skeleton],
  templateUrl: './entrar.html',
})
export class Entrar {
  private readonly api = inject(CondominiosPublicoService);
  private readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly titulo = inject(Title);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly tentativas = new BehaviorSubject<void>(undefined);
  private readonly parametros = toSignal(this.rota.paramMap, { requireSync: true });

  protected readonly slug = computed(() => this.parametros().get('slug') ?? '');
  protected readonly estado = toSignal(
    this.rota.paramMap.pipe(
      switchMap((parametros) =>
        this.tentativas.pipe(switchMap(() => this.buscarCondominio(parametros.get('slug') ?? ''))),
      ),
    ),
    { initialValue: { tipo: 'carregando' } satisfies EstadoCondominio },
  );
  protected readonly condominio = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'pronto' ? estado.condominio : null;
  });
  protected readonly esperaLonga = toSignal(timer(ESPERA_ANTES_DO_SKELETON_MS).pipe(map(() => true)), {
    initialValue: false,
  });

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
    effect(() => {
      if (this.estado().tipo === 'nao-encontrado') {
        this.titulo.setTitle(`Condomínio não encontrado · ${NOME_PRODUTO}`);
      }
    });
  }

  protected erro(campo: CampoLogin): string | null {
    const controle = this.formulario.controls[campo];
    const visivel = this.enviado() || (controle.dirty && controle.touched);
    return (visivel ? mensagemDeErro(controle) : null) ?? this.errosDoServidor()[campo] ?? null;
  }

  protected tentarDeNovo(): void {
    this.tentativas.next();
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
          void this.router.navigateByUrl(destinoAposLogin(usuario, voltar));
        },
        error: (erro: unknown) => this.falhar(erro),
      });
  }

  private buscarCondominio(slug: string): Observable<EstadoCondominio> {
    if (!slugValido(slug)) {
      return of({ tipo: 'nao-encontrado' });
    }
    return this.api.buscarPorSlug(slug, new HttpContext().set(SEM_TOAST_DE_ERRO, true)).pipe(
      map((condominio): EstadoCondominio => ({ tipo: 'pronto', condominio })),
      catchError((erro: unknown) =>
        of<EstadoCondominio>(
          lerErroApi(erro)?.code === CodigoErroCondominio.CONDOMINIO_NAO_ENCONTRADO
            ? { tipo: 'nao-encontrado' }
            : { tipo: 'erro' },
        ),
      ),
      startWith<EstadoCondominio>({ tipo: 'carregando' }),
    );
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
