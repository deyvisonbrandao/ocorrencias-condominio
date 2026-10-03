import {
  celularBrE164Valido,
  normalizarCelularBr,
  REGRAS_SLUG,
  slugValido,
} from '@ocorrencias/contratos';

describe('normalizarCelularBr', () => {
  it.each([
    ['(11) 91234-5678', '+5511912345678'],
    ['11912345678', '+5511912345678'],
    ['11 9 1234 5678', '+5511912345678'],
    ['+55 11 91234-5678', '+5511912345678'],
    ['+5511912345678', '+5511912345678'],
    ['5511912345678', '+5511912345678'],
    ['011 91234-5678', '+5511912345678'],
    ['  (99) 98765.4321 ', '+5599987654321'],
  ])('%s -> %s', (entrada, esperado) => {
    expect(normalizarCelularBr(entrada)).toBe(esperado);
  });

  it.each([
    ['fixo', '(11) 3123-4567'],
    ['sem DDD', '91234-5678'],
    ['DDD inexistente', '(20) 91234-5678'],
    ['DDD 23 inexistente em E.164', '+5523912345678'],
    ['DDD 39 inexistente em E.164', '+5539912345678'],
    ['DDD começando com 0', '(01) 91234-5678'],
    ['dígito a mais', '(11) 91234-56789'],
    ['outro país', '+1 415 912 3456'],
    ['letras', '11 9123A-5678'],
    ['vazio', ''],
  ])('recusa %s', (_, entrada) => {
    expect(normalizarCelularBr(entrada)).toBeNull();
  });
});

describe('celularBrE164Valido', () => {
  it('aceita só o E.164 que a normalização produziria', () => {
    expect(celularBrE164Valido('+5511912345678')).toBe(true);
  });

  it.each([
    '+5523912345678',
    '+5539912345678',
    '+5511312345678',
    '11912345678',
    '+55 11 91234-5678',
  ])('recusa %s', (valor) => {
    expect(celularBrE164Valido(valor)).toBe(false);
  });
});

describe('slug', () => {
  it.each([
    'abc',
    'jardim-das-flores',
    'bloco-2',
    '123',
    'a'.repeat(40),
    'a--b',
  ])('aceita %s', (slug) => {
    expect(slugValido(slug)).toBe(true);
  });

  it.each([
    'ab',
    'a'.repeat(41),
    'Jardim',
    'jardim das flores',
    'jardim_flores',
    'são-paulo',
    '-jardim',
    'jardim-',
    '',
  ])('recusa %j', (slug) => {
    expect(slugValido(slug)).toBe(false);
  });

  it('segue os limites da especificação de UI', () => {
    expect(REGRAS_SLUG).toMatchObject({ min: 3, max: 40 });
  });
});
