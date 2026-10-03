import type { CadastrarMoradorRequisicao } from '@ocorrencias/contratos';
import { verificarSenha } from '../../../core/auth/senha.js';
import { ErroApi } from '../../../core/http/erro-api.js';
import type { PrismaEscopado } from '../../../core/prisma/prisma-escopado.js';
import { ContextoTenant } from '../../../core/tenancy/contexto-tenant.js';
import type { CondominiosPublicoService } from '../../condominios/publico/condominios-publico.service.js';
import {
  CadastroMoradorService,
  INDICE_TELEFONE,
} from './cadastro-morador.service.js';

const CONDOMINIO = {
  id: 'cond-a',
  nome: 'Residencial A',
  slug: 'residencial-a',
};

const DTO: CadastrarMoradorRequisicao = {
  nome: 'João',
  telefone: '+5511987654321',
  bloco: 'B',
  apto: '302',
  senha: 'senha-forte-1',
};

function erroP2002(indice: string) {
  return Object.assign(new Error('unique'), {
    code: 'P2002',
    meta: { driverAdapterError: { cause: { constraint: { index: indice } } } },
  });
}

function preparar(existente: unknown, contagemAtualizada = 1) {
  const noContexto = <T>(valor: T) => {
    expect(ContextoTenant.obter()).toBe(CONDOMINIO.id);
    return Promise.resolve(valor);
  };
  const usuario = {
    findUnique: vi.fn(() => noContexto(existente)),
    create: vi.fn(() => noContexto({ id: 'novo' })),
    updateMany: vi.fn(() => noContexto({ count: contagemAtualizada })),
  };
  const condominios = {
    executarNoCondominio: vi.fn(
      (_: string, bloco: (c: typeof CONDOMINIO) => Promise<unknown>) =>
        ContextoTenant.executar(CONDOMINIO.id, () => bloco(CONDOMINIO)),
    ),
  };
  const servico = new CadastroMoradorService(
    condominios as unknown as CondominiosPublicoService,
    { usuario } as unknown as PrismaEscopado,
  );
  return { servico, usuario, condominios };
}

async function corpoDoErro(promessa: Promise<unknown>) {
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

const TELEFONE_EM_USO = {
  statusCode: 409,
  code: 'TELEFONE_EM_USO',
  message: 'Este telefone já tem cadastro neste condomínio.',
  details: { campo: 'telefone' },
};

describe('CadastroMoradorService', () => {
  it('cria o morador PENDENTE no condomínio do slug, com senha em hash', async () => {
    const { servico, usuario, condominios } = preparar(null);

    const resposta = await servico.cadastrar('residencial-a', {
      ...DTO,
      email: 'joao@exemplo.com',
    });

    expect(condominios.executarNoCondominio).toHaveBeenCalledWith(
      'residencial-a',
      expect.any(Function),
    );
    expect(resposta).toEqual({
      nome: 'João',
      status: 'PENDENTE',
      condominio: { nome: 'Residencial A', slug: 'residencial-a' },
    });
    const [{ data }] = usuario.create.mock.calls[0] as unknown as [
      { data: Record<string, unknown> },
    ];
    expect(data).toMatchObject({
      condominioId: 'cond-a',
      nome: 'João',
      telefone: '+5511987654321',
      email: 'joao@exemplo.com',
      bloco: 'B',
      apto: '302',
      papel: 'MORADOR',
      status: 'PENDENTE',
    });
    await expect(
      verificarSenha(data.senhaHash as string, DTO.senha),
    ).resolves.toBe(true);
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });

  it('grava e-mail ausente como null', async () => {
    const { servico, usuario } = preparar(null);
    await servico.cadastrar('residencial-a', DTO);
    expect(usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: null }),
      }),
    );
  });

  it.each(['PENDENTE', 'ATIVO', 'INATIVO'])(
    'telefone de morador %s: 409 TELEFONE_EM_USO, sem gravar',
    async (status) => {
      const { servico, usuario } = preparar({
        id: 'u1',
        papel: 'MORADOR',
        status,
      });

      await expect(
        corpoDoErro(servico.cadastrar('residencial-a', DTO)),
      ).resolves.toEqual(TELEFONE_EM_USO);
      expect(usuario.create).not.toHaveBeenCalled();
      expect(usuario.updateMany).not.toHaveBeenCalled();
    },
  );

  it.each(['SINDICO', 'SUBSINDICO'])(
    'telefone de %s: 409, mesmo com status RECUSADO',
    async (papel) => {
      const { servico, usuario } = preparar({
        id: 'u1',
        papel,
        status: 'RECUSADO',
      });
      await expect(
        corpoDoErro(servico.cadastrar('residencial-a', DTO)),
      ).resolves.toEqual(TELEFONE_EM_USO);
      expect(usuario.updateMany).not.toHaveBeenCalled();
    },
  );

  it('telefone de RECUSADO reabre o mesmo registro como PENDENTE, com dados e senha novos', async () => {
    const { servico, usuario } = preparar({
      id: 'u1',
      papel: 'MORADOR',
      status: 'RECUSADO',
    });

    await servico.cadastrar('residencial-a', DTO);

    expect(usuario.create).not.toHaveBeenCalled();
    const [{ where, data }] = usuario.updateMany.mock.calls[0] as unknown as [
      { where: unknown; data: Record<string, unknown> },
    ];
    expect(where).toEqual({ id: 'u1', papel: 'MORADOR', status: 'RECUSADO' });
    expect(data).toMatchObject({
      nome: 'João',
      bloco: 'B',
      apto: '302',
      email: null,
      status: 'PENDENTE',
      senhaTemporaria: false,
      versaoSessao: { increment: 1 },
    });
    expect(data).not.toHaveProperty('telefone');
    expect(data).not.toHaveProperty('papel');
    await expect(
      verificarSenha(data.senhaHash as string, DTO.senha),
    ).resolves.toBe(true);
  });

  it('se o RECUSADO mudou de status antes da reabertura, responde 409 sem sobrescrever', async () => {
    const { servico } = preparar(
      { id: 'u1', papel: 'MORADOR', status: 'RECUSADO' },
      0,
    );
    await expect(
      corpoDoErro(servico.cadastrar('residencial-a', DTO)),
    ).resolves.toEqual(TELEFONE_EM_USO);
  });

  it('corrida no índice (condominio_id, telefone) vira 409', async () => {
    const { servico, usuario } = preparar(null);
    usuario.create.mockRejectedValueOnce(erroP2002(INDICE_TELEFONE));
    await expect(
      corpoDoErro(servico.cadastrar('residencial-a', DTO)),
    ).resolves.toEqual(TELEFONE_EM_USO);
  });

  it('violação de outro índice não é mascarada como 409', async () => {
    const { servico, usuario } = preparar(null);
    usuario.create.mockRejectedValueOnce(erroP2002('outro_indice'));
    await expect(servico.cadastrar('residencial-a', DTO)).rejects.toThrow(
      'unique',
    );
  });

  it('repassa o 404 do slug sem consultar usuário', async () => {
    const { servico, usuario, condominios } = preparar(null);
    const naoEncontrado = new ErroApi(
      404,
      'CONDOMINIO_NAO_ENCONTRADO',
      'Condomínio não encontrado.',
    );
    condominios.executarNoCondominio.mockRejectedValueOnce(naoEncontrado);

    await expect(servico.cadastrar('nao-existe', DTO)).rejects.toBe(
      naoEncontrado,
    );
    expect(usuario.findUnique).not.toHaveBeenCalled();
  });
});
