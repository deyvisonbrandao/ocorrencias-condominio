import { createHmac } from 'node:crypto';
import { assinarJwt, type ClaimsSessao, verificarJwt } from './jwt.js';

const SEGREDO = 's'.repeat(48);
const CLAIMS: ClaimsSessao = {
  sub: '0199a5c2-7f3e-7a51-9b0e-3c2d1e4f5a6b',
  cid: '0199a5c2-7f3e-7a51-9b0e-000000000001',
  papel: 'SINDICO',
  sv: 3,
};
const AGORA = new Date('2026-10-02T12:00:00Z');
const UMA_HORA = 3600;

function base64url(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}

function assinarManual(cabecalho: unknown, corpo: unknown): string {
  const conteudo = `${base64url(cabecalho)}.${base64url(corpo)}`;
  const assinatura = createHmac('sha256', SEGREDO)
    .update(conteudo)
    .digest('base64url');
  return `${conteudo}.${assinatura}`;
}

describe('JWT de sessão (HS256)', () => {
  it('assina e verifica as claims, com iat e exp', () => {
    const token = assinarJwt(CLAIMS, SEGREDO, UMA_HORA, AGORA);
    const iat = AGORA.getTime() / 1000;

    expect(verificarJwt(token, SEGREDO, AGORA)).toEqual({
      ...CLAIMS,
      iat,
      exp: iat + UMA_HORA,
    });
  });

  it('recusa token expirado, inclusive no segundo exato do exp', () => {
    const token = assinarJwt(CLAIMS, SEGREDO, UMA_HORA, AGORA);
    const noExp = new Date(AGORA.getTime() + UMA_HORA * 1000);

    expect(verificarJwt(token, SEGREDO, noExp)).toBeNull();
    expect(
      verificarJwt(token, SEGREDO, new Date(noExp.getTime() - 1000)),
    ).not.toBeNull();
  });

  it('recusa assinatura de outro segredo', () => {
    const token = assinarJwt(CLAIMS, 'o'.repeat(48), UMA_HORA, AGORA);
    expect(verificarJwt(token, SEGREDO, AGORA)).toBeNull();
  });

  it('recusa corpo adulterado', () => {
    const [cabecalho, , assinatura] = assinarJwt(
      CLAIMS,
      SEGREDO,
      UMA_HORA,
      AGORA,
    ).split('.');
    const corpo = base64url({
      ...CLAIMS,
      cid: 'outro',
      iat: 1,
      exp: 9_999_999_999,
    });

    expect(
      verificarJwt(`${cabecalho}.${corpo}.${assinatura}`, SEGREDO, AGORA),
    ).toBeNull();
  });

  it('recusa assinatura com caractere a mais ou trocado', () => {
    const token = assinarJwt(CLAIMS, SEGREDO, UMA_HORA, AGORA);
    expect(verificarJwt(`${token}A`, SEGREDO, AGORA)).toBeNull();
    expect(verificarJwt(`${token.slice(0, -1)}!`, SEGREDO, AGORA)).toBeNull();
  });

  it.each([
    ['alg none', { alg: 'none', typ: 'JWT' }],
    ['HS512', { alg: 'HS512', typ: 'JWT' }],
    ['cabeçalho com campo extra', { alg: 'HS256', typ: 'JWT', kid: '1' }],
  ])('recusa %s, mesmo com HMAC válido', (_, cabecalho) => {
    const exp = AGORA.getTime() / 1000 + UMA_HORA;
    expect(
      verificarJwt(
        assinarManual(cabecalho, { ...CLAIMS, iat: 1, exp }),
        SEGREDO,
        AGORA,
      ),
    ).toBeNull();
  });

  it.each([
    ['sem sub', { sub: undefined }],
    ['cid vazio', { cid: '' }],
    ['papel desconhecido', { papel: 'ADMIN' }],
    ['sv zero', { sv: 0 }],
    ['sv texto', { sv: '1' }],
    ['sem exp', { exp: undefined }],
  ])('recusa claims inválidas: %s', (_, ajuste) => {
    const exp = AGORA.getTime() / 1000 + UMA_HORA;
    const token = assinarManual(
      { alg: 'HS256', typ: 'JWT' },
      { ...CLAIMS, iat: 1, exp, ...ajuste },
    );
    expect(verificarJwt(token, SEGREDO, AGORA)).toBeNull();
  });

  it.each([[''], ['a.b'], ['a.b.c.d'], ['x'.repeat(3000)]])(
    'recusa formato inválido (%#)',
    (token) => {
      expect(verificarJwt(token, SEGREDO, AGORA)).toBeNull();
    },
  );
});
