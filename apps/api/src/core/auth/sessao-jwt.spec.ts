import type { Request, Response } from 'express';
import { AppConfig, type Ambiente } from '../config/app-config.js';
import {
  lerCookie,
  SessaoJwt,
  VALIDADE_SESSAO_SEGUNDOS,
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

describe('lerCookie', () => {
  it.each([
    [undefined, undefined],
    ['', undefined],
    ['outro=1', undefined],
    ['sessao=abc', 'abc'],
    ['a=1; sessao=abc; b=2', 'abc'],
    ['minhasessao=x; sessao=ok', 'ok'],
    ['sessao=a%2Eb', 'a.b'],
    ['sessao=%E0%A4%A', undefined],
  ])('%s -> %s', (cabecalho, esperado) => {
    expect(lerCookie(cabecalho, 'sessao')).toBe(esperado);
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

  it('marca o cookie como Secure em produção, inclusive ao apagar', () => {
    const resposta = respostaFalsa();
    const sessao = new SessaoJwt(config('production'));
    sessao.abrir(resposta, CLAIMS);
    sessao.encerrar(resposta);

    expect(resposta.cookie.mock.calls[0][2]).toMatchObject({ secure: true });
    expect(resposta.clearCookie).toHaveBeenCalledWith('sessao', {
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
});
