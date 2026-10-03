import { linkPublico, textoCidade } from './link-publico';

describe('linkPublico', () => {
  it('monta a URL pública /c/:slug na origem do ambiente', () => {
    expect(linkPublico('https://ocorrencias.app', 'jardim')).toBe('https://ocorrencias.app/c/jardim');
  });

  it('não duplica a barra quando a origem termina em /', () => {
    expect(linkPublico('http://localhost:4200/', 'jardim')).toBe('http://localhost:4200/c/jardim');
  });

  it('codifica o slug', () => {
    expect(linkPublico('https://ocorrencias.app', 'a b')).toBe('https://ocorrencias.app/c/a%20b');
  });
});

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
