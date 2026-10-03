import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AcaoMorador,
  CodigoErroMorador,
  type ContagemMoradores,
  LIMITE_PAGINA_MORADORES,
  type MoradorAdmin,
  type PaginaMoradores,
  type StatusUsuario,
  TRANSICOES_MORADOR,
  type TransicaoMoradorInvalidaDetalhes,
} from '@ocorrencias/contratos';
import type { UsuarioAutenticado } from '../../core/auth/usuario-autenticado.js';
import { ErroApi } from '../../core/http/erro-api.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../core/prisma/prisma-escopado.js';
import type { AcaoAuditoria } from '../../generated/prisma/client.js';
import {
  apresentarMorador,
  codificarCursor,
  decodificarCursor,
  filtroMoradores,
  idValido,
  motivoDosDados,
  type PosicaoCursor,
} from './consulta-moradores.js';
import type { ListarMoradoresDto } from './dto/moradores.dto.js';

const SELECAO_MORADOR = {
  id: true,
  nome: true,
  telefone: true,
  bloco: true,
  apto: true,
  status: true,
  criadoEm: true,
} as const;

const AUDITORIA_POR_ACAO: Record<AcaoMorador, AcaoAuditoria> = {
  aprovar: 'MORADOR_APROVADO',
  recusar: 'MORADOR_RECUSADO',
  inativar: 'USUARIO_INATIVADO',
  reativar: 'USUARIO_REATIVADO',
};

export function moradorNaoEncontrado(): ErroApi {
  return new ErroApi(
    HttpStatus.NOT_FOUND,
    CodigoErroMorador.MORADOR_NAO_ENCONTRADO,
    'Morador não encontrado.',
  );
}

export function transicaoInvalida(statusAtual: StatusUsuario): ErroApi {
  const detalhes: TransicaoMoradorInvalidaDetalhes = { statusAtual };
  return new ErroApi(
    HttpStatus.CONFLICT,
    CodigoErroMorador.TRANSICAO_MORADOR_INVALIDA,
    'Esta ação não está mais disponível para este morador. Recarregue para ver o status atual.',
    detalhes,
  );
}

function cursorInvalido(): ErroApi {
  return new ErroApi(
    HttpStatus.BAD_REQUEST,
    CodigoErroMorador.CURSOR_INVALIDO,
    'A lista mudou. Recarregue para ver os moradores.',
  );
}

@Injectable()
export class MoradoresService {
  constructor(
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  async listar(consulta: ListarMoradoresDto): Promise<PaginaMoradores> {
    let cursor: PosicaoCursor | undefined;
    if (consulta.cursor !== undefined) {
      cursor = decodificarCursor(consulta.cursor) ?? undefined;
      if (!cursor) {
        throw cursorInvalido();
      }
    }
    const limite = consulta.limite ?? LIMITE_PAGINA_MORADORES.padrao;

    const linhas = await this.prisma.usuario.findMany({
      where: filtroMoradores(consulta.status, consulta.q, cursor),
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      take: limite + 1,
      select: SELECAO_MORADOR,
    });
    const pagina = linhas.slice(0, limite);
    const motivos = await this.motivosDeRecusa(
      pagina.filter((m) => m.status === 'RECUSADO').map((m) => m.id),
    );
    const ultima = pagina.at(-1);

    return {
      itens: pagina.map((m) => apresentarMorador(m, motivos.get(m.id) ?? null)),
      proximoCursor:
        linhas.length > limite && ultima ? codificarCursor(ultima) : null,
    };
  }

  async contar(): Promise<ContagemMoradores> {
    const grupos = await this.prisma.usuario.groupBy({
      by: ['status'],
      where: { papel: 'MORADOR' },
      _count: { _all: true },
    });
    const total = (status: StatusUsuario) =>
      grupos.find((g) => g.status === status)?._count._all ?? 0;
    return {
      pendentes: total('PENDENTE'),
      ativos: total('ATIVO'),
      recusados: total('RECUSADO'),
      inativos: total('INATIVO'),
    };
  }

  // O update condicional pelo status esperado é o que serializa ações concorrentes: das duas, só uma
  // encontra a linha no status de origem; a outra cai no diagnóstico e recebe 409.
  async transicionar(
    acao: AcaoMorador,
    id: string,
    ator: UsuarioAutenticado,
    motivo?: string,
  ): Promise<MoradorAdmin> {
    if (!idValido(id)) {
      throw moradorNaoEncontrado();
    }
    const { de, para } = TRANSICOES_MORADOR[acao];

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.usuario.updateMany({
        where: { id, papel: 'MORADOR', status: de },
        data:
          acao === 'inativar'
            ? { status: para, versaoSessao: { increment: 1 } }
            : { status: para },
      });
      if (count === 0) {
        const atual = await tx.usuario.findFirst({
          where: { id, papel: 'MORADOR' },
          select: { status: true },
        });
        throw atual ? transicaoInvalida(atual.status) : moradorNaoEncontrado();
      }

      await tx.auditoriaAdmin.create({
        data: {
          condominioId: ator.condominioId,
          atorId: ator.id,
          alvoId: id,
          acao: AUDITORIA_POR_ACAO[acao],
          dados:
            motivo === undefined
              ? { statusAnterior: de, statusNovo: para }
              : { statusAnterior: de, statusNovo: para, motivo },
        },
        select: { id: true },
      });

      const morador = await tx.usuario.findFirstOrThrow({
        where: { id },
        select: SELECAO_MORADOR,
      });
      return apresentarMorador(morador, motivo ?? null);
    });
  }

  // O motivo vive só na auditoria: vale o registro MORADOR_RECUSADO mais recente do alvo, e ele só é
  // exibido enquanto o status for RECUSADO. Um recadastro que volte o morador a PENDENTE esconde o motivo
  // antigo sem precisar apagar nada.
  private async motivosDeRecusa(
    ids: string[],
  ): Promise<Map<string, string | null>> {
    const motivos = new Map<string, string | null>();
    if (ids.length === 0) {
      return motivos;
    }
    const registros = await this.prisma.auditoriaAdmin.findMany({
      where: { alvoId: { in: ids }, acao: 'MORADOR_RECUSADO' },
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      select: { alvoId: true, dados: true },
    });
    for (const registro of registros) {
      if (registro.alvoId && !motivos.has(registro.alvoId)) {
        motivos.set(registro.alvoId, motivoDosDados(registro.dados));
      }
    }
    return motivos;
  }
}
