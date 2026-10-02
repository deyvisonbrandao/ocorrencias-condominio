import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErroApi } from './erro-api.js';

export interface CampoInvalido {
  campo: string;
  erros: string[];
}

export function achatarErrosValidacao(
  erros: ValidationError[],
  prefixo = '',
): CampoInvalido[] {
  return erros.flatMap((erro) => {
    const campo = prefixo ? `${prefixo}.${erro.property}` : erro.property;
    const proprios = erro.constraints
      ? [{ campo, erros: Object.values(erro.constraints) }]
      : [];
    return [...proprios, ...achatarErrosValidacao(erro.children ?? [], campo)];
  });
}

export function criarValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (erros) =>
      new ErroApi(
        HttpStatus.BAD_REQUEST,
        'VALIDACAO_FALHOU',
        'Os dados enviados são inválidos.',
        achatarErrosValidacao(erros),
      ),
  });
}
