import { applyDecorators } from '@nestjs/common';
import {
  celularBrE164Valido,
  normalizarApto,
  normalizarBloco,
  normalizarCelularBr,
  REGRAS_APTO,
  REGRAS_BLOCO,
  REGRAS_EMAIL,
  REGRAS_SENHA,
} from '@ocorrencias/contratos';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
} from 'class-validator';

export const MENSAGEM_CELULAR =
  'Informe um celular com DDD, como (11) 91234-5678.';
export const MENSAGEM_EMAIL = 'Confira o e-mail.';
export const MENSAGEM_SENHA = `A senha precisa ter pelo menos ${REGRAS_SENHA.min} caracteres.`;
export const MENSAGEM_BLOCO = 'Informe o bloco.';
export const MENSAGEM_APTO = 'Informe o apartamento.';

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
      typeof value === 'string' ? (normalizarCelularBr(value) ?? '') : value,
    ),
    ValidateBy(
      {
        name: 'celularBr',
        validator: {
          validate: (valor: unknown) =>
            typeof valor === 'string' && celularBrE164Valido(valor),
        },
      },
      { message: MENSAGEM_CELULAR },
    ),
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

function CampoUnidade(
  normalizar: (entrada: string) => string,
  max: number,
  mensagemVazio: string,
): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: TransformFnParams) =>
      typeof value === 'string' ? normalizar(value) : value,
    ),
    IsString({ message: mensagemVazio }),
    IsNotEmpty({ message: mensagemVazio }),
    MaxLength(max, { message: `Use no máximo ${max} caracteres.` }),
  );
}

export function BlocoObrigatorio(): PropertyDecorator {
  return CampoUnidade(normalizarBloco, REGRAS_BLOCO.max, MENSAGEM_BLOCO);
}

export function AptoObrigatorio(): PropertyDecorator {
  return CampoUnidade(normalizarApto, REGRAS_APTO.max, MENSAGEM_APTO);
}
