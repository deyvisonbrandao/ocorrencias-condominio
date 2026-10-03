import type { Request, Response } from 'express';
import { AppConfig, type Ambiente } from '../config/app-config.js';
import {
  nomeCookieSessao,
  SessaoJwt,
  VALIDADE_SESSAO_SEGUNDOS,
  valoresDoCookie,
} from './sessao-jwt.js';

const SEGREDO = 'k'.repeat(40);

function config(ambiente: Ambiente): AppConfig {
  return new AppConfig(
    ambiente,
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
}

function respostaFalsa() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
}

const CLAIMS = { sub: 'u1', cid: 'c1', papel: 'MORADOR', sv: 1 } as const;

describe('valoresDoCookie', () => {
  it.each([
    [undefined, []],
    ['', []],
    ['outro=1', []],
    ['sessao=abc', ['abc']],
    ['a=1; sessao=abc; b=2', ['abc']],
    ['minhasessao=x; sessao=ok', ['ok']],
    ['sessao=a; sessao=b', ['a', 'b']],
  ])('%s -> %j', (cabecalho, esperado) => {
    expect(valoresDoCookie(cabecalho, 'sessao')).toEqual(esperado);
  });
});

describe('SessaoJwt', () => {
  it('grava cookie httpOnly, Lax, Path=/ e com a validade do token', () => {
    const resposta = respostaFalsa();
    new SessaoJwt(config('development')).abrir(resposta, CLAIMS);

    expect(resposta.cookie).toHaveBeenCalledWith(
      'sessao',
      expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: VALIDADE_SESSAO_SEGUNDOS * 1000,
      },
    );
  });

  it('usa __Host-sessao só em produção', () => {
    expect(nomeCookieSessao(true)).toBe('__Host-sessao');
    expect(nomeCookieSessao(false)).toBe('sessao');
  });

  it('em produção grava __Host-sessao com Secure e Path=/, sem Domain, inclusive ao apagar', () => {
    const resposta = respostaFalsa();
    const sessao = new SessaoJwt(config('production'));
    sessao.abrir(resposta, CLAIMS);
    sessao.encerrar(resposta);

    expect(resposta.cookie.mock.calls[0][0]).toBe('__Host-sessao');
    expect(resposta.cookie.mock.calls[0][2]).toMatchObject({
      secure: true,
      path: '/',
    });
    expect(resposta.cookie.mock.calls[0][2]).not.toHaveProperty('domain');
    expect(resposta.clearCookie).toHaveBeenCalledWith('__Host-sessao', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });
  });

  it('lê de volta o token que gravou', () => {
    const resposta = respostaFalsa();
    const sessao = new SessaoJwt(config('test'));
    sessao.abrir(resposta, CLAIMS);
    const token = resposta.cookie.mock.calls[0][1] as string;

    const requisicao = { headers: { cookie: `sessao=${token}` } } as Request;
    expect(sessao.presente(requisicao)).toBe(true);
    expect(sessao.ler(requisicao)).toMatchObject(CLAIMS);
    expect(
      sessao.ler({ headers: { cookie: 'sessao=lixo' } } as Request),
    ).toBeNull();
    expect(sessao.presente({ headers: {} } as Request)).toBe(false);
  });

  it('recusa dois cookies de sessão, mesmo com um deles válido', () => {
    const resposta = respostaFalsa();
    const sessao = new SessaoJwt(config('test'));
    sessao.abrir(resposta, CLAIMS);
    const token = resposta.cookie.mock.calls[0][1] as string;

    for (const cookie of [
      `sessao=${token}; sessao=lixo`,
      `sessao=lixo; sessao=${token}`,
      `sessao=${token}; sessao=${token}`,
    ]) {
      const requisicao = { headers: { cookie } } as Request;
      expect(sessao.presente(requisicao)).toBe(true);
      expect(sessao.ler(requisicao)).toBeNull();
    }
  });

  it('em produção ignora o cookie sem prefixo e lê só o __Host-sessao', () => {
    const resposta = respostaFalsa();
    const sessao = new SessaoJwt(config('production'));
    sessao.abrir(resposta, CLAIMS);
    const token = resposta.cookie.mock.calls[0][1] as string;

    expect(
      sessao.ler({ headers: { cookie: `sessao=${token}` } } as Request),
    ).toBeNull();
    expect(
      sessao.ler({
        headers: { cookie: `sessao=lixo; __Host-sessao=${token}` },
      } as Request),
    ).toMatchObject(CLAIMS);
  });

  it('valor com codificação inválida é recusado', () => {
    const sessao = new SessaoJwt(config('test'));
    expect(
      sessao.ler({ headers: { cookie: 'sessao=%E0%A4%A' } } as Request),
    ).toBeNull();
  });
});
