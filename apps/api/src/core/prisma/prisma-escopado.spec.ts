import { AppConfig } from '../config/app-config.js';
import {
  ContextoTenant,
  SemContextoTenantError,
} from '../tenancy/contexto-tenant.js';
import {
  AcessoEscopadoError,
  criarPrismaEscopado,
  escoparArgs,
} from './prisma-escopado.js';
import { PrismaSistema } from './prisma-sistema.js';

const A = 'cond-a';

describe('escoparArgs', () => {
  describe('modelo escopado', () => {
    it.each([
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
    ])('%s acrescenta condominioId ao where', (operacao) => {
      expect(
        escoparArgs(
          'Usuario',
          operacao,
          { where: { id: 'u1' }, select: { id: true } },
          A,
        ),
      ).toEqual({ where: { id: 'u1', condominioId: A }, select: { id: true } });
    });

    it('cria o where quando ele não vem', () => {
      expect(escoparArgs('Usuario', 'findMany', undefined, A)).toEqual({
        where: { condominioId: A },
      });
    });

    it('recusa where com outro condominioId, em vez de trocar o valor', () => {
      expect(() =>
        escoparArgs(
          'Usuario',
          'findMany',
          { where: { condominioId: 'cond-b' } },
          A,
        ),
      ).toThrow(AcessoEscopadoError);
      expect(
        escoparArgs('Usuario', 'findMany', { where: { condominioId: A } }, A),
      ).toEqual({ where: { condominioId: A } });
    });

    it('create injeta o condominioId do contexto', () => {
      expect(
        escoparArgs('Usuario', 'create', { data: { nome: 'Ana' } }, A),
      ).toEqual({ data: { nome: 'Ana', condominioId: A } });
    });

    it('create com outro condominioId em data é recusado', () => {
      expect(() =>
        escoparArgs(
          'Usuario',
          'create',
          { data: { condominioId: 'cond-b' } },
          A,
        ),
      ).toThrow(AcessoEscopadoError);
    });

    it('createMany injeta em cada item', () => {
      expect(
        escoparArgs(
          'AuditoriaAdmin',
          'createMany',
          { data: [{ atorId: 'u1' }, { atorId: 'u2' }] },
          A,
        ),
      ).toEqual({
        data: [
          { atorId: 'u1', condominioId: A },
          { atorId: 'u2', condominioId: A },
        ],
      });
    });

    it('update filtra o where e não deixa trocar o condomínio', () => {
      expect(
        escoparArgs(
          'Usuario',
          'update',
          { where: { id: 'u1' }, data: { nome: 'B' } },
          A,
        ),
      ).toEqual({ where: { id: 'u1', condominioId: A }, data: { nome: 'B' } });
      expect(() =>
        escoparArgs(
          'Usuario',
          'updateMany',
          { where: {}, data: { condominioId: 'cond-b' } },
          A,
        ),
      ).toThrow(AcessoEscopadoError);
    });

    it('upsert filtra o where, injeta no create e protege o update', () => {
      expect(
        escoparArgs(
          'Usuario',
          'upsert',
          { where: { id: 'u1' }, create: { nome: 'A' }, update: { nome: 'B' } },
          A,
        ),
      ).toEqual({
        where: { id: 'u1', condominioId: A },
        create: { nome: 'A', condominioId: A },
        update: { nome: 'B' },
      });
    });

    it.each([
      [
        'create',
        { data: { nome: 'A', condominio: { connect: { id: 'cond-b' } } } },
      ],
      [
        'update',
        {
          where: { id: 'u1' },
          data: { auditoriasComoAtor: { connect: { id: 'x' } } },
        },
      ],
    ])('%s com escrita aninhada em relação é recusado', (operacao, args) => {
      expect(() => escoparArgs('Usuario', operacao, args, A)).toThrow(
        /escrita aninhada/,
      );
    });

    it('operação desconhecida falha fechado', () => {
      expect(() => escoparArgs('Usuario', 'findRaw', {}, A)).toThrow(
        AcessoEscopadoError,
      );
    });
  });

  describe('raiz (Condominio)', () => {
    it('leitura e atualização só alcançam o condomínio do contexto', () => {
      expect(
        escoparArgs('Condominio', 'findUnique', { where: { slug: 'x' } }, A),
      ).toEqual({ where: { slug: 'x', id: A } });
      expect(
        escoparArgs(
          'Condominio',
          'update',
          { where: { id: A }, data: { nome: 'N' } },
          A,
        ),
      ).toEqual({ where: { id: A }, data: { nome: 'N' } });
    });

    it('recusa id de outro condomínio', () => {
      expect(() =>
        escoparArgs('Condominio', 'findUnique', { where: { id: 'cond-b' } }, A),
      ).toThrow(AcessoEscopadoError);
    });

    it.each(['create', 'createMany', 'upsert'])(
      '%s é exclusivo do PrismaSistema',
      (operacao) => {
        expect(() =>
          escoparArgs('Condominio', operacao, { data: {}, where: {} }, A),
        ).toThrow(AcessoEscopadoError);
      },
    );

    it('não deixa mover usuário de condomínio por escrita aninhada', () => {
      expect(() =>
        escoparArgs(
          'Condominio',
          'update',
          { where: {}, data: { usuarios: { connect: { id: 'u-b' } } } },
          A,
        ),
      ).toThrow(/escrita aninhada/);
    });
  });

  it('modelo sem classificação falha fechado', () => {
    expect(() => escoparArgs('Inexistente', 'findMany', {}, A)).toThrow(
      /sem classificação/,
    );
  });
});

describe('criarPrismaEscopado (sem banco)', () => {
  let sistema: PrismaSistema;
  let escopado: ReturnType<typeof criarPrismaEscopado>;

  beforeAll(() => {
    sistema = new PrismaSistema(
      new AppConfig(
        'test',
        3000,
        {
          host: '127.0.0.1',
          porta: 1,
          usuario: 'u',
          senha: 'p',
          banco: 'b',
          limiteConexoes: 1,
        },
        false,
        undefined,
      ),
    );
    escopado = criarPrismaEscopado(sistema);
  });

  afterAll(async () => {
    await sistema.$disconnect();
  });

  it('sem contexto de condomínio lança antes de consultar', async () => {
    await expect(escopado.usuario.findMany()).rejects.toThrow(
      SemContextoTenantError,
    );
    await expect(escopado.condominio.findFirst()).rejects.toThrow(
      SemContextoTenantError,
    );
  });

  it.each([
    ['$queryRaw', (c: typeof escopado) => c.$queryRaw`SELECT 1`],
    ['$executeRaw', (c: typeof escopado) => c.$executeRaw`SELECT 1`],
    ['$queryRawUnsafe', (c: typeof escopado) => c.$queryRawUnsafe('SELECT 1')],
    [
      '$executeRawUnsafe',
      (c: typeof escopado) => c.$executeRawUnsafe('SELECT 1'),
    ],
  ])('%s é bloqueado mesmo com contexto', async (_, chamar) => {
    await ContextoTenant.executar(A, async () => {
      await expect(chamar(escopado)).rejects.toThrow(AcessoEscopadoError);
    });
  });
});
