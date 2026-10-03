import {
  Controller,
  Get,
  Headers,
  type INestApplication,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { Publico } from '../src/core/auth/decoradores.js';
import {
  AcessoEscopadoError,
  InjetarPrismaEscopado,
  PRISMA_ESCOPADO,
  type PrismaEscopado,
} from '../src/core/prisma/prisma-escopado.js';
import { PrismaSistema } from '../src/core/prisma/prisma-sistema.js';
import {
  ContextoTenant,
  SemContextoTenantError,
} from '../src/core/tenancy/contexto-tenant.js';
import { CondominiosPublicoService } from '../src/features/condominios/publico/condominios-publico.service.js';
import { limparBanco } from './banco.js';
import { criarApp } from './criar-app.js';

// Público de propósito: vincula o condomínio pelo header para testar o contexto sem depender do login.
@Publico()
@Controller('teste-tenant')
class TenantTesteController {
  constructor(
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  @Get('usuarios')
  async listar(@Headers('x-condominio-teste') condominioId?: string) {
    if (condominioId) {
      ContextoTenant.vincular(condominioId);
    }
    const usuarios = await this.prisma.usuario.findMany({
      select: { nome: true },
      orderBy: { nome: 'asc' },
    });
    return usuarios.map((u) => u.nome);
  }
}

interface Tenant {
  id: string;
  slug: string;
  usuarioId: string;
}

describe('isolamento entre condomínios (e2e)', () => {
  let app: INestApplication<App>;
  let sistema: PrismaSistema;
  let escopado: PrismaEscopado;
  let a: Tenant;
  let b: Tenant;

  async function criarTenant(slug: string, telefone: string): Promise<Tenant> {
    const condominio = await sistema.condominio.create({
      data: { nome: `Condomínio ${slug}`, slug },
    });
    const usuario = await sistema.usuario.create({
      data: {
        condominioId: condominio.id,
        nome: `Síndico ${slug}`,
        telefone,
        senhaHash: 'x',
        papel: 'SINDICO',
        status: 'ATIVO',
        slotAdmin: 1,
      },
    });
    return { id: condominio.id, slug, usuarioId: usuario.id };
  }

  const emA = <T>(fn: () => Promise<T>) => ContextoTenant.executar(a.id, fn);

  beforeAll(async () => {
    app = await criarApp({ controllers: [TenantTesteController] });
    sistema = app.get(PrismaSistema);
    escopado = app.get<PrismaEscopado>(PRISMA_ESCOPADO);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
    // O mesmo telefone nos dois condomínios: identidade escopada (ADR-002).
    a = await criarTenant('cond-a', '+5511911111111');
    b = await criarTenant('cond-b', '+5511911111111');
  });

  it('sem contexto, toda operação em modelo de condomínio lança', async () => {
    await expect(escopado.usuario.findMany()).rejects.toThrow(
      SemContextoTenantError,
    );
    await expect(escopado.condominio.findMany()).rejects.toThrow(
      SemContextoTenantError,
    );
    await expect(
      escopado.usuario.updateMany({ data: { nome: 'x' } }),
    ).rejects.toThrow(SemContextoTenantError);
  });

  it('leituras só enxergam o condomínio do contexto', async () => {
    await emA(async () => {
      const usuarios = await escopado.usuario.findMany();
      expect(usuarios.map((u) => u.id)).toEqual([a.usuarioId]);
      await expect(
        escopado.usuario.findUnique({ where: { id: b.usuarioId } }),
      ).resolves.toBeNull();
      await expect(
        escopado.usuario.findUnique({
          where: {
            condominioId_telefone: {
              condominioId: b.id,
              telefone: '+5511911111111',
            },
          },
        }),
      ).resolves.toBeNull();
      await expect(escopado.usuario.count()).resolves.toBe(1);
      await expect(
        escopado.condominio.findUnique({ where: { slug: b.slug } }),
      ).resolves.toBeNull();
      const [condominio] = await escopado.condominio.findMany({
        include: { usuarios: true },
      });
      expect(condominio.id).toBe(a.id);
      expect(condominio.usuarios.map((u) => u.id)).toEqual([a.usuarioId]);
    });
  });

  it('não atualiza nem apaga dado de outro condomínio', async () => {
    await emA(async () => {
      await expect(
        escopado.usuario.update({
          where: { id: b.usuarioId },
          data: { nome: 'invadido' },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
      await expect(
        escopado.usuario.updateMany({ data: { nome: 'renomeado' } }),
      ).resolves.toEqual({ count: 1 });
      await expect(
        escopado.usuario.delete({ where: { id: b.usuarioId } }),
      ).rejects.toMatchObject({ code: 'P2025' });
      await expect(
        escopado.usuario.deleteMany({ where: { id: b.usuarioId } }),
      ).resolves.toEqual({ count: 0 });
      await expect(
        escopado.condominio.update({
          where: { slug: b.slug },
          data: { nome: 'invadido' },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
      await expect(
        escopado.condominio.update({
          where: { id: b.id },
          data: { nome: 'invadido' },
        }),
      ).rejects.toThrow(AcessoEscopadoError);
    });

    const usuarioB = await sistema.usuario.findUniqueOrThrow({
      where: { id: b.usuarioId },
    });
    const condominioB = await sistema.condominio.findUniqueOrThrow({
      where: { id: b.id },
    });
    expect(usuarioB.nome).toBe('Síndico cond-b');
    expect(condominioB.nome).toBe('Condomínio cond-b');
    await expect(
      sistema.usuario.findUniqueOrThrow({ where: { id: a.usuarioId } }),
    ).resolves.toMatchObject({ nome: 'renomeado' });
  });

  it('create grava no condomínio do contexto', async () => {
    const criado = await emA(() =>
      escopado.usuario.create({
        data: {
          nome: 'Morador',
          telefone: '+5511922222222',
          senhaHash: 'x',
          papel: 'MORADOR',
          status: 'PENDENTE',
        } as never,
      }),
    );

    expect(criado.condominioId).toBe(a.id);
  });

  it('a FK composta impede ligar auditoria de A a usuário de B', async () => {
    await expect(
      emA(() =>
        escopado.auditoriaAdmin.create({
          data: {
            condominioId: ContextoTenant.exigir(),
            atorId: b.usuarioId,
            acao: 'SENHA_REDEFINIDA',
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      emA(() =>
        escopado.auditoriaAdmin.create({
          data: {
            condominioId: ContextoTenant.exigir(),
            atorId: a.usuarioId,
            alvoId: b.usuarioId,
            acao: 'SENHA_REDEFINIDA',
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('o banco limita os admins a dois slots por condomínio', async () => {
    const admin = (slotAdmin: number, telefone: string) =>
      emA(() =>
        escopado.usuario.create({
          data: {
            condominioId: ContextoTenant.exigir(),
            nome: 'Subsíndico',
            telefone,
            senhaHash: 'x',
            papel: 'SUBSINDICO',
            status: 'ATIVO',
            slotAdmin,
          },
        }),
      );

    await expect(admin(1, '+5511933333333')).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(admin(3, '+5511944444444')).rejects.toThrow();
    await expect(admin(2, '+5511955555555')).resolves.toMatchObject({
      slotAdmin: 2,
    });
  });

  it('SQL cru é bloqueado', async () => {
    await emA(async () => {
      await expect(escopado.$queryRaw`SELECT 1`).rejects.toThrow(
        AcessoEscopadoError,
      );
      await expect(
        escopado.$executeRawUnsafe('DELETE FROM usuario'),
      ).rejects.toThrow(AcessoEscopadoError);
    });
    await expect(sistema.usuario.count()).resolves.toBe(2);
  });

  it('transação interativa respeita o filtro e desfaz tudo no erro', async () => {
    await emA(() =>
      escopado.$transaction(async (tx) => {
        await expect(tx.usuario.findMany()).resolves.toHaveLength(1);
        await expect(tx.$queryRaw`SELECT 1`).rejects.toThrow(
          AcessoEscopadoError,
        );
      }),
    );

    await expect(
      emA(() =>
        escopado.$transaction(async (tx) => {
          await tx.usuario.updateMany({
            data: { nome: 'dentro da transação' },
          });
          await tx.usuario.update({
            where: { id: b.usuarioId },
            data: { nome: 'invadido' },
          });
        }),
      ),
    ).rejects.toMatchObject({ code: 'P2025' });

    const nomes = (await sistema.usuario.findMany()).map((u) => u.nome).sort();
    expect(nomes).toEqual(['Síndico cond-a', 'Síndico cond-b']);
  });

  it('rota pública roda um bloco no condomínio resolvido pelo slug', async () => {
    const servico = app.get(CondominiosPublicoService);

    const ids = await servico.executarNoCondominio(b.slug, async () =>
      (await escopado.usuario.findMany()).map((u) => u.id),
    );

    expect(ids).toEqual([b.usuarioId]);
    expect(ContextoTenant.obter()).toBeUndefined();
  });

  describe('pela requisição HTTP', () => {
    it('o condomínio vinculado pelo guard vale até o fim da requisição', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/teste-tenant/usuarios')
        .set('x-condominio-teste', b.id)
        .expect(200);

      expect(resposta.body).toEqual(['Síndico cond-b']);
    });

    it('sem condomínio vinculado, falha fechado com 500 sem detalhe', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/teste-tenant/usuarios')
        .expect(500);

      expect(resposta.body.code).toBe('ERRO_INTERNO');
    });

    it('requisições simultâneas não trocam de condomínio', async () => {
      const respostas = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          request(app.getHttpServer())
            .get('/api/v1/teste-tenant/usuarios')
            .set('x-condominio-teste', i % 2 === 0 ? a.id : b.id),
        ),
      );

      respostas.forEach((resposta, i) => {
        expect(resposta.body).toEqual([
          i % 2 === 0 ? 'Síndico cond-a' : 'Síndico cond-b',
        ]);
      });
    });
  });
});
