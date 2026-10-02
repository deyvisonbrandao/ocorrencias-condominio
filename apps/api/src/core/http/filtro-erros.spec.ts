import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ErroApi } from './erro-api.js';
import { montarCorpoErro } from './filtro-erros.js';

describe('montarCorpoErro', () => {
  it('preserva code, message e details de ErroApi', () => {
    const corpo = montarCorpoErro(
      new ErroApi(
        HttpStatus.CONFLICT,
        'SLUG_EM_USO',
        'Este endereço já está em uso.',
        { slug: 'x' },
      ),
    );

    expect(corpo).toEqual({
      statusCode: 409,
      code: 'SLUG_EM_USO',
      message: 'Este endereço já está em uso.',
      details: { slug: 'x' },
    });
  });

  it('omite details quando não há detalhes', () => {
    expect(montarCorpoErro(new ErroApi(404, 'X', 'y'))).not.toHaveProperty(
      'details',
    );
  });

  it('traduz HttpException do Nest para o padrão em português', () => {
    expect(
      montarCorpoErro(new NotFoundException('Cannot GET /api/v1/x')),
    ).toEqual({
      statusCode: 404,
      code: 'NAO_ENCONTRADO',
      message: 'Recurso não encontrado.',
    });
    expect(montarCorpoErro(new BadRequestException()).code).toBe(
      'REQUISICAO_INVALIDA',
    );
    expect(montarCorpoErro(new ServiceUnavailableException()).code).toBe(
      'SERVICO_INDISPONIVEL',
    );
  });

  it('usa código genérico para status sem mapeamento', () => {
    expect(montarCorpoErro(new HttpException('teapot', 418)).code).toBe(
      'HTTP_418',
    );
  });

  it('converte erro de cliente do body-parser', () => {
    const erro = Object.assign(new SyntaxError('Unexpected token b in JSON'), {
      status: 400,
      expose: true,
      type: 'entity.parse.failed',
    });

    expect(montarCorpoErro(erro)).toEqual({
      statusCode: 400,
      code: 'REQUISICAO_INVALIDA',
      message: 'A requisição é inválida.',
    });
  });

  it('esconde detalhes de erro inesperado atrás de 500', () => {
    const corpo = montarCorpoErro(new Error('senha do banco: hunter2'));

    expect(corpo).toEqual({
      statusCode: 500,
      code: 'ERRO_INTERNO',
      message: 'Erro interno. Tente de novo em instantes.',
    });
  });

  it('não confia em status de erro que não é exposto ao cliente', () => {
    expect(montarCorpoErro({ status: 400, expose: false }).statusCode).toBe(
      500,
    );
  });
});
