import { ErroApi } from '../../core/http/erro-api.js';
import type { PrismaEscopado } from '../../core/prisma/prisma-escopado.js';
import {
  CondominioAdminService,
  diferenca,
  TENTATIVAS_EDICAO,
} from './condominio-admin.service.js';

describe('diferenca (auditoria de CONDOMINIO_ATUALIZADO)', () => {
  const atual = { nome: 'Aurora', cidade: null, uf: null };

  it('sem mudança devolve null', () => {
    expect(diferenca(atual, { ...atual })).toBeNull();
  });

  it('guarda só os campos alterados, com o de/para', () => {
    expect(
      diferenca(atual, { nome: 'Aurora', cidade: 'Recife', uf: 'PE' }),
    ).toEqual({
      de: { cidade: null, uf: null },
      para: { cidade: 'Recife', uf: 'PE' },
    });
  });
});

describe('CondominioAdminService.atualizar (lock otimista)', () => {
  const lido = {
    id: 'cond-a',
    versao: 7,
    nome: 'Aurora',
    slug: 'aurora',
    cidade: null,
    uf: null,
  };
  const novo = { nome: 'Aurora', cidade: 'Recife', uf: 'PE' } as const;

  function servicoCom(contagens: number[]) {
    const tx = {
      condominio: {
        findFirstOrThrow: vi.fn().mockResolvedValue(lido),
        updateMany: vi.fn(() =>
          Promise.resolve({ count: contagens.shift() ?? 0 }),
        ),
      },
      auditoriaAdmin: { create: vi.fn().mockResolvedValue({ id: 'aud' }) },
    };
    const prisma = {
      $transaction: vi.fn((bloco: (t: typeof tx) => Promise<unknown>) =>
        bloco(tx),
      ),
    };
    return {
      tx,
      prisma,
      servico: new CondominioAdminService(prisma as unknown as PrismaEscopado),
    };
  }

  it('grava só se a versão lida não mudou e incrementa a versão', async () => {
    const { tx, servico } = servicoCom([1]);

    await expect(servico.atualizar('ator', novo)).resolves.toEqual({
      ...novo,
      slug: 'aurora',
    });
    expect(tx.condominio.updateMany).toHaveBeenCalledWith({
      where: { id: 'cond-a', versao: 7 },
      data: { ...novo, versao: { increment: 1 } },
    });
    expect(tx.auditoriaAdmin.create).toHaveBeenCalledTimes(1);
  });

  it('versão alterada por outra edição: tenta de novo numa transação nova', async () => {
    const { tx, prisma, servico } = servicoCom([0, 0, 1]);

    await servico.atualizar('ator', novo);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(tx.auditoriaAdmin.create).toHaveBeenCalledTimes(1);
  });

  it('esgotadas as tentativas, responde 409 EDICAO_CONCORRENTE sem auditoria', async () => {
    const { tx, prisma, servico } = servicoCom([]);

    const erro = await servico.atualizar('ator', novo).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).getResponse()).toMatchObject({
      statusCode: 409,
      code: 'EDICAO_CONCORRENTE',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(TENTATIVAS_EDICAO);
    expect(tx.auditoriaAdmin.create).not.toHaveBeenCalled();
  });

  it('sem mudança não escreve nada', async () => {
    const { tx, servico } = servicoCom([]);

    await servico.atualizar('ator', {
      nome: 'Aurora',
      cidade: null as unknown as string,
      uf: null as unknown as 'PE',
    });
    expect(tx.condominio.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaAdmin.create).not.toHaveBeenCalled();
  });
});
