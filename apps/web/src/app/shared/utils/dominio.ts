import {
  OrigemOcorrencia,
  Papel,
  StatusOcorrencia,
  StatusUsuario,
  TipoOcorrencia,
  Urgencia,
} from '@ocorrencias/contratos';
import { NomeIcone } from '../components/icone/icones';

export interface ApresentacaoStatus {
  readonly rotulo: string;
  readonly classes: string;
  readonly classePonto: string;
}

export interface ApresentacaoTipo {
  readonly rotulo: string;
  readonly rotuloCurto: string;
  readonly icone: NomeIcone;
}

export type NivelUrgencia = 1 | 2 | 3 | 4;

export interface ApresentacaoUrgencia {
  readonly rotulo: string;
  readonly classes: string;
  readonly nivel: NivelUrgencia;
}

export const STATUS_OCORRENCIA: Readonly<Record<StatusOcorrencia, ApresentacaoStatus>> = {
  ABERTA: {
    rotulo: 'Aberta',
    classes: 'bg-status-aberta-fundo text-status-aberta-texto',
    classePonto: 'bg-status-aberta-ponto',
  },
  EM_ANDAMENTO: {
    rotulo: 'Em andamento',
    classes: 'bg-status-andamento-fundo text-status-andamento-texto',
    classePonto: 'bg-status-andamento-ponto',
  },
  RESOLVIDA: {
    rotulo: 'Resolvida',
    classes: 'bg-status-resolvida-fundo text-status-resolvida-texto',
    classePonto: 'bg-status-resolvida-ponto',
  },
  ARQUIVADA: {
    rotulo: 'Arquivada',
    classes: 'bg-status-arquivada-fundo text-status-arquivada-texto',
    classePonto: 'bg-status-arquivada-ponto',
  },
  DUPLICADA: {
    rotulo: 'Duplicada',
    classes: 'bg-status-duplicada-fundo text-status-duplicada-texto',
    classePonto: 'bg-status-duplicada-ponto',
  },
};

export const TIPO_OCORRENCIA: Readonly<Record<TipoOcorrencia, ApresentacaoTipo>> = {
  MANUTENCAO_AREA_COMUM: {
    rotulo: 'Manutenção em área comum',
    rotuloCurto: 'Manutenção',
    icone: 'manutencao',
  },
  RECLAMACAO_BARULHO: { rotulo: 'Reclamação', rotuloCurto: 'Reclamação', icone: 'reclamacao' },
  DUVIDA_REGRAS: { rotulo: 'Dúvida', rotuloCurto: 'Dúvida', icone: 'duvida' },
  SUGESTAO_MELHORIA: { rotulo: 'Sugestão de melhoria', rotuloCurto: 'Sugestão', icone: 'melhoria' },
  COMUNICADO_MUDANCA_OBRA: {
    rotulo: 'Comunicado de mudança ou obra',
    rotuloCurto: 'Mudança ou obra',
    icone: 'obra',
  },
};

export const URGENCIA: Readonly<Record<Urgencia, ApresentacaoUrgencia>> = {
  BAIXA: {
    rotulo: 'Baixa',
    classes: 'bg-urgencia-baixa-fundo text-urgencia-baixa-texto',
    nivel: 1,
  },
  MEDIA: {
    rotulo: 'Média',
    classes: 'bg-urgencia-media-fundo text-urgencia-media-texto',
    nivel: 2,
  },
  ALTA: {
    rotulo: 'Alta',
    classes: 'bg-urgencia-alta-fundo text-urgencia-alta-texto',
    nivel: 3,
  },
  CRITICA: {
    rotulo: 'Crítica',
    classes: 'bg-urgencia-critica-fundo text-urgencia-critica-texto',
    nivel: 4,
  },
};

export const ROTULO_NAO_TRIADA = 'Não triada';

export const ROTULO_PAPEL: Readonly<Record<Papel, string>> = {
  SINDICO: 'Síndico(a)',
  SUBSINDICO: 'Subsíndico(a)',
  MORADOR: 'Morador',
};

export const ROTULO_STATUS_USUARIO: Readonly<Record<StatusUsuario, string>> = {
  PENDENTE: 'Pendente',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  RECUSADO: 'Recusado',
};

export const ROTULO_ORIGEM: Readonly<Record<OrigemOcorrencia, string>> = {
  MORADOR: 'Moradores',
  ADMIN: 'Administração',
};
