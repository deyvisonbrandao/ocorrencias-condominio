import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
  AcaoMorador,
  CodigoErroPaginacao,
  MoradorAdmin,
  REGRAS_BUSCA_MORADORES,
} from '@ocorrencias/contratos';
import {
  catchError,
  debounceTime,
  map,
  Observable,
  of,
  startWith,
  Subscription,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { ContagemMoradoresService } from '../../core/services/contagem-moradores.service';
import { Aba, Abas } from '../../shared/components/abas/abas';
import { Alerta } from '../../shared/components/alerta/alerta';
import { Botao } from '../../shared/components/botao/botao';
import { Campo } from '../../shared/components/campo/campo';
import { CarregarMais } from '../../shared/components/carregar-mais/carregar-mais';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { EstadoVazio } from '../../shared/components/estados/estado-vazio';
import { ESPERA_ANTES_DO_SKELETON_MS, Skeleton } from '../../shared/components/estados/skeleton';
import { ToastService } from '../../shared/services/toast.service';
import { lerErroApi } from '../../shared/utils/erro-api';
import {
  ABA_PADRAO,
  ABAS_MORADORES,
  abaPorChave,
  DefinicaoAba,
  parametroDaAba,
} from './abas-moradores';
import { AcaoConcluida, ConfirmarAcao } from './components/confirmar-acao/confirmar-acao';
import { ListaMoradores, PedidoAcao } from './components/lista-moradores/lista-moradores';
import { MoradoresService } from './services/moradores.service';

export const ESPERA_DA_BUSCA_MS = 300;
export const DICA_BUSCA_CURTA = `Termos com até ${REGRAS_BUSCA_MORADORES.termoCurtoMax} caracteres procuram só o bloco ou o início do apto.`;

type EstadoLista =
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'erro' }
  | {
      readonly tipo: 'pronto';
      readonly itens: readonly MoradorAdmin[];
      readonly proximoCursor: string | null;
      readonly paginou: boolean;
    };

interface Consulta {
  readonly aba: DefinicaoAba;
  readonly q: string;
}

const ROTA = '/admin/moradores';

const TOASTS: Readonly<Record<AcaoMorador, (nome: string) => string>> = {
  aprovar: (nome) => `Cadastro de ${nome} aprovado.`,
  recusar: () => 'Cadastro recusado.',
  inativar: (nome) => `${nome} foi inativado.`,
  reativar: (nome) => `${nome} foi reativado.`,
};

function abaPadrao(): DefinicaoAba {
  return abaPorChave(ABA_PADRAO) as DefinicaoAba;
}

function normalizarBusca(texto: string): string {
  return texto.trim().slice(0, REGRAS_BUSCA_MORADORES.max);
}

function consultaDe(parametros: ParamMap): Consulta {
  return {
    aba: abaPorChave(parametros.get('aba')) ?? abaPadrao(),
    q: normalizarBusca(parametros.get('q') ?? ''),
  };
}

function mesmaConsulta(a: Consulta, b: Consulta): boolean {
  return a.aba.chave === b.aba.chave && a.q === b.q;
}

