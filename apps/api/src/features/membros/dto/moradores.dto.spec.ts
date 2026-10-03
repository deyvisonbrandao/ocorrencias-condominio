import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListarMoradoresDto, RecusarMoradorDto } from './moradores.dto.js';

function validar<T extends object>(classe: new () => T, entrada: object) {
  const instancia = plainToInstance(classe, entrada);
  const erros = validateSync(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { instancia, campos: erros.map((e) => e.property) };
}

describe('ListarMoradoresDto', () => {
  it('aceita status repetido ou separado por vírgula, sem duplicar', () => {
    expect(
      validar(ListarMoradoresDto, { status: 'RECUSADO, INATIVO' }).instancia
        .status,
    ).toEqual(['RECUSADO', 'INATIVO']);
    expect(
      validar(ListarMoradoresDto, { status: ['ATIVO', 'ATIVO,PENDENTE'] })
        .instancia.status,
    ).toEqual(['ATIVO', 'PENDENTE']);
  });

  it('recusa status desconhecido', () => {
    expect(
      validar(ListarMoradoresDto, { status: 'ATIVO,ADMIN' }).campos,
    ).toEqual(['status']);
  });

  it('busca vazia vira ausente; longa demais é recusada', () => {
    expect(
      validar(ListarMoradoresDto, { q: '   ' }).instancia.q,
    ).toBeUndefined();
    expect(validar(ListarMoradoresDto, { q: 'x'.repeat(101) }).campos).toEqual([
      'q',
    ]);
  });

  it('limite vem da query como texto e precisa estar entre 1 e 100', () => {
    expect(validar(ListarMoradoresDto, { limite: '20' }).instancia.limite).toBe(
      20,
    );
    for (const limite of ['0', '101', '1.5', 'abc']) {
      expect(validar(ListarMoradoresDto, { limite }).campos).toEqual([
        'limite',
      ]);
    }
  });
});

describe('RecusarMoradorDto', () => {
  it('apara o motivo e exige texto', () => {
    expect(
      validar(RecusarMoradorDto, { motivo: '  Apto não existe ' }).instancia
        .motivo,
    ).toBe('Apto não existe');
    expect(validar(RecusarMoradorDto, { motivo: '   ' }).campos).toEqual([
      'motivo',
    ]);
    expect(validar(RecusarMoradorDto, {}).campos).toEqual(['motivo']);
  });

  it('limita o motivo a 500 caracteres', () => {
    expect(
      validar(RecusarMoradorDto, { motivo: 'x'.repeat(500) }).campos,
    ).toEqual([]);
    expect(
      validar(RecusarMoradorDto, { motivo: 'x'.repeat(501) }).campos,
    ).toEqual(['motivo']);
  });
});
