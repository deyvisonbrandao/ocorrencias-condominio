import { Injectable } from '@nestjs/common';
import type { PainelAdmin } from '@ocorrencias/contratos';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../core/prisma/prisma-escopado.js';

@Injectable()
export class PainelService {
  constructor(
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  async resumo(): Promise<PainelAdmin> {
    const condominio = await this.prisma.condominio.findFirstOrThrow({
      select: { nome: true, slug: true },
    });
    return { condominio };
  }
}