@Component({
  selector: 'app-moradores',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Abas,
    Alerta,
    Botao,
    Campo,
    CarregarMais,
    ConfirmarAcao,
    EstadoErro,
    EstadoVazio,
    ListaMoradores,
    Skeleton,
  ],
  templateUrl: './moradores.html',
})
export class Moradores {
  private readonly api = inject(MoradoresService);
  private readonly contagem = inject(ContagemMoradoresService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly lista = viewChild(ListaMoradores);
  private readonly confirmacao = viewChild.required(ConfirmarAcao);

  private readonly parametros = toSignal(this.rota.queryParamMap, { requireSync: true });
  protected readonly consulta = computed(() => consultaDe(this.parametros()), {
    equal: mesmaConsulta,
  });
  protected readonly aba = computed(() => this.consulta().aba);
  protected readonly q = computed(() => this.consulta().q);
  private readonly versao = signal(0);

  protected readonly estado = signal<EstadoLista>({ tipo: 'carregando' });
  protected readonly carregandoMais = signal(false);
  protected readonly erroAoCarregarMais = signal(false);
  protected readonly aviso = signal<string | null>(null);

  protected readonly maximoBusca = REGRAS_BUSCA_MORADORES.max;
  protected readonly busca = new FormControl(this.q(), { nonNullable: true });
  private ultimaBuscaEnviada = this.q();
  private paginaSeguinte: Subscription | null = null;
  private focarPrimeiroAoCarregar = false;

  protected readonly abas = computed<readonly Aba[]>(() => {
    const q = this.q() || null;
    const pendentes = this.contagem.contagem()?.pendentes || undefined;
    return ABAS_MORADORES.map((aba) => ({
      rotulo: aba.rotulo,
      rota: ROTA,
      queryParams: { aba: parametroDaAba(aba.chave), q },
      contador: aba.chave === 'pendentes' ? pendentes : undefined,
    }));
  });

  protected readonly itens = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'pronto' ? estado.itens : [];
  });

  protected readonly paginacao = computed(() => {
    const estado = this.estado();
    if (estado.tipo !== 'pronto' || estado.itens.length === 0) {
      return null;
    }
    return estado.proximoCursor !== null || estado.paginou
      ? { fim: estado.proximoCursor === null }
      : null;
  });

  protected readonly dicaDaBuscaVazia = computed(() =>
    this.q()
      .split(/s+/)
      .some((termo) => termo.length > 0 && termo.length <= REGRAS_BUSCA_MORADORES.termoCurtoMax)
      ? DICA_BUSCA_CURTA
      : undefined,
  );

  protected readonly anuncioDaBusca = computed(() => {
    const estado = this.estado();
    const q = this.q();
    if (!q || estado.tipo !== 'pronto') {
      return '';
    }
    const total = estado.itens.length;
    if (total === 0) {
      return `Nenhum morador encontrado para '${q}'.`;
    }
    const palavra = total === 1 ? 'morador encontrado' : 'moradores encontrados';
    return estado.proximoCursor ? `Mais de ${total} ${palavra}.` : `${total} ${palavra}.`;
  });

  protected readonly mostrarSkeleton = toSignal(
    toObservable(computed(() => this.estado().tipo === 'carregando')).pipe(
      switchMap((carregando) =>
        carregando
          ? timer(ESPERA_ANTES_DO_SKELETON_MS).pipe(
              map(() => true),
              startWith(false),
            )
          : of(false),
      ),
    ),
    { initialValue: false },
  );

  constructor() {
    this.contagem.recarregar();

    this.rota.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((parametros) => this.normalizarUrl(parametros));

    this.busca.valueChanges
      .pipe(debounceTime(ESPERA_DA_BUSCA_MS), map(normalizarBusca), takeUntilDestroyed())
      .subscribe((q) => {
        if (q !== this.q()) {
          this.ultimaBuscaEnviada = q;
          this.navegar({ q: q || null });
        }
      });

    let anterior: Consulta | null = null;
    toObservable(computed(() => ({ consulta: this.consulta(), versao: this.versao() })))
      .pipe(
        tap(({ consulta }) => {
          if (anterior && !mesmaConsulta(anterior, consulta)) {
            this.aviso.set(null);
          }
          anterior = consulta;
          this.cancelarPaginaSeguinte();
        }),
        switchMap(({ consulta }) => this.carregar(consulta)),
        takeUntilDestroyed(),
      )
      .subscribe((estado) => {
        this.estado.set(estado);
        if (estado.tipo !== 'carregando' && this.focarPrimeiroAoCarregar) {
          this.focarPrimeiroAoCarregar = false;
          const primeiro = estado.tipo === 'pronto' ? estado.itens[0] : undefined;
          if (primeiro) {
            this.focarItem(primeiro.id);
          } else {
            this.focar('h1');
          }
        }
      });
  }

  protected tentarDeNovo(): void {
    this.versao.update((versao) => versao + 1);
  }

  protected limparBusca(): void {
    this.busca.setValue('', { emitEvent: false });
    this.ultimaBuscaEnviada = '';
    this.navegar({ q: null });
    this.focar('ui-campo input');
  }

  protected carregarMais(): void {
    const estado = this.estado();
    if (estado.tipo !== 'pronto' || !estado.proximoCursor || this.carregandoMais()) {
      return;
    }
    const { aba, q } = this.consulta();
    this.carregandoMais.set(true);
    this.erroAoCarregarMais.set(false);
    this.paginaSeguinte = this.api
      .listar({ status: aba.status, q, cursor: estado.proximoCursor })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.carregandoMais.set(false);
          this.estado.update((atual) =>
            atual.tipo === 'pronto'
              ? {
                  tipo: 'pronto',
                  itens: [...atual.itens, ...pagina.itens],
                  proximoCursor: pagina.proximoCursor,
                  paginou: true,
                }
              : atual,
          );
          const primeiroNovo = pagina.itens[0];
          if (primeiroNovo) {
            this.focarItem(primeiroNovo.id);
          }
        },
        error: (erro: unknown) => {
          this.carregandoMais.set(false);
          // Cursor recusado não melhora com nova tentativa: recomeça a aba do início.
          if (lerErroApi(erro)?.code === CodigoErroPaginacao.CURSOR_INVALIDO) {
            this.recarregarAba();
            return;
          }
          this.erroAoCarregarMais.set(true);
        },
      });
  }

  protected pedirAcao(pedido: PedidoAcao): void {
    this.confirmacao().abrir(pedido);
  }

  protected aoConcluir({ acao, anterior, atualizado }: AcaoConcluida): void {
    this.aviso.set(null);
    this.toasts.sucesso(TOASTS[acao](anterior.nome));
    this.contagem.recarregar();
    const estado = this.estado();
    if (estado.tipo !== 'pronto') {
      return;
    }
    const indice = estado.itens.findIndex((item) => item.id === anterior.id);
    if (this.aba().status.includes(atualizado.status)) {
      this.estado.set({
        ...estado,
        itens: estado.itens.map((item) => (item.id === atualizado.id ? atualizado : item)),
      });
      this.focarItem(atualizado.id);
      return;
    }
    const restantes = estado.itens.filter((item) => item.id !== anterior.id);
    if (restantes.length === 0 && estado.proximoCursor !== null) {
      this.recarregarAba();
      return;
    }
    this.estado.set({ ...estado, itens: restantes });
    const seguinte = restantes[Math.min(Math.max(indice, 0), restantes.length - 1)];
    if (seguinte) {
      this.focarItem(seguinte.id);
    } else {
      this.focar('h1');
    }
  }

  protected aoDesatualizar(mensagem: string): void {
    this.aviso.set(mensagem);
    this.contagem.recarregar();
    this.versao.update((versao) => versao + 1);
    this.focar('[data-aviso]');
  }

  private recarregarAba(): void {
    this.focarPrimeiroAoCarregar = true;
    this.versao.update((versao) => versao + 1);
  }

  private carregar({ aba, q }: Consulta): Observable<EstadoLista> {
    return this.api.listar({ status: aba.status, q }).pipe(
      map((pagina): EstadoLista => ({
        tipo: 'pronto',
        itens: pagina.itens,
        proximoCursor: pagina.proximoCursor,
        paginou: false,
      })),
      catchError(() => of<EstadoLista>({ tipo: 'erro' })),
      startWith<EstadoLista>({ tipo: 'carregando' }),
    );
  }

  private normalizarUrl(parametros: ParamMap): void {
    const { aba, q } = consultaDe(parametros);
    if (q !== this.ultimaBuscaEnviada) {
      this.ultimaBuscaEnviada = q;
      this.busca.setValue(q, { emitEvent: false });
    }
    const abaNaUrl = parametros.get('aba');
    const qNaUrl = parametros.get('q');
    const abaCanonica = parametroDaAba(aba.chave);
    const qCanonico = q || null;
    if (abaNaUrl !== abaCanonica || qNaUrl !== qCanonico) {
      this.navegar({ aba: abaCanonica, q: qCanonico });
    }
  }

  private navegar(queryParams: { aba?: string | null; q?: string | null }): void {
    void this.router.navigate([], {
      relativeTo: this.rota,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private cancelarPaginaSeguinte(): void {
    this.paginaSeguinte?.unsubscribe();
    this.paginaSeguinte = null;
    this.carregandoMais.set(false);
    this.erroAoCarregarMais.set(false);
  }

  private focarItem(id: string): void {
    afterNextRender(
      () => {
        if (!this.lista()?.focarItem(id)) {
          this.elemento.querySelector<HTMLElement>('h1')?.focus();
        }
      },
      { injector: this.injector },
    );
  }

  private focar(seletor: string): void {
    afterNextRender(() => this.elemento.querySelector<HTMLElement>(seletor)?.focus(), {
      injector: this.injector,
    });
  }
}
