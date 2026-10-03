import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CELULAR_BR_E164,
  normalizarCelularBr,
  REGRAS_EMAIL,
  REGRAS_NOME_CONDOMINIO,
  REGRAS_NOME_PESSOA,
  REGRAS_SENHA,
  REGRAS_SLUG,
} from '@ocorrencias/contratos';
import type {
  CadastrarCondominioRequisicao,
  CondominioCriado,
  CondominioPublico,
  SindicoNovo,
} from '@ocorrencias/contratos';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const aparar = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizarTelefone = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? (normalizarCelularBr(value) ?? value) : value;

const normalizarEmail = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const email = value.trim().toLowerCase();
  return email === '' ? undefined : email;
};

const MENSAGEM_SLUG = 'Use só letras minúsculas, números e hífen.';
const MENSAGEM_SENHA = `A senha precisa ter pelo menos ${REGRAS_SENHA.min} caracteres.`;

export class SindicoNovoDto implements SindicoNovo {
  @ApiProperty({ example: 'Maria Souza', maxLength: REGRAS_NOME_PESSOA.max })
  @Transform(aparar)
  @IsString({ message: 'Informe seu nome.' })
  @IsNotEmpty({ message: 'Informe seu nome.' })
  @MaxLength(REGRAS_NOME_PESSOA.max, {
    message: `Use no máximo ${REGRAS_NOME_PESSOA.max} caracteres.`,
  })
  nome!: string;

  @ApiProperty({
    example: '(11) 91234-5678',
    description:
      'Celular brasileiro com DDD, em qualquer formatação (com ou sem +55). A API grava em E.164, por exemplo `+5511912345678`.',
  })
  @Transform(normalizarTelefone)
  @IsString({ message: 'Informe um celular com DDD, como (11) 91234-5678.' })
  @Matches(CELULAR_BR_E164, {
    message: 'Informe um celular com DDD, como (11) 91234-5678.',
  })
  telefone!: string;

  @ApiPropertyOptional({
    example: 'maria@exemplo.com',
    maxLength: REGRAS_EMAIL.max,
    description: 'Opcional. Texto vazio é tratado como ausente.',
  })
  @Transform(normalizarEmail)
  @IsOptional()
  @IsEmail({}, { message: 'Confira o e-mail.' })
  @MaxLength(REGRAS_EMAIL.max, { message: 'Confira o e-mail.' })
  email?: string;

  @ApiProperty({
    example: 'minha-senha-forte',
    format: 'password',
    minLength: REGRAS_SENHA.min,
    maxLength: REGRAS_SENHA.max,
  })
  @IsString({ message: MENSAGEM_SENHA })
  @MinLength(REGRAS_SENHA.min, { message: MENSAGEM_SENHA })
  @MaxLength(REGRAS_SENHA.max, {
    message: `A senha pode ter no máximo ${REGRAS_SENHA.max} caracteres.`,
  })
  senha!: string;
}

export class CadastrarCondominioDto implements CadastrarCondominioRequisicao {
  @ApiProperty({
    example: 'Residencial Jardim das Flores',
    maxLength: REGRAS_NOME_CONDOMINIO.max,
  })
  @Transform(aparar)
  @IsString({ message: 'Informe o nome do condomínio.' })
  @IsNotEmpty({ message: 'Informe o nome do condomínio.' })
  @MaxLength(REGRAS_NOME_CONDOMINIO.max, {
    message: `Use no máximo ${REGRAS_NOME_CONDOMINIO.max} caracteres.`,
  })
  nome!: string;

  @ApiProperty({
    example: 'jardim-das-flores',
    minLength: REGRAS_SLUG.min,
    maxLength: REGRAS_SLUG.max,
    pattern: REGRAS_SLUG.padrao.source,
    description:
      'Endereço do link `/c/:slug`. Letras minúsculas sem acento, números e hífen; não começa nem termina com hífen.',
  })
  @Transform(aparar)
  @IsString({ message: MENSAGEM_SLUG })
  @Length(REGRAS_SLUG.min, REGRAS_SLUG.max, {
    message: `Use de ${REGRAS_SLUG.min} a ${REGRAS_SLUG.max} caracteres.`,
  })
  @Matches(REGRAS_SLUG.padrao, { message: MENSAGEM_SLUG })
  slug!: string;

  @ApiProperty({ type: SindicoNovoDto })
  @IsDefined({ message: 'Informe os dados do síndico.' })
  @IsObject({ message: 'Informe os dados do síndico.' })
  @ValidateNested()
  @Type(() => SindicoNovoDto)
  sindico!: SindicoNovoDto;
}

export class CondominioCriadoDto implements CondominioCriado {
  @ApiProperty({ example: '0199a5c2-7f3e-7a51-9b0e-3c2d1e4f5a6b' })
  id!: string;

  @ApiProperty({ example: 'Residencial Jardim das Flores' })
  nome!: string;

  @ApiProperty({ example: 'jardim-das-flores' })
  slug!: string;
}

export class CondominioPublicoDto implements CondominioPublico {
  @ApiProperty({ example: 'Residencial Jardim das Flores' })
  nome!: string;

  @ApiProperty({ example: 'jardim-das-flores' })
  slug!: string;
}
