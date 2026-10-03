import {
  HttpStatus,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, defer, finalize } from 'rxjs';
import { ErroApi } from './erro-api.js';

const MAX_IPS_REGISTRADOS = 10_000;

export interface LimitesCadastroPublico {
  janelaMs: number;
  maxTentativasPorIp: number;
  maxSimultaneos: number;
  retryAfterConcorrenciaSegundos: number;
  porParticao?: {
    maxSimultaneos: number;
    chave: (requisicao: Request) => string;
  };
}

interface JanelaTentativas {
  iniciaEm: number;
  tentativas: number;
}

// Cada rota declara uma subclasse @Injectable() com os próprios limites: classes diferentes têm contadores diferentes.
export abstract class LimiteCadastroPublicoInterceptor implements NestInterceptor {
  private readonly tentativasPorIp = new Map<string, JanelaTentativas>();
  private readonly simultaneosPorParticao = new Map<string, number>();
  private simultaneos = 0;

  constructor(private readonly limites: LimitesCadastroPublico) {}

  intercept(
    contexto: ExecutionContext,
    proximo: CallHandler,
  ): Observable<unknown> {
    const http = contexto.switchToHttp();
    const requisicao = http.getRequest<Request>();
    const recusar = (segundos: number): ErroApi => {
      http.getResponse<Response>().setHeader('Retry-After', String(segundos));
      return erroLimite();
    };

    const agora = Date.now();
    const janela = this.janelaDoIp(requisicao, agora);
    if (!janela) {
      throw recusar(this.segundosAteLiberarUmIp(agora));
    }
    if (janela.tentativas >= this.limites.maxTentativasPorIp) {
      throw recusar(this.segundosAte(janela.iniciaEm, agora));
    }

    const particao = this.limites.porParticao;
    const chave = particao?.chave(requisicao);
    const ocupadasNaParticao =
      chave === undefined ? 0 : (this.simultaneosPorParticao.get(chave) ?? 0);
    if (
      this.simultaneos >= this.limites.maxSimultaneos ||
      (particao !== undefined && ocupadasNaParticao >= particao.maxSimultaneos)
    ) {
      throw recusar(this.limites.retryAfterConcorrenciaSegundos);
    }

    janela.tentativas += 1;
    this.simultaneos += 1;
    if (chave !== undefined) {
      this.simultaneosPorParticao.set(chave, ocupadasNaParticao + 1);
    }

    return defer(() => proximo.handle()).pipe(
      finalize(() => {
        this.simultaneos -= 1;
        if (chave !== undefined) {
          this.liberarParticao(chave);
        }
      }),
    );
  }

  private liberarParticao(chave: string): void {
    const restantes = (this.simultaneosPorParticao.get(chave) ?? 1) - 1;
    if (restantes > 0) {
      this.simultaneosPorParticao.set(chave, restantes);
    } else {
      this.simultaneosPorParticao.delete(chave);
    }
  }

  private janelaDoIp(
    requisicao: Request,
    agora: number,
  ): JanelaTentativas | undefined {
    const ip = requisicao.ip || requisicao.socket.remoteAddress || 'unknown';
    const atual = this.tentativasPorIp.get(ip);
    if (atual && agora - atual.iniciaEm < this.limites.janelaMs) {
      return atual;
    }
    if (!atual && this.tentativasPorIp.size >= MAX_IPS_REGISTRADOS) {
      this.removerJanelasExpiradas(agora);
      if (this.tentativasPorIp.size >= MAX_IPS_REGISTRADOS) {
        return undefined;
      }
    }
    const nova = { iniciaEm: agora, tentativas: 0 };
    this.tentativasPorIp.set(ip, nova);
    return nova;
  }

  private removerJanelasExpiradas(agora: number): void {
    for (const [ip, janela] of this.tentativasPorIp) {
      if (agora - janela.iniciaEm >= this.limites.janelaMs) {
        this.tentativasPorIp.delete(ip);
      }
    }
  }

  private segundosAteLiberarUmIp(agora: number): number {
    let maisAntiga = agora;
    for (const janela of this.tentativasPorIp.values()) {
      maisAntiga = Math.min(maisAntiga, janela.iniciaEm);
    }
    return this.segundosAte(maisAntiga, agora);
  }

  private segundosAte(iniciaEm: number, agora: number): number {
    return Math.max(
      1,
      Math.ceil((iniciaEm + this.limites.janelaMs - agora) / 1000),
    );
  }
}

function erroLimite(): ErroApi {
  return new ErroApi(
    HttpStatus.TOO_MANY_REQUESTS,
    'MUITAS_REQUISICOES',
    'Muitas requisições. Tente de novo em instantes.',
  );
}
