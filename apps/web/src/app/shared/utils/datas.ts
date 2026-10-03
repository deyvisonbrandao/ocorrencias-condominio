export const FUSO_PADRAO = 'America/Sao_Paulo';

const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;
const DIA_MS = 24 * HORA_MS;
const DIAS_EM_TEMPO_RELATIVO = 7;

const DIA_DO_CALENDARIO = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_PADRAO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_PADRAO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_PADRAO,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function diaNoFuso(data: Date): number {
  const [ano, mes, dia] = DIA_DO_CALENDARIO.format(data).split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

export function formatarData(iso: string): string {
  return DATA.format(new Date(iso));
}

export function formatarDataEHora(iso: string): string {
  const data = new Date(iso);
  return `${DATA.format(data)} às ${HORA.format(data)}`;
}

export function tempoRelativo(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  const decorrido = agora.getTime() - data.getTime();
  if (decorrido < MINUTO_MS) {
    return 'agora';
  }
  if (decorrido < HORA_MS) {
    return `há ${Math.floor(decorrido / MINUTO_MS)} min`;
  }
  if (decorrido < DIA_MS) {
    return `há ${Math.floor(decorrido / HORA_MS)} h`;
  }
  const dias = Math.round((diaNoFuso(agora) - diaNoFuso(data)) / DIA_MS);
  if (dias <= 1) {
    return 'ontem';
  }
  if (dias < DIAS_EM_TEMPO_RELATIVO) {
    return `há ${dias} dias`;
  }
  return formatarData(iso);
}
