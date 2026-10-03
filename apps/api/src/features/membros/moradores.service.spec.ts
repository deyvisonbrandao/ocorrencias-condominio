import { ErroApi } from '../../core/http/erro-api.js';
import type { PrismaEscopado } from '../../core/prisma/prisma-escopado.js';
import { codificarCursor } from './consulta-moradores.js';
import { MoradoresService } from './moradores.service.js';

const ID = '0199a5c2-7f3e-7a51-9b0e-3c2d1e4f5a6b';
const ATOR = {
  id: 'ator-1',
  condominioId: 'cond-a',
  papel: 'SINDICO' as const,
};

function linha(ajustes: Record<string, unknown> = {}) {
  return {
    id: ID,
    nome: 'João',
    telefone: '+5511912345678',
    bloco: 'B',
    apto: '302',
    status: 'PENDENTE',
    criadoEm: new Date('2026-10-03T14:31:33.000Z'),
    ...ajustes,
  };
}

function preparar() {
  const tx = {
    usuario: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    auditoriaAdmin: { create: vi.fn(() => Promise.resolve({ id: 'a1' })) },
  };
  const prisma = {
    $transaction: vi.fn((fn: (cliente: typeof tx) => unknown) => fn(tx)),
    usuario: { findMany: vi.fn(), groupBy: vi.fn() },
    auditoriaAdmin: { findMany: vi.fn(() => Promise.resolve([])) },
  };
  const servico = new MoradoresService(prisma as unknown as PrismaEscopado);
  return { servico, prisma, tx };
}

async function erroDe(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (erro) {
    if (erro instanceof ErroApi) {
      return erro.getResponse();
    }
    throw erro;
  }
  throw new Error('era esperado ErroApi');
}

describe('MoradoresService.transicionar', () => {
  it('id fora do formato responde 404 sem tocar no banco', async () => {
    const { servico, prisma } = preparar();
    expect(await erroDe(servico.transicionar('aprovar', 'x', ATOR))).toEqual({
      statusCode: 404,
      code: 'MORADOR_NAO_ENCONTRADO',
      message: 'Morador não encontrado.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('aprova com update condicional pelo status de origem e audita', async () => {
    const { servico, tx } = preparar();
    tx.usuario.updateMany.mockResolvedValue({ count: 1 });
    tx.usuario.findFirstOrThrow.mockResolvedValue(linha({ status: 'ATIVO' }));

    const resultado = await servico.transicionar('aprovar', ID, ATOR);

    expect(tx.usuario.updateMany).toHaveBeenCalledWith({
      where: { id: ID, papel: 'MORADOR', status: 'PENDENTE' },
      data: { status: 'ATIVO' },
    });
    expect(tx.auditoriaAdmin.create).toHaveBeenCalledWith({
      data: {
        condominioId: 'cond-a',
        atorId: 'ator-1',
        alvoId: ID,
        acao: 'MORADOR_APROVADO',
        dados: { statusAnterior: 'PENDENTE', statusNovo: 'ATIVO' },
      },
      select: { id: true },
    });
    expect(resultado).toMatchObject({
      id: ID,
      status: 'ATIVO',
      motivoRecusa: null,
    });
  });

  it('inativar incrementa a versão da sessão', async () => {
    const { servico, tx } = preparar();
    tx.usuario.updateMany.mockResolvedValue({ count: 1 });
    tx.usuario.findFirstOrThrow.mockResolvedValue(linha({ status: 'INATIVO' }));

    await servico.transicionar('inativar', ID, ATOR);

    expect(tx.usuario.updateMany).toHaveBeenCalledWith({
      where: { id: ID, papel: 'MORADOR', status: 'ATIVO' },
      data: { status: 'INATIVO', versaoSessao: { increment: 1 } },
    });
    expect(tx.auditoriaAdmin.create.mock.calls[0]).toMatchObject([
      { data: { acao: 'USUARIO_INATIVADO' } },
    ]);
  });

  it('recusar grava o motivo na auditoria e o devolve', async () => {
    const { servico, tx } = preparar();
    tx.usuario.updateMany.mockResolvedValue({ count: 1 });
    tx.usuario.findFirstOrThrow.mockResolvedValue(
      linha({ status: 'RECUSADO' }),
    );

    const resultado = await servico.transicionar(
      'recusar',
      ID,
      ATOR,
      'Apto não existe',
    );

    expect(tx.auditoriaAdmin.create.mock.calls[0]).toMatchObject([
      {
        data: {
          acao: 'MORADOR_RECUSADO',
          dados: {
            statusAnterior: 'PENDENTE',
            statusNovo: 'RECUSADO',
            motivo: 'Apto não existe',
          },
        },
      },
    ]);
    expect(resultado.motivoRecusa).toBe('Apto não existe');
  });

  it('status diferente do esperado responde 409 com o status atual, sem auditar', async () => {
    const { servico, tx } = preparar();
    tx.usuario.updateMany.mockResolvedValue({ count: 0 });
    tx.usuario.findFirst.mockResolvedValue({ status: 'RECUSADO' });

    expect(await erroDe(servico.transicionar('aprovar', ID, ATOR))).toEqual({
      statusCode: 409,
      code: 'TRANSICAO_MORADOR_INVALIDA',
      message:
        'Esta ação não está mais disponível para este morador. Recarregue para ver o status atual.',
      details: { statusAtual: 'RECUSADO' },
    });
    expect(tx.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: ID, papel: 'MORADOR' },
      select: { status: true },
    });
    expect(tx.auditoriaAdmin.create).not.toHaveBeenCalled();
  });

  it('alvo que não é morador ou não existe no condomínio responde 404', async () => {
    const { servico, tx } = preparar();
    tx.usuario.updateMany.mockResolvedValue({ count: 0 });
    tx.usuario.findFirst.mockResolvedValue(null);

    expect(
      (await erroDe(servico.transicionar('reativar', ID, ATOR))) as object,
    ).toMatchObject({ statusCode: 404, code: 'MORADOR_NAO_ENCONTRADO' });
    expect(tx.auditoriaAdmin.create).not.toHaveBeenCalled();
  });
});

