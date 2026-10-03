import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { AppConfig } from '../config/app-config.js';
import { ErroApi } from '../http/erro-api.js';
import type { PrismaEscopado } from '../prisma/prisma-escopado.js';
import { ContextoTenant } from '../tenancy/contexto-tenant.js';
import { Publico } from './decoradores.js';
import { GuardaAutenticacao } from './guarda-autenticacao.js';
import { assinarJwt, type ClaimsSessao } from './jwt.js';
import { SessaoJwt } from './sessao-jwt.js';
import type { RequisicaoAutenticada } from './usuario-autenticado.js';

const SEGREDO = 'g'.repeat(40);
const CLAIMS: ClaimsSessao = {
  sub: 'usuario-1',
  cid: 'condominio-a',
  papel: 'SINDICO',
  sv: 2,
};

class Rotas {
  @Publico()
  publica(this: void): void {}

  privada(this: void): void {}
}

@Publico()
class RotasPublicas {
  qualquer(this: void): void {}
}

const USUARIO_ATIVO = {
  id: 'usuario-1',
  condominioId: 'condominio-a',
  papel: 'MORADOR',
  status: 'ATIVO',
  versaoSessao: 2,
  condominio: { status: 'ATIVO' },
};

function preparar(usuario: unknown = USUARIO_ATIVO) {
  const config = new AppConfig(
    'test',
    3000,
    {
      host: 'h',
      porta: 3306,
      usuario: 'u',
      senha: 'p',
      banco: 'b',
      limiteConexoes: 1,
    },
    false,
    SEGREDO,
  );
  const findUnique = vi.fn().mockResolvedValue(usuario);
  const prisma = { usuario: { findUnique } } as unknown as PrismaEscopado;
  const guarda = new GuardaAutenticacao(
    new Reflector(),
    new SessaoJwt(config),
    prisma,
  );
  return { guarda, findUnique };
}

function executar(
  guarda: GuardaAutenticacao,
  opcoes: {
    cookie?: string;
    handler?: () => void;
    classe?: new () => unknown;
  } = {},
) {
  const requisicao = {
    headers: opcoes.cookie ? { cookie: opcoes.cookie } : {},
  } as RequisicaoAutenticada;
  const resposta = { clearCookie: vi.fn() };
  const contexto = {
    switchToHttp: () => ({
      getRequest: () => requisicao,
      getResponse: () => resposta as unknown as Response,
    }),
    getHandler: () => opcoes.handler ?? Rotas.prototype.privada,
    getClass: () => opcoes.classe ?? Rotas,
  } as unknown as ExecutionContext;

  return ContextoTenant.iniciarRequisicao(async () => {
    try {
      const liberado = await guarda.canActivate(contexto);
      return { liberado, requisicao, resposta, cid: ContextoTenant.obter() };
    } catch (erro) {
      return { erro, requisicao, resposta, cid: ContextoTenant.obter() };
    }
  });
}

function cookieCom(claims: ClaimsSessao = CLAIMS, segredo = SEGREDO): string {
  return `sessao=${assinarJwt(claims, segredo, 3600)}`;
}

function codigoDe(erro: unknown): string | undefined {
  return erro instanceof ErroApi
    ? (erro.getResponse() as { code: string }).code
    : undefined;
}

describe('GuardaAutenticacao', () => {
  it('libera rota @Publico() no método ou na classe sem ler cookie nem banco', async () => {
    const { guarda, findUnique } = preparar();

    await expect(
      executar(guarda, { handler: Rotas.prototype.publica }),
    ).resolves.toMatchObject({ liberado: true, cid: undefined });
    await expect(
      executar(guarda, {
        handler: RotasPublicas.prototype.qualquer,
        classe: RotasPublicas,
      }),
    ).resolves.toMatchObject({ liberado: true });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('sem cookie responde 401 sem consultar o banco nem apagar cookie', async () => {
    const { guarda, findUnique } = preparar();
    const resultado = await executar(guarda);

    expect(codigoDe(resultado.erro)).toBe('NAO_AUTENTICADO');
    expect((resultado.erro as ErroApi).getStatus()).toBe(401);
    expect(resultado.resposta.clearCookie).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('token de outro segredo responde 401 e apaga o cookie', async () => {
    const { guarda, findUnique } = preparar();
    const resultado = await executar(guarda, {
      cookie: cookieCom(CLAIMS, 'z'.repeat(40)),
    });

    expect(codigoDe(resultado.erro)).toBe('NAO_AUTENTICADO');
    expect(resultado.resposta.clearCookie).toHaveBeenCalled();
    expect(resultado.cid).toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('vincula o cid do token antes de buscar o usuário e expõe o usuário com o papel do banco', async () => {
    const { guarda, findUnique } = preparar();
    let cidNaBusca: string | undefined;
    findUnique.mockImplementation(() => {
      cidNaBusca = ContextoTenant.obter();
      return Promise.resolve(USUARIO_ATIVO);
    });

    const resultado = await executar(guarda, { cookie: cookieCom() });

    expect(resultado.liberado).toBe(true);
    expect(cidNaBusca).toBe('condominio-a');
    expect(resultado.cid).toBe('condominio-a');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'usuario-1' } }),
    );
    expect(resultado.requisicao.usuario).toEqual({
      id: 'usuario-1',
      condominioId: 'condominio-a',
      papel: 'MORADOR',
    });
  });

  it.each([
    ['usuário inexistente no condomínio do token', null],
    ['usuário PENDENTE', { ...USUARIO_ATIVO, status: 'PENDENTE' }],
    ['usuário RECUSADO', { ...USUARIO_ATIVO, status: 'RECUSADO' }],
    ['usuário INATIVO', { ...USUARIO_ATIVO, status: 'INATIVO' }],
    ['versao_sessao incrementada', { ...USUARIO_ATIVO, versaoSessao: 3 }],
    ['versao_sessao menor', { ...USUARIO_ATIVO, versaoSessao: 1 }],
    [
      'condomínio inativo',
      { ...USUARIO_ATIVO, condominio: { status: 'INATIVO' } },
    ],
  ])('%s: 401, apaga o cookie e não expõe usuário', async (_, usuario) => {
    const { guarda } = preparar(usuario);
    const resultado = await executar(guarda, { cookie: cookieCom() });

    expect(codigoDe(resultado.erro)).toBe('NAO_AUTENTICADO');
    expect(resultado.resposta.clearCookie).toHaveBeenCalled();
    expect(resultado.requisicao.usuario).toBeUndefined();
  });
});
