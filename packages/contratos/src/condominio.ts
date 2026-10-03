export const REGRAS_SLUG = {
  min: 3,
  max: 40,
  padrao: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
} as const;

export function slugValido(slug: string): boolean {
  return (
    slug.length >= REGRAS_SLUG.min &&
    slug.length <= REGRAS_SLUG.max &&
    REGRAS_SLUG.padrao.test(slug)
  );
}

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
  EDICAO_CONCORRENTE: 'EDICAO_CONCORRENTE',
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

export const REGRAS_CIDADE = { max: 80 } as const;

export const Uf = {
  AC: 'AC',
  AL: 'AL',
  AM: 'AM',
  AP: 'AP',
  BA: 'BA',
  CE: 'CE',
  DF: 'DF',
  ES: 'ES',
  GO: 'GO',
  MA: 'MA',
  MG: 'MG',
  MS: 'MS',
  MT: 'MT',
  PA: 'PA',
  PB: 'PB',
  PE: 'PE',
  PI: 'PI',
  PR: 'PR',
  RJ: 'RJ',
  RN: 'RN',
  RO: 'RO',
  RR: 'RR',
  RS: 'RS',
  SC: 'SC',
  SE: 'SE',
  SP: 'SP',
  TO: 'TO',
} as const;
export type Uf = (typeof Uf)[keyof typeof Uf];

export const NOMES_UF: Readonly<Record<Uf, string>> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
};

export const UFS: readonly Uf[] = Object.values(Uf);

export function ufValida(valor: unknown): valor is Uf {
  return typeof valor === 'string' && Object.hasOwn(Uf, valor);
}

export interface CondominioAdmin {
  nome: string;
  slug: string;
  cidade: string | null;
  uf: Uf | null;
}

export interface AtualizarCondominioRequisicao {
  nome: string;
  cidade: string;
  uf: Uf;
}
