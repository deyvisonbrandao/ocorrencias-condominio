import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AtualizarCondominioRequisicao,
  CodigoErroCondominio,
  type CondominioAdmin,
} from '@ocorrencias/contratos';
import { ErroApi } from '../../core/http/erro-api.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../core/prisma/prisma-escopado.js';

const SELECAO = { nome: true, slug: true, cidade: true, uf: true } as const;

export const TENTATIVAS_EDICAO = 5;

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

  async atualizar(
    atorId: string,
    dados: AtualizarCondominioRequisicao,
  ): Promise<CondominioAdmin> {
    const novo: CamposEditaveis = {
      nome: dados.nome,
      cidade: dados.cidade,
      uf: dados.uf,
    };
    for (let tentativa = 1; tentativa <= TENTATIVAS_EDICAO; tentativa++) {
      const resultado = await this.tentarAtualizar(atorId, novo);
      if (resultado) {
        return resultado;
      }
    }
    throw new ErroApi(
      HttpStatus.CONFLICT,
      CodigoErroCondominio.EDICAO_CONCORRENTE,
      'Os dados do condomínio foram alterados ao mesmo tempo em outra tela. Recarregue a página e tente de novo.',
    );
  }

  // Lock otimista em vez de SELECT ... FOR UPDATE: SQL cru é bloqueado no PrismaEscopado (ADR-001).
  // Cada tentativa é uma transação nova porque, no REPEATABLE READ, reler na mesma transação devolveria o mesmo snapshot.
  private tentarAtualizar(
    atorId: string,
    novo: CamposEditaveis,
  ): Promise<CondominioAdmin | null> {
    return this.prisma.$transaction(async (tx) => {
      const { id, versao, ...atual } = await tx.condominio.findFirstOrThrow({
        select: { id: true, versao: true, ...SELECAO },
      });
      const mudanca = diferenca(atual, novo);
      if (!mudanca) {
        return atual;
      }
      const { count } = await tx.condominio.updateMany({
        where: { id, versao },
        data: { ...novo, versao: { increment: 1 } },
      });
      if (count === 0) {
        return null;
      }
      const atualizado: CondominioAdmin = { ...atual, ...novo };
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
