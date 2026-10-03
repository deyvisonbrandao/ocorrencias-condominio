import {
  acoesDisponiveisMorador,
  TRANSICOES_MORADOR,
} from '@ocorrencias/contratos';
import {
  apresentarMorador,
  codificarCursor,
  decodificarCursor,
  escaparLike,
  filtroMoradores,
  motivoDosDados,
  termosDaBusca,
} from './consulta-moradores.js';

const ID = '0199a5c2-7f3e-7a51-9b0e-3c2d1e4f5a6b';

describe('transições de morador (contratos)', () => {
  it('cada status de origem tem as ações esperadas', () => {
    expect(acoesDisponiveisMorador('PENDENTE')).toEqual(['aprovar', 'recusar']);
    expect(acoesDisponiveisMorador('ATIVO')).toEqual(['inativar']);
    expect(acoesDisponiveisMorador('INATIVO')).toEqual(['reativar']);
    expect(acoesDisponiveisMorador('RECUSADO')).toEqual([]);
  });

  it('nenhuma ação leva de volta a PENDENTE', () => {
    expect(Object.values(TRANSICOES_MORADOR).map((t) => t.para)).not.toContain(
      'PENDENTE',
    );
  });
});

describe('cursor de moradores', () => {
  it('ida e volta preserva data e id', () => {
    const posicao = { criadoEm: new Date('2026-10-03T14:31:33.123Z'), id: ID };
    expect(decodificarCursor(codificarCursor(posicao))).toEqual(posicao);
  });

  it.each([
    ['lixo', 'nao-e-base64-json'],
    ['objeto', Buffer.from('{"a":1}').toString('base64url')],
    [
      'data inválida',
      Buffer.from(JSON.stringify(['ontem', ID])).toString('base64url'),
    ],
    [
      'data fora do ISO canônico',
      Buffer.from(JSON.stringify(['2026-10-03', ID])).toString('base64url'),
    ],
    [
      'id fora do formato',
      Buffer.from(
        JSON.stringify(['2026-10-03T14:31:33.123Z', "1' OR 1=1"]),
      ).toString('base64url'),
    ],
  ])('%s é recusado', (_, cursor) => {
    expect(decodificarCursor(cursor)).toBeNull();
  });
});

describe('busca de moradores', () => {
  it('escapa os curingas do LIKE e a barra invertida', () => {
    expect(escaparLike(String.raw`100%_a\b`)).toBe(String.raw`100\%\_a\\b`);
  });

  it('quebra em termos únicos, sem vazios, até o limite', () => {
    expect(termosDaBusca('  B   302 B ')).toEqual(['B', '302']);
    expect(termosDaBusca('a b c d e f g')).toHaveLength(5);
    expect(termosDaBusca(undefined)).toEqual([]);
  });

  it('filtra sempre por papel MORADOR e combina status, termos e cursor', () => {
    const cursor = { criadoEm: new Date('2026-10-03T00:00:00.000Z'), id: ID };
    expect(filtroMoradores(['RECUSADO', 'INATIVO'], 'B 302', cursor)).toEqual({
      papel: 'MORADOR',
      status: { in: ['RECUSADO', 'INATIVO'] },
      AND: [
        {
          OR: [
            { nome: { contains: 'B' } },
            { bloco: { contains: 'B' } },
            { apto: { contains: 'B' } },
          ],
        },
        {
          OR: [
            { nome: { contains: '302' } },
            { bloco: { contains: '302' } },
            { apto: { contains: '302' } },
          ],
        },
        {
          OR: [
            { criadoEm: { lt: cursor.criadoEm } },
            { criadoEm: cursor.criadoEm, id: { lt: ID } },
          ],
        },
      ],
    });
    expect(filtroMoradores(undefined, undefined, undefined)).toEqual({
      papel: 'MORADOR',
    });
  });
});

describe('apresentação do morador', () => {
  const linha = {
    id: ID,
    nome: 'João',
    telefone: '+5511912345678',
    bloco: 'B',
    apto: '302',
    criadoEm: new Date('2026-10-03T14:31:33.000Z'),
  };

  it('só expõe o motivo quando o status é RECUSADO', () => {
    expect(
      apresentarMorador({ ...linha, status: 'RECUSADO' }, 'Apto não existe')
        .motivoRecusa,
    ).toBe('Apto não existe');
    expect(
      apresentarMorador({ ...linha, status: 'PENDENTE' }, 'Apto não existe')
        .motivoRecusa,
    ).toBeNull();
  });

  it('não vaza campos fora da whitelist', () => {
    const extra = { ...linha, status: 'ATIVO', senhaHash: 'x' } as const;
    expect(Object.keys(apresentarMorador(extra, null)).sort()).toEqual(
      [
        'apto',
        'bloco',
        'criadoEm',
        'id',
        'motivoRecusa',
        'nome',
        'status',
        'telefone',
      ].sort(),
    );
  });

  it('lê o motivo só de dados com o campo em texto', () => {
    expect(motivoDosDados({ motivo: 'x' })).toBe('x');
    expect(motivoDosDados({ motivo: 1 })).toBeNull();
    expect(motivoDosDados(null)).toBeNull();
    expect(motivoDosDados(['x'])).toBeNull();
  });
});
