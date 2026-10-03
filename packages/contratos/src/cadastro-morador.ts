import type { CondominioPublico } from './condominio.js';
import type { StatusUsuario } from './usuario.js';

export const REGRAS_BLOCO = { max: 20 } as const;
export const REGRAS_APTO = { max: 10 } as const;

const ESPACOS = /\s+/gu;
// O "nº" opcional exige ponto, espaço ou dígito depois, para "Norte" não perder o "No".
const PREFIXO_BLOCO =
  /^(?:(?:bloco|bl)(?:\s*[.:ºª°-]\s*|\s+|(?=\d)))?(?:n\.?[ºo°](?:\.|\s|(?=\d))\s*)?/iu;
const PREFIXO_APTO =
  /^(?:(?:apartamento|apto|apt|ap)(?:\s*[.:ºª°-]\s*|\s+|(?=\d)))?(?:n\.?[ºo°](?:\.|\s|(?=\d))\s*)?/iu;

// A UI exibe "Bloco {bloco}, apto {apto}": o prefixo digitado pelo morador sai para não virar "Bloco Bloco B".
function normalizarUnidade(entrada: string, prefixo: RegExp): string {
  const texto = entrada.normalize('NFC').replace(ESPACOS, ' ').trim();
  const semPrefixo = texto.replace(prefixo, '').trim();
  return (semPrefixo === '' ? texto : semPrefixo).toLocaleUpperCase('pt-BR');
}

export function normalizarBloco(entrada: string): string {
  return normalizarUnidade(entrada, PREFIXO_BLOCO);
}

export function normalizarApto(entrada: string): string {
  return normalizarUnidade(entrada, PREFIXO_APTO);
}

export const CodigoErroCadastroMorador = {
  TELEFONE_EM_USO: 'TELEFONE_EM_USO',
} as const;
export type CodigoErroCadastroMorador =
  (typeof CodigoErroCadastroMorador)[keyof typeof CodigoErroCadastroMorador];

export interface CadastrarMoradorRequisicao {
  nome: string;
  telefone: string;
  bloco: string;
  apto: string;
  email?: string;
  senha: string;
}

export interface MoradorCadastrado {
  nome: string;
  status: Extract<StatusUsuario, 'PENDENTE'>;
  condominio: CondominioPublico;
}
