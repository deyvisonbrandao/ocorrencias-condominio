import { StatusUsuario } from './usuario.js';

export const REGRAS_MOTIVO_RECUSA = { max: 500 } as const;
export const REGRAS_BUSCA_MORADORES = { max: 100, termos: 5 } as const;
export const LIMITE_PAGINA_MORADORES = { padrao: 50, max: 100 } as const;

export const AcaoMorador = {
  APROVAR: 'aprovar',
  RECUSAR: 'recusar',
  INATIVAR: 'inativar',
  REATIVAR: 'reativar',
} as const;
export type AcaoMorador = (typeof AcaoMorador)[keyof typeof AcaoMorador];

export const TRANSICOES_MORADOR: Readonly<
  Record<AcaoMorador, { de: StatusUsuario; para: StatusUsuario }>
> = {
  aprovar: { de: StatusUsuario.PENDENTE, para: StatusUsuario.ATIVO },
  recusar: { de: StatusUsuario.PENDENTE, para: StatusUsuario.RECUSADO },
  inativar: { de: StatusUsuario.ATIVO, para: StatusUsuario.INATIVO },
  reativar: { de: StatusUsuario.INATIVO, para: StatusUsuario.ATIVO },
};

export function acoesDisponiveisMorador(status: StatusUsuario): AcaoMorador[] {
  return (Object.keys(TRANSICOES_MORADOR) as AcaoMorador[]).filter(
    (acao) => TRANSICOES_MORADOR[acao].de === status,
  );
}

export const CodigoErroMorador = {
  MORADOR_NAO_ENCONTRADO: 'MORADOR_NAO_ENCONTRADO',
  TRANSICAO_MORADOR_INVALIDA: 'TRANSICAO_MORADOR_INVALIDA',
  CURSOR_INVALIDO: 'CURSOR_INVALIDO',
} as const;
export type CodigoErroMorador =
  (typeof CodigoErroMorador)[keyof typeof CodigoErroMorador];

export interface MoradorAdmin {
  id: string;
  nome: string;
  telefone: string;
  bloco: string | null;
  apto: string | null;
  status: StatusUsuario;
  criadoEm: string;
  motivoRecusa: string | null;
}

export interface PaginaMoradores {
  itens: MoradorAdmin[];
  proximoCursor: string | null;
}

export interface ListarMoradoresConsulta {
  status?: StatusUsuario[];
  q?: string;
  cursor?: string;
  limite?: number;
}

export interface ContagemMoradores {
  pendentes: number;
  ativos: number;
  recusados: number;
  inativos: number;
}

export interface RecusarMoradorRequisicao {
  motivo: string;
}

export interface TransicaoMoradorInvalidaDetalhes {
  statusAtual: StatusUsuario;
}
