export const REGRAS_SLUG = {
  min: 3,
  max: 40,
  padrao: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
} as const;

export const REGRAS_SENHA = {
  min: 8,
  max: 128,
} as const;

export const REGRAS_NOME_CONDOMINIO = { max: 120 } as const;
export const REGRAS_NOME_PESSOA = { max: 100 } as const;
export const REGRAS_EMAIL = { max: 254 } as const;

export const CodigoErroCondominio = {
  SLUG_EM_USO: 'SLUG_EM_USO',
  CONDOMINIO_NAO_ENCONTRADO: 'CONDOMINIO_NAO_ENCONTRADO',
} as const;
export type CodigoErroCondominio =
  (typeof CodigoErroCondominio)[keyof typeof CodigoErroCondominio];

export interface SindicoNovo {
  nome: string;
  telefone: string;
  email?: string;
  senha: string;
}

export interface CadastrarCondominioRequisicao {
  nome: string;
  slug: string;
  sindico: SindicoNovo;
}

export interface CondominioCriado {
  id: string;
  nome: string;
  slug: string;
}

export interface CondominioPublico {
  nome: string;
  slug: string;
}
