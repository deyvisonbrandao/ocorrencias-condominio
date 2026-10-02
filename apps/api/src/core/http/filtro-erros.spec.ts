import {
  type ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ErroApi } from './erro-api.js';
import { FiltroErros, montarCorpoErro } from './filtro-erros.js';

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

  it('só repassa o corpo de ErroApi, não de qualquer HttpException', () => {
    const corpo = montarCorpoErro(
      new HttpException(
        { code: 'QUALQUER', message: 'detalhe interno', extra: 1 },
        400,
      ),
    );

    expect(corpo).toEqual({
      statusCode: 400,
      code: 'REQUISICAO_INVALIDA',
      message: 'A requisição é inválida.',
    });
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

describe('FiltroErros', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function hostCom(headersSent: boolean) {
    const resposta = { headersSent, status: vi.fn(), json: vi.fn() };
    resposta.status.mockReturnValue(resposta);
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/api/v1/x' }),
        getResponse: () => resposta,
      }),
    } as unknown as ArgumentsHost;
    return { host, resposta };
  }

  it('escreve o corpo padronizado', () => {
    const { host, resposta } = hostCom(false);

    new FiltroErros().catch(new NotFoundException(), host);

    expect(resposta.status).toHaveBeenCalledWith(404);
    expect(resposta.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NAO_ENCONTRADO' }),
    );
  });

  it('não tenta responder de novo quando os headers já foram enviados', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { host, resposta } = hostCom(true);

    new FiltroErros().catch(new Error('falhou no meio do stream'), host);

    expect(resposta.status).not.toHaveBeenCalled();
    expect(resposta.json).not.toHaveBeenCalled();
  });
});
