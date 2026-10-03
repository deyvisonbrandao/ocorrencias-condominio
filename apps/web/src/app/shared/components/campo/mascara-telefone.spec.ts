import { normalizarCelularBr } from '@ocorrencias/contratos';
import { formatarTelefone } from './mascara-telefone';

function digitarTeclaATecla(teclas: string): string {
  let valor = '';
  for (const tecla of teclas) {
    valor = formatarTelefone(valor + tecla);
  }
  return valor;
}

function apagar(valor: string, vezes: number): string {
  let atual = valor;
  for (let i = 0; i < vezes; i += 1) {
    atual = formatarTelefone(atual.slice(0, -1));
  }
  return atual;
}

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

  it('ignora letras e símbolos', () => {
    expect(formatarTelefone('tel: 11 a9 1234 5678')).toBe('(11) 91234-5678');
  });

  describe('digitado tecla a tecla', () => {
    it.each([
      ['11912345678', '(11) 91234-5678'],
      ['+5511912345678', '+55 (11) 91234-5678'],
      ['5511912345678', '+55 (11) 91234-5678'],
      ['011912345678', '(11) 91234-5678'],
    ])('"%s" termina como "%s", que a API aceita', (teclas, esperado) => {
      const valor = digitarTeclaATecla(teclas);

      expect(valor).toBe(esperado);
      expect(normalizarCelularBr(valor)).not.toBeNull();
    });

    it('mantém o "+" sozinho e o código do país enquanto digita', () => {
      expect(digitarTeclaATecla('+')).toBe('+');
      expect(digitarTeclaATecla('+5')).toBe('+5');
      expect(digitarTeclaATecla('+55')).toBe('+55');
      expect(digitarTeclaATecla('+551')).toBe('+55 (1');
    });

    it('apagar a partir do formato internacional não trava em separador', () => {
      expect(apagar('+55 (11) 9', 1)).toBe('+55 (11');
      expect(apagar('+55 (11', 2)).toBe('+55');
      expect(apagar('+55', 3)).toBe('');
    });
  });

  describe('colado', () => {
    it.each([
      ['+55 11 91234-5678', '+55 (11) 91234-5678'],
      ['+5511912345678', '+55 (11) 91234-5678'],
      ['5511912345678', '+55 (11) 91234-5678'],
      ['011912345678', '(11) 91234-5678'],
      ['(11) 91234-5678', '(11) 91234-5678'],
    ])('"%s" vira "%s"', (colado, esperado) => {
      expect(formatarTelefone(colado)).toBe(esperado);
      expect(normalizarCelularBr(formatarTelefone(colado))).toBe('+5511912345678');
    });

    it('com código de outro país, mantém os dígitos para a validação recusar', () => {
      expect(formatarTelefone('+1 202 555 0100')).toBe('+12025550100');
      expect(normalizarCelularBr(formatarTelefone('+1 202 555 0100'))).toBeNull();
    });
  });
});
