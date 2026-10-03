import { Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AppConfig } from '../config/app-config.js';
import {
  assinarJwt,
  type ClaimsSessao,
  type TokenVerificado,
  verificarJwt,
} from './jwt.js';

export const VALIDADE_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60;
export const NOME_COOKIE_SESSAO = 'sessao';
export const NOME_COOKIE_SESSAO_PRODUCAO = '__Host-sessao';

// O prefixo __Host- obriga Secure, Path=/ e ausência de Domain: um subdomínio irmão não consegue implantar
// a sessão. Em desenvolvimento e teste a API roda em http, onde o navegador recusa cookie __Host-.
export function nomeCookieSessao(producao: boolean): string {
  return producao ? NOME_COOKIE_SESSAO_PRODUCAO : NOME_COOKIE_SESSAO;
}

export function valoresDoCookie(
  cabecalho: string | undefined,
  nome: string,
): string[] {
  if (!cabecalho) return [];
  const valores: string[] = [];
  for (const par of cabecalho.split(';')) {
    const separador = par.indexOf('=');
    if (separador >= 0 && par.slice(0, separador).trim() === nome) {
      valores.push(par.slice(separador + 1).trim());
    }
  }
  return valores;
}

function decodificar(valor: string): string | undefined {
  try {
    return decodeURIComponent(valor);
  } catch {
    return undefined;
  }
}

@Injectable()
export class SessaoJwt {
  readonly nomeCookie: string;

  constructor(private readonly config: AppConfig) {
    this.nomeCookie = nomeCookieSessao(config.producao);
  }

  private get opcoesCookie(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.producao,
      path: '/',
    };
  }

  abrir(resposta: Response, claims: ClaimsSessao): void {
    const token = assinarJwt(
      claims,
      this.config.jwtSecret,
      VALIDADE_SESSAO_SEGUNDOS,
    );
    resposta.cookie(this.nomeCookie, token, {
      ...this.opcoesCookie,
      maxAge: VALIDADE_SESSAO_SEGUNDOS * 1000,
    });
  }

  encerrar(resposta: Response): void {
    resposta.clearCookie(this.nomeCookie, this.opcoesCookie);
  }

  presente(requisicao: Request): boolean {
    return (
      valoresDoCookie(requisicao.headers.cookie, this.nomeCookie).length > 0
    );
  }

  // Dois cookies com o nome da sessão indicam um implantado por outro domínio ou caminho: em vez de escolher
  // um, a sessão é recusada, e o guard responde 401 e apaga o cookie.
  ler(requisicao: Request): TokenVerificado | null {
    const valores = valoresDoCookie(requisicao.headers.cookie, this.nomeCookie);
    if (valores.length !== 1) return null;
    const token = decodificar(valores[0]);
    return token ? verificarJwt(token, this.config.jwtSecret) : null;
  }
}
