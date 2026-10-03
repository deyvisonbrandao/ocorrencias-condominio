import { formatarTelefoneParaExibir } from './telefone';

describe('formatarTelefoneParaExibir', () => {
  it('exibe o celular brasileiro em E.164 com DDD e hífen', () => {
    expect(formatarTelefoneParaExibir('+5511912345678')).toBe('(11) 91234-5678');
  });

  it('aceita o fixo de 8 dígitos', () => {
    expect(formatarTelefoneParaExibir('+551132345678')).toBe('(11) 3234-5678');
  });

  it('devolve como veio o que não é número brasileiro', () => {
    expect(formatarTelefoneParaExibir('+14155550100')).toBe('+14155550100');
  });
});
