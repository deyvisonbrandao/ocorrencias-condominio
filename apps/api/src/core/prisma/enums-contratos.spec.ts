import * as contratos from '@ocorrencias/contratos';
import { Papel, StatusUsuario, Uf } from '../../generated/prisma/client.js';

describe('enums do banco x packages/contratos', () => {
  it.each([
    ['Papel', Papel, contratos.Papel],
    ['StatusUsuario', StatusUsuario, contratos.StatusUsuario],
    ['Uf', Uf, contratos.Uf],
  ])('%s tem os mesmos valores nos dois lados', (_, doBanco, doContrato) => {
    expect(Object.values(doBanco).sort()).toEqual(
      Object.values(doContrato).sort(),
    );
  });

  it('toda UF tem nome e são as 27 unidades da federação', () => {
    expect(contratos.UFS).toHaveLength(27);
    for (const uf of contratos.UFS) {
      expect(contratos.NOMES_UF[uf]).toBeTruthy();
    }
  });
});
