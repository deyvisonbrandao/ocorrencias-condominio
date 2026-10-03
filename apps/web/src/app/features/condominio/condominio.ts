import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { CondominioAdmin } from '@ocorrencias/contratos';
import { Subject, startWith } from 'rxjs';
import { SessaoService } from '../../core/services/sessao.service';
import { EstadoErro } from '../../shared/components/estados/estado-erro';
import { Skeleton } from '../../shared/components/estados/skeleton';
import { Icone } from '../../shared/components/icone/icone';
import { carregarCondominio } from './carregamento';
import { DadosCondominio } from './components/dados-condominio/dados-condominio';
import { LinkDeCadastro } from './components/link-de-cadastro/link-de-cadastro';
import { CondominioAdminService } from './services/condominio-admin.service';
import { linkPublico, ORIGEM_DO_APP, textoCidade } from './services/link-publico';

export const NOTA_SOMENTE_SINDICO = 'Só o(a) síndico(a) edita os dados do condomínio.';

@Component({
  selector: 'app-condominio',
  imports: [DadosCondominio, EstadoErro, Icone, LinkDeCadastro, Skeleton],
  host: { class: 'block max-w-conteudo' },
  template: `
    <h1 tabindex="-1" class="text-xl leading-7 font-bold md:text-2xl md:leading-8">Condomínio</h1>
    @let atual = estado();
    @switch (atual.tipo) {
      @case ('carregando') {
        @if (atual.fase !== 'curta') {
          <ui-skeleton class="mt-6" forma="detalhe" [quantidade]="2" />
        }
        @if (atual.fase === 'longa') {
          <p class="mt-3 text-sm text-texto-secundario" role="status">Está demorando mais que o normal…</p>
        }
      }
      @case ('erro') {
        <ui-estado-erro
          class="mt-6"
          titulo="Não foi possível carregar os dados do condomínio."
          [focar]="tentouDeNovo()"
          (tentarDeNovo)="tentarDeNovo()"
        />
      }
      @case ('pronto') {
        @if (condominio(); as dados) {
          <section
            class="mt-6 rounded-cartao border border-borda bg-superficie p-4 md:p-6"
            aria-labelledby="dados-do-condominio"
          >
            <h2 id="dados-do-condominio" class="text-lg font-semibold">Dados do condomínio</h2>
            @if (podeEditar()) {
              <app-dados-condominio class="mt-4" [condominio]="dados" (salvo)="aoSalvar($event)" />
            } @else {
              <dl class="mt-4 space-y-3">
                <div>
                  <dt class="text-sm text-texto-secundario">Nome</dt>
                  <dd class="text-base font-medium break-words">{{ dados.nome }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-texto-secundario">Cidade</dt>
                  <dd class="text-base font-medium break-words">{{ cidade() ?? 'Não informada' }}</dd>
                </div>
              </dl>
              <p class="mt-4 flex items-start gap-2 text-sm text-texto-secundario">
                <ui-icone nome="info" [tamanho]="16" class="mt-0.5" />
                <span>{{ notaSomenteSindico }}</span>
              </p>
            }
          </section>

          <section
            class="mt-6 rounded-cartao border border-borda bg-superficie p-4 md:p-6"
            aria-labelledby="link-de-cadastro"
          >
            <h2 id="link-de-cadastro" class="text-lg font-semibold">Link de cadastro</h2>
            <app-link-de-cadastro class="mt-4" [url]="link()" [nome]="dados.nome" [slug]="dados.slug" />
          </section>
        }
      }
    }
  `,
})
export class Condominio {
  private readonly api = inject(CondominioAdminService);
  private readonly sessao = inject(SessaoService);
  private readonly origem = inject(ORIGEM_DO_APP);
  private readonly tentativas = new Subject<void>();

  protected readonly notaSomenteSindico = NOTA_SOMENTE_SINDICO;
  protected readonly tentouDeNovo = signal(false);

  protected readonly estado = carregarCondominio(this.tentativas.pipe(startWith(undefined)), () =>
    this.api.obter(),
  );
  protected readonly condominio = linkedSignal<CondominioAdmin | null>(() => {
    const estado = this.estado();
    return estado.tipo === 'pronto' ? estado.condominio : null;
  });
  protected readonly podeEditar = computed(() => this.sessao.usuario()?.papel === 'SINDICO');
  protected readonly link = computed(() => linkPublico(this.origem, this.condominio()?.slug ?? ''));
  protected readonly cidade = computed(() => {
    const dados = this.condominio();
    return dados ? textoCidade(dados.cidade, dados.uf) : null;
  });

  protected tentarDeNovo(): void {
    this.tentouDeNovo.set(true);
    this.tentativas.next();
  }

  protected aoSalvar(condominio: CondominioAdmin): void {
    this.condominio.set(condominio);
    this.sessao.atualizarCondominio({ nome: condominio.nome, slug: condominio.slug });
  }
}
