import { textoCidade } from './texto-cidade';

describe('textoCidade', () => {
  it.each([
    ['Campinas', 'SP', 'Campinas – SP'],
    ['Campinas', null, 'Campinas'],
    [null, 'SP', 'SP'],
    [null, null, null],
  ])('%s + %s → %s', (cidade, uf, esperado) => {
    expect(textoCidade(cidade, uf)).toBe(esperado);
  });
});
