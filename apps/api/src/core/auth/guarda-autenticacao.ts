import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CodigoErroSessao } from '@ocorrencias/contratos';
import type { Response } from 'express';
import { ErroApi } from '../http/erro-api.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../prisma/prisma-escopado.js';
import { ContextoTenant } from '../tenancy/contexto-tenant.js';
import { SessaoJwt } from './sessao-jwt.js';
import {
  CHAVE_PUBLICO,
  type RequisicaoAutenticada,
} from './usuario-autenticado.js';

export function naoAutenticado(): ErroApi {
  return new ErroApi(
    HttpStatus.UNAUTHORIZED,
    CodigoErroSessao.NAO_AUTENTICADO,
    'Sua sessão terminou. Entre de novo.',
  );
}

// O cid do token já teve a assinatura conferida, então é vinculado antes da busca: o usuário é lido pelo
// PrismaEscopado, preso ao condomínio do token, e um sub de outro condomínio simplesmente não é encontrado.
@Injectable()
export class GuardaAutenticacao implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessao: SessaoJwt,
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean | undefined>(
      CHAVE_PUBLICO,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (publico) {
      return true;
    }

    const http = contexto.switchToHttp();
    const requisicao = http.getRequest<RequisicaoAutenticada>();
    const token = this.sessao.ler(requisicao);
    if (!token) {
      throw this.recusar(http.getResponse<Response>(), requisicao);
    }

    ContextoTenant.vincular(token.cid);
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: token.sub },
      select: {
        id: true,
        condominioId: true,
        papel: true,
        status: true,
        versaoSessao: true,
        condominio: { select: { status: true } },
      },
    });
    if (
      !usuario ||
      usuario.status !== 'ATIVO' ||
      usuario.versaoSessao !== token.sv ||
      usuario.condominio.status !== 'ATIVO'
    ) {
      throw this.recusar(http.getResponse<Response>(), requisicao);
    }

    requisicao.usuario = {
      id: usuario.id,
      condominioId: usuario.condominioId,
      papel: usuario.papel,
    };
    return true;
  }

  private recusar(
    resposta: Response,
    requisicao: RequisicaoAutenticada,
  ): ErroApi {
    if (this.sessao.presente(requisicao)) {
      this.sessao.encerrar(resposta);
    }
    return naoAutenticado();
  }
}
