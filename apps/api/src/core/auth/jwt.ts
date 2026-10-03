import { createHmac, timingSafeEqual } from 'node:crypto';
import { Papel } from '@ocorrencias/contratos';

export interface ClaimsSessao {
  sub: string;
  cid: string;
  papel: Papel;
  sv: number;
}

export interface TokenVerificado extends ClaimsSessao {
  iat: number;
  exp: number;
}

const CABECALHO = codificar(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const TAMANHO_MAXIMO_TOKEN = 2048;
const PAPEIS: ReadonlySet<string> = new Set(Object.values(Papel));

function codificar(texto: string): string {
  return Buffer.from(texto, 'utf8').toString('base64url');
}

function assinatura(segredo: string, conteudo: string): Buffer {
  return createHmac('sha256', segredo).update(conteudo).digest();
}

function lerJson(parte: string): unknown {
  try {
    return JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

function textoPreenchido(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= 64;
}

function inteiroPositivo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
}

function claimsValidas(valor: unknown): valor is TokenVerificado {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Record<string, unknown>;
  return (
    textoPreenchido(c.sub) &&
    textoPreenchido(c.cid) &&
    typeof c.papel === 'string' &&
    PAPEIS.has(c.papel) &&
    inteiroPositivo(c.sv) &&
    inteiroPositivo(c.iat) &&
    inteiroPositivo(c.exp)
  );
}

export function assinarJwt(
  claims: ClaimsSessao,
  segredo: string,
  validadeSegundos: number,
  agora: Date = new Date(),
): string {
  const iat = Math.floor(agora.getTime() / 1000);
  const corpo = codificar(
    JSON.stringify({
      sub: claims.sub,
      cid: claims.cid,
      papel: claims.papel,
      sv: claims.sv,
      iat,
      exp: iat + validadeSegundos,
    }),
  );
  const conteudo = `${CABECALHO}.${corpo}`;
  return `${conteudo}.${assinatura(segredo, conteudo).toString('base64url')}`;
}

// Só aceita o cabeçalho exato que a API emite: fecha a porta para alg "none" e troca de algoritmo.
export function verificarJwt(
  token: string,
  segredo: string,
  agora: Date = new Date(),
): TokenVerificado | null {
  if (token.length > TAMANHO_MAXIMO_TOKEN) return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const [cabecalho, corpo, recebida] = partes;
  if (cabecalho !== CABECALHO) return null;

  // Compara o texto e não os bytes: o decodificador base64url do Node ignora caractere inválido e bits sobrando.
  const esperada = Buffer.from(
    assinatura(segredo, `${cabecalho}.${corpo}`).toString('base64url'),
  );
  const informada = Buffer.from(recebida);
  if (
    informada.length !== esperada.length ||
    !timingSafeEqual(informada, esperada)
  ) {
    return null;
  }

  const claims = lerJson(corpo);
  if (!claimsValidas(claims)) return null;
  if (claims.exp <= Math.floor(agora.getTime() / 1000)) return null;
  return claims;
}
