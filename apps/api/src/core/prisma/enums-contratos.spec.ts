import * as contratos from '@ocorrencias/contratos';
import { Papel, StatusUsuario } from '../../generated/prisma/client.js';

describe('enums do banco x packages/contratos', () => {
  it.each([
    ['Papel', Papel, contratos.Papel],
    ['StatusUsuario', StatusUsuario, contratos.StatusUsuario],
  ])('%s tem os mesmos valores nos dois lados', (_, doBanco, doContrato) => {
    expect(Object.values(doBanco).sort()).toEqual(
      Object.values(doContrato).sort(),
    );
  });
});
