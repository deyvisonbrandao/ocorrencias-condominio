import { Injectable } from '@nestjs/common';
import type { UsuarioSessao } from '@ocorrencias/contratos';
import { naoAutenticado } from '../../core/auth/guarda-autenticacao.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../core/prisma/prisma-escopado.js';

@Injectable()
export class MeService {
  constructor(
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  async obter(usuarioId: string): Promise<UsuarioSessao> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        nome: true,
        telefone: true,
        papel: true,
        status: true,
        senhaTemporaria: true,
        condominio: { select: { nome: true, slug: true } },
      },
    });
    if (!usuario) {
      throw naoAutenticado();
    }
    return usuario;
  }
}
