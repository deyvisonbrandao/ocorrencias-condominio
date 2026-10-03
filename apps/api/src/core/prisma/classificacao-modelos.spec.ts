import { Prisma } from '../../generated/prisma/client.js';
import {
  CAMPO_CONDOMINIO,
  camposEscalares,
  CLASSIFICACAO_MODELOS,
} from './classificacao-modelos.js';

// O generator prisma-client do Prisma 7 não exporta Prisma.dmmf; ModelName e <Modelo>ScalarFieldEnum saem do mesmo DMMF.
const modelosDoSchema = Object.values(Prisma.ModelName) as string[];

describe('classificação dos modelos (DMMF)', () => {
  it('todo modelo do schema está classificado', () => {
    const semClassificacao = modelosDoSchema.filter(
      (modelo) => !(modelo in CLASSIFICACAO_MODELOS),
    );

    expect(semClassificacao).toEqual([]);
  });

  it('a classificação não cita modelo que não existe', () => {
    expect(Object.keys(CLASSIFICACAO_MODELOS).sort()).toEqual(
      [...modelosDoSchema].sort(),
    );
  });

  it.each(
    modelosDoSchema.filter(
      (modelo) =>
        CLASSIFICACAO_MODELOS[modelo as Prisma.ModelName] === 'escopado',
    ),
  )('o modelo escopado %s tem o campo condominioId', (modelo) => {
    expect(camposEscalares(modelo).has(CAMPO_CONDOMINIO)).toBe(true);
  });

  it('a raiz é só o Condominio', () => {
    const raizes = Object.entries(CLASSIFICACAO_MODELOS)
      .filter(([, classificacao]) => classificacao === 'raiz')
      .map(([modelo]) => modelo);

    expect(raizes).toEqual(['Condominio']);
  });

  it('modelo com condominioId não pode ficar fora do filtro', () => {
    const comCondominioForaDoFiltro = modelosDoSchema.filter(
      (modelo) =>
        camposEscalares(modelo).has(CAMPO_CONDOMINIO) &&
        CLASSIFICACAO_MODELOS[modelo as Prisma.ModelName] !== 'escopado',
    );

    expect(comCondominioForaDoFiltro).toEqual([]);
  });
});
