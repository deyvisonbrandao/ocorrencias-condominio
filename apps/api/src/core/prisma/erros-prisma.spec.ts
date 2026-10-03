import { violouIndiceUnico } from './erros-prisma.js';

function erroDoAdapter(indice: string) {
  return {
    code: 'P2002',
    meta: {
      modelName: 'Condominio',
      driverAdapterError: {
        cause: {
          kind: 'UniqueConstraintViolation',
          constraint: { index: indice },
        },
      },
    },
  };
}

describe('violouIndiceUnico', () => {
  it('reconhece o índice informado pelo driver adapter', () => {
    expect(
      violouIndiceUnico(
        erroDoAdapter('condominio_slug_key'),
        'condominio_slug_key',
      ),
    ).toBe(true);
  });

  it('não confunde com outro índice único', () => {
    expect(
      violouIndiceUnico(
        erroDoAdapter('usuario_condominio_id_telefone_key'),
        'condominio_slug_key',
      ),
    ).toBe(false);
  });

  it('aceita meta.target como nome do índice ou lista', () => {
    expect(
      violouIndiceUnico({ code: 'P2002', meta: { target: 'idx' } }, 'idx'),
    ).toBe(true);
    expect(
      violouIndiceUnico({ code: 'P2002', meta: { target: ['idx'] } }, 'idx'),
    ).toBe(true);
  });

  it('ignora erro que não é P2002', () => {
    expect(violouIndiceUnico({ code: 'P2025' }, 'idx')).toBe(false);
    expect(violouIndiceUnico(new Error('x'), 'idx')).toBe(false);
    expect(violouIndiceUnico(undefined, 'idx')).toBe(false);
  });
});