describe('MoradoresService.listar e contar', () => {
  it('pagina por limite + 1 e devolve o cursor do último item', async () => {
    const { servico, prisma } = preparar();
    const linhas = [
      linha({ id: '0199a5c2-0000-7000-8000-000000000003' }),
      linha({ id: '0199a5c2-0000-7000-8000-000000000002' }),
      linha({ id: '0199a5c2-0000-7000-8000-000000000001' }),
    ];
    prisma.usuario.findMany.mockResolvedValue(linhas);

    const pagina = await servico.listar({ limite: 2 });

    expect(prisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(pagina.itens).toHaveLength(2);
    expect(pagina.proximoCursor).toBe(
      codificarCursor({ criadoEm: linhas[1].criadoEm, id: linhas[1].id }),
    );
  });

  it('última página não tem cursor e não busca motivo sem recusados', async () => {
    const { servico, prisma } = preparar();
    prisma.usuario.findMany.mockResolvedValue([linha()]);

    const pagina = await servico.listar({});

    expect(pagina.proximoCursor).toBeNull();
    expect(prisma.auditoriaAdmin.findMany).not.toHaveBeenCalled();
  });

  it('o motivo de cada recusado vem do registro de recusa mais recente', async () => {
    const { servico, prisma } = preparar();
    prisma.usuario.findMany.mockResolvedValue([linha({ status: 'RECUSADO' })]);
    prisma.auditoriaAdmin.findMany.mockResolvedValue([
      { alvoId: ID, dados: { motivo: 'novo' } },
      { alvoId: ID, dados: { motivo: 'antigo' } },
    ]);

    const pagina = await servico.listar({ status: ['RECUSADO'] });

    expect(prisma.auditoriaAdmin.findMany).toHaveBeenCalledWith({
      where: { alvoId: { in: [ID] }, acao: 'MORADOR_RECUSADO' },
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      select: { alvoId: true, dados: true },
    });
    expect(pagina.itens[0].motivoRecusa).toBe('novo');
  });

  it('cursor inválido responde 400 CURSOR_INVALIDO', async () => {
    const { servico, prisma } = preparar();
    expect(
      (await erroDe(servico.listar({ cursor: 'invalido' }))) as object,
    ).toMatchObject({ statusCode: 400, code: 'CURSOR_INVALIDO' });
    expect(prisma.usuario.findMany).not.toHaveBeenCalled();
  });

  it('contagem preenche com zero os status sem moradores', async () => {
    const { servico, prisma } = preparar();
    prisma.usuario.groupBy.mockResolvedValue([
      { status: 'PENDENTE', _count: { _all: 3 } },
      { status: 'ATIVO', _count: { _all: 10 } },
    ]);

    expect(await servico.contar()).toEqual({
      pendentes: 3,
      ativos: 10,
      recusados: 0,
      inativos: 0,
    });
    expect(prisma.usuario.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { papel: 'MORADOR' },
      _count: { _all: true },
    });
  });
});
