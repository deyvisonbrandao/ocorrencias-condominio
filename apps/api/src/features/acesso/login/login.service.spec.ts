import { HttpStatus } from '@nestjs/common';
import { gerarHashSenha, verificarSenha } from '../../../core/auth/senha.js';
import { ErroApi } from '../../../core/http/erro-api.js';
import type { PrismaEscopado } from '../../../core/prisma/prisma-escopado.js';
import { ContextoTenant } from '../../../core/tenancy/contexto-tenant.js';
import type { CondominiosPublicoService } from '../../condominios/publico/condominios-publico.service.js';
import { LoginService } from './login.service.js';

vi.mock('../../../core/auth/senha.js', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../core/auth/senha.js')>();
  return { ...original, verificarSenha: vi.fn(original.verificarSenha) };
});

const SENHA = 'senha-correta-1';
const CONDOMINIO = {
  id: 'cond-a',
  nome: 'Residencial A',
  slug: 'residencial-a',
};

let hashReal: string;

beforeAll(async () => {
  hashReal = await gerarHashSenha(SENHA);
});

function usuario(ajustes: Record<string, unknown> = {}) {
  return {
    id: 'usuario-1',
    nome: 'Maria',
    telefone: '+5511912345678',
    senhaHash: hashReal,
    papel: 'MORADOR',
    status: 'ATIVO',
    senhaTemporaria: false,
    versaoSessao: 4,
    ...ajustes,
  };
}

async function preparar(
  encontrado: unknown,
  condominioExiste = true,
): Promise<{ servico: LoginService; findUnique: ReturnType<typeof vi.fn> }> {
  const buscarAtivoPorSlug = vi.fn(() =>
    condominioExiste
      ? Promise.resolve(CONDOMINIO)
      : Promise.reject(
          new ErroApi(
            HttpStatus.NOT_FOUND,
            'CONDOMINIO_NAO_ENCONTRADO',
            'Condomínio não encontrado.',
          ),
        ),
  );
  const findUnique = vi.fn(() => {
    expect(ContextoTenant.obter()).toBe(CONDOMINIO.id);
    return Promise.resolve(encontrado);
  });
  const servico = new LoginService(
    { buscarAtivoPorSlug } as unknown as CondominiosPublicoService,
    { usuario: { findUnique } } as unknown as PrismaEscopado,
  );
  await servico.onModuleInit();
  vi.mocked(verificarSenha).mockClear();
  return { servico, findUnique };
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

const DTO = {
  slug: 'residencial-a',
  telefone: '(11) 91234-5678',
  senha: SENHA,
};

describe('LoginService', () => {
  it('com credencial correta devolve claims e dados mínimos, sem hash', async () => {
    const { servico, findUnique } = await preparar(usuario());

    const aceito = await servico.autenticar(DTO);

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          condominioId_telefone: {
            condominioId: 'cond-a',
            telefone: '+5511912345678',
          },
        },
      }),
    );
    expect(aceito.claims).toEqual({
      sub: 'usuario-1',
      cid: 'cond-a',
      papel: 'MORADOR',
      sv: 4,
    });
    expect(aceito.usuario).toEqual({
      nome: 'Maria',
      telefone: '+5511912345678',
      papel: 'MORADOR',
      status: 'ATIVO',
      senhaTemporaria: false,
      condominio: { nome: 'Residencial A', slug: 'residencial-a' },
    });
    expect(JSON.stringify(aceito)).not.toMatch(/argon2|senhaHash/);
  });

  const CREDENCIAL_INVALIDA = {
    statusCode: 401,
    code: 'CREDENCIAIS_INVALIDAS',
    message: 'Telefone ou senha inválidos.',
  };

  it('senha errada: 401 genérico', async () => {
    const { servico } = await preparar(usuario());
    await expect(
      erroDe(servico.autenticar({ ...DTO, senha: 'outra-senha' })),
    ).resolves.toEqual(CREDENCIAL_INVALIDA);
  });

  it.each([
    ['telefone inexistente', null, true, DTO.telefone],
    ['telefone fora do formato', null, true, '123'],
    ['condomínio inexistente', usuario(), false, DTO.telefone],
  ])(
    '%s: mesmo 401 e a mesma verificação argon2 (hash fictício)',
    async (_, encontrado, condominioExiste, telefone) => {
      const { servico } = await preparar(encontrado, condominioExiste);

      await expect(
        erroDe(servico.autenticar({ ...DTO, telefone })),
      ).resolves.toEqual(CREDENCIAL_INVALIDA);
      expect(verificarSenha).toHaveBeenCalledTimes(1);
      const [hashUsado] = vi.mocked(verificarSenha).mock.calls[0];
      const parametros = (hash: string) => hash.split('$').slice(0, 4);
      expect(parametros(hashUsado)).toEqual(parametros(hashReal));
      expect(hashUsado).not.toBe(hashReal);
    },
  );

  it.each([
    ['PENDENTE', 'CADASTRO_PENDENTE'],
    ['RECUSADO', 'CADASTRO_RECUSADO'],
    ['INATIVO', 'ACESSO_INATIVO'],
  ])('%s com senha correta: 403 %s', async (status, code) => {
    const { servico } = await preparar(usuario({ status }));
    await expect(erroDe(servico.autenticar(DTO))).resolves.toMatchObject({
      statusCode: 403,
      code,
    });
  });

  it.each(['PENDENTE', 'RECUSADO', 'INATIVO'])(
    '%s com senha errada: 401 genérico, sem revelar o status',
    async (status) => {
      const { servico } = await preparar(usuario({ status }));
      await expect(
        erroDe(servico.autenticar({ ...DTO, senha: 'errada-123' })),
      ).resolves.toEqual(CREDENCIAL_INVALIDA);
    },
  );

  it('repassa erro inesperado da busca do condomínio', async () => {
    const servico = new LoginService(
      {
        buscarAtivoPorSlug: () => Promise.reject(new Error('banco fora')),
      } as unknown as CondominiosPublicoService,
      {} as PrismaEscopado,
    );
    await servico.onModuleInit();
    await expect(servico.autenticar(DTO)).rejects.toThrow('banco fora');
  });
});
