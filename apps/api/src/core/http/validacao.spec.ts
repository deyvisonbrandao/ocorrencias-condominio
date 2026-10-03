import type { ValidationError } from '@nestjs/common';
import { achatarErrosValidacao } from './validacao.js';

describe('achatarErrosValidacao', () => {
  it('gera um item por campo, com caminho completo nos aninhados', () => {
    const erros: ValidationError[] = [
      {
        property: 'titulo',
        constraints: { isString: 'titulo must be a string' },
        children: [],
      },
      {
        property: 'endereco',
        children: [
          {
            property: 'bloco',
            constraints: {
              isNotEmpty: 'bloco should not be empty',
              maxLength: 'bloco is too long',
            },
            children: [],
          },
        ],
      },
    ];

    expect(achatarErrosValidacao(erros)).toEqual([
      { campo: 'titulo', erros: ['titulo must be a string'] },
      {
        campo: 'endereco.bloco',
        erros: ['bloco should not be empty', 'bloco is too long'],
      },
    ]);
  });
});
