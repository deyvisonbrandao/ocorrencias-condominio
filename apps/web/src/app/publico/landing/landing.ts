import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CondominiosPublicoService } from '../../core/services/condominios-publico.service';
import { Botao } from '../../shared/ui/botao/botao';
import { Campo } from '../../shared/ui/campo/campo';
import { Icone } from '../../shared/ui/icone/icone';
import { NomeIcone } from '../../shared/ui/icone/icones';
import { extrairSlug, slugValido } from '../../shared/utils/slug';

interface Destaque {
  readonly titulo: string;
  readonly icone: NomeIcone;
}

export const MENSAGEM_ENDERECO_VAZIO = 'Informe o endereço do seu condomínio.';
export const MENSAGEM_CONDOMINIO_NAO_ENCONTRADO =
  'Não encontramos esse condomínio. Confira o endereço com a administração.';

@Component({
  selector: 'app-landing',
  imports: [ReactiveFormsModule, RouterLink, Botao, Campo, Icone],
  template: `
    <section class="py-4 md:py-8">
      <h1 tabindex="-1" class="text-3xl leading-9 font-bold md:text-4xl md:leading-10">
        Ocorrências do condomínio, organizadas
      </h1>
      <p class="mt-3 text-base text-texto-secundario">
        Os moradores registram pelo celular e o síndico acompanha tudo num só lugar.
      </p>
      <a ui-botao bloco routerLink="/cadastrar-condominio" class="mt-6">Cadastrar meu condomínio</a>
    </section>

    <ul class="mt-8 grid gap-3 md:grid-cols-3">
      @for (destaque of destaques; track destaque.titulo) {
        <li class="flex items-center gap-3 rounded-cartao border border-borda bg-superficie p-4 md:flex-col md:items-start">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-controle bg-primaria-suave text-primaria">
            <ui-icone [nome]="destaque.icone" />
          </span>
          <p class="text-base font-semibold">{{ destaque.titulo }}</p>
        </li>
      }
    </ul>

    <section class="mt-10 rounded-cartao border border-borda bg-superficie p-4 md:p-6" aria-labelledby="ja-usa">
      <h2 id="ja-usa" class="text-lg font-semibold">Já usa?</h2>
      <form class="mt-4 space-y-4" novalidate [formGroup]="formularioLogin" (ngSubmit)="irParaLogin()">
        <ui-campo
          rotulo="Endereço do seu condomínio"
          dica="O final do link que a administração enviou, como jardim-das-flores."
          prefixo="…/c/"
          autocomplete="off"
          autocapitalize="none"
          [corretor]="false"
          formControlName="endereco"
          [erro]="erro()"
        />
        <button
          type="submit"
          ui-botao
          variante="secundario"
          bloco
          rotuloCarregando="Verificando…"
          [carregando]="verificando()"
        >
          Ir para o login
        </button>
      </form>
    </section>
  `,
})
export class Landing {
  private readonly api = inject(CondominiosPublicoService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly destaques: readonly Destaque[] = [
    { titulo: 'Moradores registram em 1 minuto', icone: 'relogio' },
    { titulo: 'Reclamações ficam restritas à administração', icone: 'cadeado' },
    { titulo: 'Prazos e histórico em cada ocorrência', icone: 'lista' },
  ];

  protected readonly formularioLogin = new FormGroup({ endereco: new FormControl('', { nonNullable: true }) });
  private readonly endereco = this.formularioLogin.controls.endereco;
  protected readonly erro = signal<string | null>(null);
  protected readonly verificando = signal(false);

  constructor() {
    this.endereco.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.erro.set(null));
  }

  protected irParaLogin(): void {
    if (this.verificando()) {
      return;
    }
    const slug = extrairSlug(this.endereco.value);
    if (slug === '') {
      this.mostrarErro(MENSAGEM_ENDERECO_VAZIO);
      return;
    }
    if (!slugValido(slug)) {
      this.mostrarErro(MENSAGEM_CONDOMINIO_NAO_ENCONTRADO);
      return;
    }
    this.verificando.set(true);
    this.api
      .buscarPorSlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (condominio) => {
          this.verificando.set(false);
          void this.router.navigate(['/c', condominio.slug, 'entrar']);
        },
        error: (erro: unknown) => {
          this.verificando.set(false);
          if (erro instanceof HttpErrorResponse && erro.status === 404) {
            this.mostrarErro(MENSAGEM_CONDOMINIO_NAO_ENCONTRADO);
          }
        },
      });
  }

  private mostrarErro(mensagem: string): void {
    this.erro.set(mensagem);
    afterNextRender(() => this.elemento.querySelector<HTMLElement>('form input')?.focus(), {
      injector: this.injector,
    });
  }
}
