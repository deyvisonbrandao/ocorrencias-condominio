import type { CondominioPublico } from './condominio.js';
import type { Papel, StatusUsuario } from './usuario.js';

export const CodigoErroSessao = {
  CREDENCIAIS_INVALIDAS: 'CREDENCIAIS_INVALIDAS',
  CADASTRO_PENDENTE: 'CADASTRO_PENDENTE',
  CADASTRO_RECUSADO: 'CADASTRO_RECUSADO',
  ACESSO_INATIVO: 'ACESSO_INATIVO',
  NAO_AUTENTICADO: 'NAO_AUTENTICADO',
  ACESSO_NEGADO: 'ACESSO_NEGADO',
  ORIGEM_NAO_PERMITIDA: 'ORIGEM_NAO_PERMITIDA',
} as const;
export type CodigoErroSessao =
  (typeof CodigoErroSessao)[keyof typeof CodigoErroSessao];

export interface LoginRequisicao {
  slug: string;
  telefone: string;
  senha: string;
}

export interface UsuarioSessao {
  nome: string;
  telefone: string;
  papel: Papel;
  status: StatusUsuario;
  senhaTemporaria: boolean;
  condominio: CondominioPublico;
}

export interface PainelAdmin {
  condominio: CondominioPublico;
}
