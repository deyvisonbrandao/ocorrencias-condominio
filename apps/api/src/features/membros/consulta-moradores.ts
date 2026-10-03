import {
  type MoradorAdmin,
  REGRAS_BUSCA_MORADORES,
  type StatusUsuario,
} from '@ocorrencias/contratos';
import type { Prisma } from '../../generated/prisma/client.js';

export interface PosicaoCursor {
  criadoEm: Date;
  id: string;
}

const FORMATO_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idValido(id: string): boolean {
  return FORMATO_ID.test(id);
}

export function codificarCursor(posicao: PosicaoCursor): string {
  return Buffer.from(
    JSON.stringify([posicao.criadoEm.toISOString(), posicao.id]),
  ).toString('base64url');
}

export function decodificarCursor(cursor: string): PosicaoCursor | null {
  let valor: unknown;
  try {
    valor = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    !Array.isArray(valor) ||
    valor.length !== 2 ||
    typeof valor[0] !== 'string' ||
    typeof valor[1] !== 'string' ||
    !idValido(valor[1])
  ) {
    return null;
  }
  const criadoEm = new Date(valor[0]);
  if (Number.isNaN(criadoEm.getTime()) || criadoEm.toISOString() !== valor[0]) {
    return null;
  }
  return { criadoEm, id: valor[1] };
}

export function termosDaBusca(q: string | undefined): string[] {
  if (!q) {
    return [];
  }
  return [...new Set(q.trim().split(/\s+/).filter(Boolean))].slice(
    0,
    REGRAS_BUSCA_MORADORES.termos,
  );
}

// O Prisma repassa o `contains` ao LIKE sem escapar os curingas no MySQL: "%" casaria com todo mundo.
export function escaparLike(termo: string): string {
  return termo.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Cada termo precisa aparecer em nome, bloco ou apto: "B 302" acha o apto 302 do bloco B.
// Maiúsculas e acentos são ignorados pela collation da coluna (utf8mb4_unicode_ci).
export function filtroMoradores(
  status: StatusUsuario[] | undefined,
  q: string | undefined,
  cursor: PosicaoCursor | undefined,
): Prisma.UsuarioWhereInput {
  const condicoes: Prisma.UsuarioWhereInput[] = termosDaBusca(q).map(
    (termo) => {
      const contains = escaparLike(termo);
      return {
        OR: [
          { nome: { contains } },
          { bloco: { contains } },
          { apto: { contains } },
        ],
      };
    },
  );
  if (cursor) {
    condicoes.push({
      OR: [
        { criadoEm: { lt: cursor.criadoEm } },
        { criadoEm: cursor.criadoEm, id: { lt: cursor.id } },
      ],
    });
  }
  return {
    papel: 'MORADOR',
    ...(status?.length ? { status: { in: status } } : {}),
    ...(condicoes.length ? { AND: condicoes } : {}),
  };
}

export function motivoDosDados(dados: unknown): string | null {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    return null;
  }
  const motivo = (dados as Record<string, unknown>).motivo;
  return typeof motivo === 'string' ? motivo : null;
}

export interface LinhaMorador {
  id: string;
  nome: string;
  telefone: string;
  bloco: string | null;
  apto: string | null;
  status: StatusUsuario;
  criadoEm: Date;
}

export function apresentarMorador(
  linha: LinhaMorador,
  motivoRecusa: string | null,
): MoradorAdmin {
  return {
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone,
    bloco: linha.bloco,
    apto: linha.apto,
    status: linha.status,
    criadoEm: linha.criadoEm.toISOString(),
    motivoRecusa: linha.status === 'RECUSADO' ? motivoRecusa : null,
  };
}
