import { ApiProperty } from '@nestjs/swagger';
import {
  type LoginRequisicao,
  REGRAS_SENHA,
  REGRAS_SLUG,
} from '@ocorrencias/contratos';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const aparar = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const TAMANHO_MAXIMO_TELEFONE = 30;

export class LoginDto implements LoginRequisicao {
  @ApiProperty({
    example: 'jardim-das-flores',
    description: 'Slug da rota `/c/:slug/entrar`.',
  })
  @Transform(aparar)
  @IsString({ message: 'Informe o condomínio.' })
  @IsNotEmpty({ message: 'Informe o condomínio.' })
  @MaxLength(REGRAS_SLUG.max, { message: 'Informe o condomínio.' })
  slug!: string;

  @ApiProperty({
    example: '(11) 91234-5678',
    description:
      'Celular com DDD em qualquer formatação; a API normaliza para E.164 antes de comparar.',
  })
  @IsString({ message: 'Informe o telefone.' })
  @IsNotEmpty({ message: 'Informe o telefone.' })
  @MaxLength(TAMANHO_MAXIMO_TELEFONE, { message: 'Confira o telefone.' })
  telefone!: string;

  @ApiProperty({ example: 'minha-senha-forte', format: 'password' })
  @IsString({ message: 'Informe a senha.' })
  @IsNotEmpty({ message: 'Informe a senha.' })
  @MaxLength(REGRAS_SENHA.max, {
    message: `A senha pode ter no máximo ${REGRAS_SENHA.max} caracteres.`,
  })
  senha!: string;
}
