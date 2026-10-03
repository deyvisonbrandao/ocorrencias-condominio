import { applyDecorators } from '@nestjs/common';
import {
  CELULAR_BR_E164,
  normalizarCelularBr,
  REGRAS_EMAIL,
  REGRAS_SENHA,
} from '@ocorrencias/contratos';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const MENSAGEM_CELULAR =
  'Informe um celular com DDD, como (11) 91234-5678.';
export const MENSAGEM_EMAIL = 'Confira o e-mail.';
export const MENSAGEM_SENHA = `A senha precisa ter pelo menos ${REGRAS_SENHA.min} caracteres.`;

export function aparar({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function TextoObrigatorio(
  max: number,
  mensagemVazio: string,
): PropertyDecorator {
  return applyDecorators(
    Transform(aparar),
    IsString({ message: mensagemVazio }),
    IsNotEmpty({ message: mensagemVazio }),
    MaxLength(max, { message: `Use no máximo ${max} caracteres.` }),
  );
}

export function CelularBr(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: TransformFnParams) =>
      typeof value === 'string' ? (normalizarCelularBr(value) ?? value) : value,
    ),
    IsString({ message: MENSAGEM_CELULAR }),
    Matches(CELULAR_BR_E164, { message: MENSAGEM_CELULAR }),
  );
}

export function EmailOpcional(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: TransformFnParams) => {
      if (typeof value !== 'string') return value;
      const email = value.trim().toLowerCase();
      return email === '' ? undefined : email;
    }),
    IsOptional(),
    IsEmail({}, { message: MENSAGEM_EMAIL }),
    MaxLength(REGRAS_EMAIL.max, { message: MENSAGEM_EMAIL }),
  );
}

export function SenhaNova(): PropertyDecorator {
  return applyDecorators(
    IsString({ message: MENSAGEM_SENHA }),
    MinLength(REGRAS_SENHA.min, { message: MENSAGEM_SENHA }),
    MaxLength(REGRAS_SENHA.max, {
      message: `A senha pode ter no máximo ${REGRAS_SENHA.max} caracteres.`,
    }),
  );
}
