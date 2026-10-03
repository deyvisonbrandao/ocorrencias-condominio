import { Injectable } from '@nestjs/common';
import type {
  AtualizarCondominioRequisicao,
  CondominioAdmin,
} from '@ocorrencias/contratos';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../core/prisma/prisma-escopado.js';

const SELECAO = { nome: true, slug: true, cidade: true, uf: true } as const;

type CamposEditaveis = Pick<CondominioAdmin, 'nome' | 'cidade' | 'uf'>;

export interface DiferencaCondominio {
  de: Record<string, string | null>;
  para: Record<string, string | null>;
}

export function diferenca(
  atual: CamposEditaveis,
  novo: CamposEditaveis,
): DiferencaCondominio | null {
  const de: Record<string, string | null> = {};
  const para: Record<string, string | null> = {};
  for (const campo of ['nome', 'cidade', 'uf'] as const) {
    if (atual[campo] !== novo[campo]) {
      de[campo] = atual[campo];
      para[campo] = novo[campo];
    }
  }
  return Object.keys(para).length === 0 ? null : { de, para };
}

@Injectable()
export class CondominioAdminService {
  constructor(
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  obter(): Promise<CondominioAdmin> {
    return this.prisma.condominio.findFirstOrThrow({ select: SELECAO });
  }

  atualizar(
    atorId: string,
    dados: AtualizarCondominioRequisicao,
  ): Promise<CondominioAdmin> {
    const novo: CamposEditaveis = {
      nome: dados.nome,
      cidade: dados.cidade,
      uf: dados.uf,
    };
    return this.prisma.$transaction(async (tx) => {
      const { id, ...atual } = await tx.condominio.findFirstOrThrow({
        select: { id: true, ...SELECAO },
      });
      const mudanca = diferenca(atual, novo);
      if (!mudanca) {
        return atual;
      }
      const atualizado = await tx.condominio.update({
        where: { id },
        data: novo,
        select: SELECAO,
      });
      await tx.auditoriaAdmin.create({
        data: {
          condominioId: id,
          atorId,
          acao: 'CONDOMINIO_ATUALIZADO',
          dados: { de: mudanca.de, para: mudanca.para },
        },
        select: { id: true },
      });
      return atualizado;
    });
  }
}
