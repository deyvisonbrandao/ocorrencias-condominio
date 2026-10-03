import { HttpErrorResponse } from '@angular/common/http';
import { errosPorCampo, lerErroApi } from './erro-api';

function resposta(status: number, corpo: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: corpo });
}

describe('lerErroApi', () => {
  it('lê o corpo de erro padrão da API', () => {
    const corpo = {
      statusCode: 409,
      code: 'SLUG_EM_USO',
      message: 'Endereço já em uso.',
      details: { campo: 'slug' },
    };

    expect(lerErroApi(resposta(409, corpo))).toEqual(corpo);
  });

  it.each([
    ['sem corpo', null],
    ['texto', 'Bad Gateway'],
    ['sem code', { statusCode: 500, message: 'x' }],
  ])('devolve null quando o corpo não segue o formato (%s)', (_caso, corpo) => {
    expect(lerErroApi(resposta(500, corpo))).toBeNull();
  });

  it('devolve null para erro que não é HTTP', () => {
    expect(lerErroApi(new Error('falhou'))).toBeNull();
  });
});

describe('errosPorCampo', () => {
  it('mapeia a lista de validação para a primeira mensagem de cada campo, inclusive aninhado', () => {
    const corpo = {
      statusCode: 400,
      code: 'VALIDACAO_FALHOU',
      message: 'Os dados enviados são inválidos.',
      details: [
        {
          campo: 'slug',
          erros: ['Use de 3 a 40 caracteres.', 'Use só letras minúsculas, números e hífen.'],
        },
        { campo: 'sindico.telefone', erros: ['Informe um celular com DDD, como (11) 91234-5678.'] },
        { campo: 'sindico.email', erros: [] },
        { erros: ['sem campo'] },
      ],
    };

    expect(errosPorCampo(corpo)).toEqual({
      slug: 'Use de 3 a 40 caracteres.',
      'sindico.telefone': 'Informe um celular com DDD, como (11) 91234-5678.',
    });
  });

  it('usa a mensagem do erro quando os detalhes apontam um único campo', () => {
    const corpo = {
      statusCode: 409,
      code: 'SLUG_EM_USO',
      message: 'Endereço já em uso. Tente outro.',
      details: { campo: 'slug' },
    };

    expect(errosPorCampo(corpo)).toEqual({ slug: 'Endereço já em uso. Tente outro.' });
  });

  it('sem detalhes de campo, não mapeia nada', () => {
    expect(errosPorCampo(null)).toEqual({});
    expect(errosPorCampo({ statusCode: 404, code: 'X', message: 'y' })).toEqual({});
  });
});
