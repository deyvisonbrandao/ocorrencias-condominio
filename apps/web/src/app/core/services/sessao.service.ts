import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CondominioPublico, LoginRequisicao, UsuarioSessao } from '@ocorrencias/contratos';
import { catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import {
  MENSAGEM_ERRO_INESPERADO,
  mensagemDeErroGlobal,
  SEM_TOAST_DE_ERRO,
} from '../interceptors/erro-http.interceptor';
import { rotaDoLogin } from './navegacao-da-sessao';
import { UltimoCondominio } from './ultimo-condominio';

export const SONDAGEM_DE_SESSAO = new HttpContextToken<boolean>(() => false);

const ME = '/me';
const LOGIN = '/auth/login';
const LOGOUT = '/auth/logout';

@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly ultimoCondominio = inject(UltimoCondominio);

  private readonly estado = signal<UsuarioSessao | null | undefined>(undefined);
  private readonly avisoDeExpiracao = signal(false);
  private readonly saindoAgora = signal(false);
  private readonly falhaNaSaida = signal<string | null>(null);
  private sondagem: Observable<UsuarioSessao | null> | null = null;

  readonly usuario = computed(() => this.estado() ?? null);
  readonly saindo = this.saindoAgora.asReadonly();
  readonly erroAoSair = this.falhaNaSaida.asReadonly();

  carregar(): Observable<UsuarioSessao | null> {
    const conhecido = this.estado();
    if (conhecido !== undefined) {
      return of(conhecido);
    }
    this.sondagem ??= this.http
      .get<UsuarioSessao>(ME, { context: new HttpContext().set(SONDAGEM_DE_SESSAO, true) })
      .pipe(
        tap((usuario) => this.abrir(usuario)),
        catchError((erro: unknown) => {
          if (erro instanceof HttpErrorResponse && erro.status === 401) {
            this.estado.set(null);
            return of(null);
          }
          return throwError(() => erro);
        }),
        finalize(() => (this.sondagem = null)),
        shareReplay(1),
      );
    return this.sondagem;
  }

  entrar(requisicao: LoginRequisicao): Observable<UsuarioSessao> {
    const contexto = new HttpContext().set(SONDAGEM_DE_SESSAO, true).set(SEM_TOAST_DE_ERRO, true);
    return this.http
      .post<UsuarioSessao>(LOGIN, requisicao, { context: contexto })
      .pipe(tap((usuario) => this.abrir(usuario)));
  }

  sair(): void {
    if (this.saindoAgora()) {
      return;
    }
    const slug = this.usuario()?.condominio.slug ?? this.ultimoCondominio.ler();
    this.saindoAgora.set(true);
    this.falhaNaSaida.set(null);
    // O "Sair" fica dentro de diálogo (drawer, confirmação), onde o toast global fica inerte.
    const contexto = new HttpContext().set(SEM_TOAST_DE_ERRO, true);
    this.http.post<void>(LOGOUT, null, { context: contexto }).subscribe({
      next: () => {
        this.saindoAgora.set(false);
        this.estado.set(null);
        void this.router.navigateByUrl(rotaDoLogin(this.router, slug));
      },
      error: (erro: unknown) => {
        this.saindoAgora.set(false);
        this.falhaNaSaida.set(
          (erro instanceof HttpErrorResponse ? mensagemDeErroGlobal(erro) : null) ??
            MENSAGEM_ERRO_INESPERADO,
        );
      },
    });
  }

  atualizarCondominio(condominio: CondominioPublico): void {
    const usuario = this.estado();
    if (usuario) {
      this.estado.set({ ...usuario, condominio });
    }
  }

  invalidar(): void {
    this.estado.set(undefined);
  }

  descartarErroAoSair(): void {
    this.falhaNaSaida.set(null);
  }

  expirar(): void {
    this.estado.set(null);
    this.avisoDeExpiracao.set(true);
  }

  consumirAvisoDeExpiracao(): boolean {
    const aviso = this.avisoDeExpiracao();
    this.avisoDeExpiracao.set(false);
    return aviso;
  }

  private abrir(usuario: UsuarioSessao): void {
    this.estado.set(usuario);
    this.ultimoCondominio.gravar(usuario.condominio.slug);
  }
}
