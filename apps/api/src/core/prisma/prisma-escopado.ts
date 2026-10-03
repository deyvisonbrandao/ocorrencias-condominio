import { Inject } from '@nestjs/common';
import { ContextoTenant } from '../tenancy/contexto-tenant.js';
import {
  CAMPO_CONDOMINIO,
  camposEscalares,
  type Classificacao,
  CLASSIFICACAO_MODELOS,
} from './classificacao-modelos.js';
import type { PrismaSistema } from './prisma-sistema.js';

export class AcessoEscopadoError extends Error {
  constructor(mensagem: string) {
    super(`PrismaEscopado: ${mensagem}`);
    this.name = 'AcessoEscopadoError';
  }
}

type Args = Record<string, unknown>;

const SO_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'delete',
  'deleteMany',
]);
const ATUALIZACOES = new Set(['update', 'updateMany', 'updateManyAndReturn']);
const CRIACOES_EM_LOTE = new Set(['createMany', 'createManyAndReturn']);

const escalaresPorModelo = new Map<string, ReadonlySet<string>>();

function escalaresDe(modelo: string): ReadonlySet<string> {
  let campos = escalaresPorModelo.get(modelo);
  if (!campos) {
    campos = camposEscalares(modelo);
    escalaresPorModelo.set(modelo, campos);
  }
  return campos;
}

function ehObjeto(valor: unknown): valor is Args {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function campoDoFiltro(classificacao: Exclude<Classificacao, 'global'>) {
  return classificacao === 'raiz' ? 'id' : CAMPO_CONDOMINIO;
}

function escoparWhere(
  where: unknown,
  campo: string,
  condominioId: string,
): Args {
  if (where !== undefined && !ehObjeto(where)) {
    throw new AcessoEscopadoError('where inválido');
  }
  const atual = where ?? {};
  if (campo in atual && atual[campo] !== condominioId) {
    throw new AcessoEscopadoError(
      `${campo} no where diferente do condomínio do contexto`,
    );
  }
  return { ...atual, [campo]: condominioId };
}

// Escrita aninhada (connect, create, set...) escapa do hook do modelo filho, então só vale escrita em campo escalar.
function conferirSoEscalares(modelo: string, data: Args): void {
  const escalares = escalaresDe(modelo);
  const aninhado = Object.keys(data).find((chave) => !escalares.has(chave));
  if (aninhado) {
    throw new AcessoEscopadoError(
      `escrita aninhada em ${modelo}.${aninhado} não é permitida; grave cada modelo na sua própria operação`,
    );
  }
}

function escoparAtualizacao(
  modelo: string,
  data: unknown,
  campo: string,
): Args {
  if (!ehObjeto(data)) {
    throw new AcessoEscopadoError('data inválido');
  }
  conferirSoEscalares(modelo, data);
  if (campo in data) {
    throw new AcessoEscopadoError(`${modelo}.${campo} não pode ser alterado`);
  }
  return data;
}

function escoparCriacao(
  modelo: string,
  data: unknown,
  condominioId: string,
): Args {
  if (!ehObjeto(data)) {
    throw new AcessoEscopadoError('data inválido');
  }
  conferirSoEscalares(modelo, data);
  if (CAMPO_CONDOMINIO in data && data[CAMPO_CONDOMINIO] !== condominioId) {
    throw new AcessoEscopadoError(
      `${CAMPO_CONDOMINIO} em data diferente do condomínio do contexto`,
    );
  }
  return { ...data, [CAMPO_CONDOMINIO]: condominioId };
}

export function escoparArgs(
  modelo: string,
  operacao: string,
  args: Args | undefined,
  condominioId: string,
): Args {
  const classificacao = (
    CLASSIFICACAO_MODELOS as Record<string, Classificacao | undefined>
  )[modelo];
  if (classificacao === undefined) {
    throw new AcessoEscopadoError(`modelo ${modelo} sem classificação`);
  }
  const original = args ?? {};
  if (classificacao === 'global') {
    return original;
  }
  const campo = campoDoFiltro(classificacao);

  if (SO_WHERE.has(operacao)) {
    return {
      ...original,
      where: escoparWhere(original.where, campo, condominioId),
    };
  }
  if (ATUALIZACOES.has(operacao)) {
    return {
      ...original,
      where: escoparWhere(original.where, campo, condominioId),
      data: escoparAtualizacao(modelo, original.data, campo),
    };
  }
  if (classificacao === 'raiz') {
    throw new AcessoEscopadoError(
      `${modelo}.${operacao} não é permitido; o condomínio é criado só pelo PrismaSistema`,
    );
  }
  if (operacao === 'create') {
    return {
      ...original,
      data: escoparCriacao(modelo, original.data, condominioId),
    };
  }
  if (CRIACOES_EM_LOTE.has(operacao)) {
    const data = original.data;
    return {
      ...original,
      data: Array.isArray(data)
        ? data.map((item) => escoparCriacao(modelo, item, condominioId))
        : escoparCriacao(modelo, data, condominioId),
    };
  }
  if (operacao === 'upsert') {
    return {
      ...original,
      where: escoparWhere(original.where, campo, condominioId),
      create: escoparCriacao(modelo, original.create, condominioId),
      update: escoparAtualizacao(modelo, original.update, campo),
    };
  }
  throw new AcessoEscopadoError(`operação ${modelo}.${operacao} não suportada`);
}

export function criarPrismaEscopado(sistema: PrismaSistema) {
  return sistema.$extends({
    name: 'prisma-escopado',
    query: {
      $allOperations({ model, operation, args, query }) {
        if (model === undefined) {
          throw new AcessoEscopadoError(
            `${operation} é bloqueado; SQL cru só pelo PrismaSistema, com o filtro por condomínio escrito e revisado`,
          );
        }
        const condominioId = ContextoTenant.exigir();
        return query(
          escoparArgs(model, operation, args as Args | undefined, condominioId),
        );
      },
    },
  });
}

export type PrismaEscopado = ReturnType<typeof criarPrismaEscopado>;

export const PRISMA_ESCOPADO = Symbol('PrismaEscopado');

export const InjetarPrismaEscopado = (): ParameterDecorator =>
  Inject(PRISMA_ESCOPADO);
