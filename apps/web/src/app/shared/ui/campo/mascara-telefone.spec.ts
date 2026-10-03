import { formatarTelefone } from './mascara-telefone';

describe('formatarTelefone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['1191234', '(11) 91234'],
    ['11912345', '(11) 91234-5'],
    ['11912345678', '(11) 91234-5678'],
  ])('formata "%s" progressivamente como "%s"', (entrada, esperado) => {
    expect(formatarTelefone(entrada)).toBe(esperado);
  });

  it('descarta dígitos além do celular com DDD', () => {
    expect(formatarTelefone('119123456789')).toBe('(11) 91234-5678');
  });

  it('ao apagar, não deixa separador sobrando no fim', () => {
    expect(formatarTelefone('(11) 91234-')).toBe('(11) 91234');
    expect(formatarTelefone('(11) ')).toBe('(11');
  });

  it.each(['+55 11 91234-5678', '5511912345678', '011912345678'])(
    'aceita colar "%s" com código do país ou zero de discagem',
    (colado) => {
      expect(formatarTelefone(colado)).toBe('(11) 91234-5678');
    },
  );

  it('ignora letras e símbolos', () => {
    expect(formatarTelefone('tel: 11 a9 1234 5678')).toBe('(11) 91234-5678');
  });
});
