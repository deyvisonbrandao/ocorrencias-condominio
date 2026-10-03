import { formatarData, formatarDataEHora, tempoRelativo } from './datas';

describe('tempoRelativo', () => {
  const agora = new Date('2026-10-03T15:00:00Z');

  it.each([
    ['2026-10-03T14:59:30Z', 'agora'],
    ['2026-10-03T15:00:20Z', 'agora'],
    ['2026-10-03T14:59:00Z', 'há 1 min'],
    ['2026-10-03T14:01:00Z', 'há 59 min'],
    ['2026-10-03T14:00:00Z', 'há 1 h'],
    ['2026-10-02T15:01:00Z', 'há 23 h'],
    ['2026-10-02T14:00:00Z', 'ontem'],
    ['2026-10-01T15:00:00Z', 'há 2 dias'],
    ['2026-09-27T15:00:00Z', 'há 6 dias'],
    ['2026-09-26T15:00:00Z', '26/09/2026'],
  ])('%s → %s', (iso, esperado) => {
    expect(tempoRelativo(iso, agora)).toBe(esperado);
  });

  it('conta os dias pelo calendário de São Paulo, não pelo UTC', () => {
    const noiteEmSaoPaulo = new Date('2026-10-04T01:30:00Z');

    expect(tempoRelativo('2026-10-02T23:00:00Z', noiteEmSaoPaulo)).toBe('ontem');
  });
});

describe('formatação de data', () => {
  it('formata a data e a hora no fuso de São Paulo', () => {
    expect(formatarData('2026-10-03T02:00:00Z')).toBe('02/10/2026');
    expect(formatarDataEHora('2026-10-03T14:05:00Z')).toBe('03/10/2026 às 11:05');
  });
});
