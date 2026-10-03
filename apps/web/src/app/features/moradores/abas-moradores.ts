import { StatusUsuario } from '@ocorrencias/contratos';

export type ChaveAba = 'pendentes' | 'ativos' | 'recusados-inativos';

export interface VazioDaAba {
  readonly titulo: string;
  readonly texto?: string;
  readonly acao?: { readonly rotulo: string; readonly rota: string };
}

export interface DefinicaoAba {
  readonly chave: ChaveAba;
  readonly rotulo: string;
  readonly legenda: string;
  readonly status: readonly StatusUsuario[];
  readonly mostraStatus: boolean;
  readonly vazio: VazioDaAba;
}

export const ABA_PADRAO: ChaveAba = 'pendentes';

export const ABAS_MORADORES: readonly DefinicaoAba[] = [
  {
    chave: 'pendentes',
    rotulo: 'Pendentes',
    legenda: 'Cadastros pendentes, mais recentes primeiro',
    status: ['PENDENTE'],
    mostraStatus: false,
    vazio: { titulo: 'Nenhum cadastro esperando aprovação.' },
  },
  {
    chave: 'ativos',
    rotulo: 'Ativos',
    legenda: 'Moradores ativos, mais recentes primeiro',
    status: ['ATIVO'],
    mostraStatus: false,
    vazio: {
      titulo: 'Nenhum morador ativo ainda.',
      texto: 'Compartilhe o link do condomínio.',
      acao: { rotulo: 'Ver link e QR code', rota: '/admin/condominio' },
    },
  },
  {
    chave: 'recusados-inativos',
    rotulo: 'Recusados e inativos',
    legenda: 'Moradores recusados e inativos, mais recentes primeiro',
    status: ['RECUSADO', 'INATIVO'],
    mostraStatus: true,
    vazio: { titulo: 'Nenhum morador recusado ou inativo.' },
  },
];

export function abaPorChave(chave: string | null): DefinicaoAba | undefined {
  return ABAS_MORADORES.find((aba) => aba.chave === chave);
}

export function parametroDaAba(chave: ChaveAba): string | null {
  return chave === ABA_PADRAO ? null : chave;
}
