import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type CorpoErroApi, ErroApi } from './erro-api.js';

const PADROES: Record<number, { code: string; message: string }> = {
  400: { code: 'REQUISICAO_INVALIDA', message: 'A requisição é inválida.' },
  401: { code: 'NAO_AUTENTICADO', message: 'É preciso entrar para continuar.' },
  403: {
    code: 'ACESSO_NEGADO',
    message: 'Você não tem permissão para esta ação.',
  },
  404: { code: 'NAO_ENCONTRADO', message: 'Recurso não encontrado.' },
  405: {
    code: 'METODO_NAO_PERMITIDO',
    message: 'Método não permitido para este recurso.',
  },
  409: {
    code: 'CONFLITO',
    message: 'A operação conflita com o estado atual do recurso.',
  },
  413: {
    code: 'CORPO_MUITO_GRANDE',
    message: 'O corpo da requisição é grande demais.',
  },
  415: {
    code: 'TIPO_NAO_SUPORTADO',
    message: 'Tipo de conteúdo não suportado.',
  },
  422: {
    code: 'ENTIDADE_NAO_PROCESSAVEL',
    message: 'Não foi possível processar os dados enviados.',
  },
  429: {
    code: 'MUITAS_REQUISICOES',
    message: 'Muitas requisições. Tente de novo em instantes.',
  },
  500: {
    code: 'ERRO_INTERNO',
    message: 'Erro interno. Tente de novo em instantes.',
  },
  503: {
    code: 'SERVICO_INDISPONIVEL',
    message: 'Serviço indisponível. Tente de novo em instantes.',
  },
};

function padraoDoStatus(statusCode: number): { code: string; message: string } {
  return (
    PADROES[statusCode] ??
    (statusCode >= 500
      ? PADROES[500]
      : { code: `HTTP_${statusCode}`, message: 'Requisição recusada.' })
  );
}

// Erros do body-parser (JSON malformado, corpo grande demais) chegam como http-errors, não como HttpException.
function statusDeErroHttpCliente(erro: unknown): number | undefined {
  if (typeof erro !== 'object' || erro === null) return undefined;
  const { status, expose } = erro as { status?: unknown; expose?: unknown };
  return typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    expose === true
    ? status
    : undefined;
}

export function montarCorpoErro(erro: unknown): CorpoErroApi {
  if (erro instanceof ErroApi) {
    return {
      ...(erro.getResponse() as CorpoErroApi),
      statusCode: erro.getStatus(),
    };
  }

  if (erro instanceof HttpException) {
    const statusCode = erro.getStatus();
    return { statusCode, ...padraoDoStatus(statusCode) };
  }

  const statusCliente = statusDeErroHttpCliente(erro);
  if (statusCliente !== undefined) {
    return { statusCode: statusCliente, ...padraoDoStatus(statusCliente) };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    ...padraoDoStatus(500),
  };
}

@Catch()
export class FiltroErros implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(erro: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const requisicao = contexto.getRequest<Request>();
    const resposta = contexto.getResponse<Response>();
    const corpo = montarCorpoErro(erro);

    if (corpo.statusCode >= 500) {
      const linha = `${requisicao.method} ${requisicao.path} -> ${corpo.statusCode} ${corpo.code}`;
      if (erro instanceof HttpException) {
        this.logger.warn(linha);
      } else {
        this.logger.error(
          linha,
          erro instanceof Error ? erro.stack : String(erro),
        );
      }
    }

    if (resposta.headersSent) {
      return;
    }
    resposta.status(corpo.statusCode).json(corpo);
  }
}
