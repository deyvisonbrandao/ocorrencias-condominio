import { diferenca } from './condominio-admin.service.js';

describe('diferenca (auditoria de CONDOMINIO_ATUALIZADO)', () => {
  const atual = { nome: 'Aurora', cidade: null, uf: null };

  it('sem mudança devolve null', () => {
    expect(diferenca(atual, { ...atual })).toBeNull();
  });

  it('guarda só os campos alterados, com o de/para', () => {
    expect(
      diferenca(atual, { nome: 'Aurora', cidade: 'Recife', uf: 'PE' }),
    ).toEqual({
      de: { cidade: null, uf: null },
      para: { cidade: 'Recife', uf: 'PE' },
    });
  });
});
