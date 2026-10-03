import { Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AppConfig } from '../config/app-config.js';
import { NOME_COOKIE_SESSAO } from '../http/swagger.js';
import {
  assinarJwt,
  type ClaimsSessao,
  type TokenVerificado,
  verificarJwt,
} from './jwt.js';

export const VALIDADE_SESSAO_SEGUNDOS = 7 * 24 * 60 * 60;

export function lerCookie(
  cabecalho: string | undefined,
  nome: string,
): string | undefined {
  if (!cabecalho) return undefined;
  for (const par of cabecalho.split(';')) {
    const separador = par.indexOf('=');
    if (separador < 0 || par.slice(0, separador).trim() !== nome) continue;
    const valor = par.slice(separador + 1).trim();
    try {
      return decodeURIComponent(valor);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

@Injectable()
export class SessaoJwt {
  constructor(private readonly config: AppConfig) {}

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
    resposta.cookie(NOME_COOKIE_SESSAO, token, {
      ...this.opcoesCookie,
      maxAge: VALIDADE_SESSAO_SEGUNDOS * 1000,
    });
  }

  encerrar(resposta: Response): void {
    resposta.clearCookie(NOME_COOKIE_SESSAO, this.opcoesCookie);
  }

  presente(requisicao: Request): boolean {
    return (
      lerCookie(requisicao.headers.cookie, NOME_COOKIE_SESSAO) !== undefined
    );
  }

  ler(requisicao: Request): TokenVerificado | null {
    const token = lerCookie(requisicao.headers.cookie, NOME_COOKIE_SESSAO);
    return token ? verificarJwt(token, this.config.jwtSecret) : null;
  }
}
