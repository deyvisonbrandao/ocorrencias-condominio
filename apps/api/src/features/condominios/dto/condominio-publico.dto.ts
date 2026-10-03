import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsObject,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  aparar,
  CelularBr,
  EmailOpcional,
  SenhaNova,
  TextoObrigatorio,
} from '../../../shared/validators/campos-pessoa.js';

const MENSAGEM_SLUG = 'Use só letras minúsculas, números e hífen.';

export class SindicoNovoDto implements SindicoNovo {
  @ApiProperty({ example: 'Maria Souza', maxLength: REGRAS_NOME_PESSOA.max })
  @TextoObrigatorio(REGRAS_NOME_PESSOA.max, 'Informe seu nome.')
  nome!: string;

  @ApiProperty({
    example: '(11) 91234-5678',
    description:
      'Celular brasileiro com DDD, em qualquer formatação (com ou sem +55). A API grava em E.164, por exemplo `+5511912345678`.',
  })
  @CelularBr()
  telefone!: string;

  @ApiPropertyOptional({
    example: 'maria@exemplo.com',
    maxLength: REGRAS_EMAIL.max,
    description: 'Opcional. Texto vazio é tratado como ausente.',
  })
  @EmailOpcional()
  email?: string;

  @ApiProperty({
    example: 'minha-senha-forte',
    format: 'password',
    minLength: REGRAS_SENHA.min,
    maxLength: REGRAS_SENHA.max,
  })
  @SenhaNova()
  senha!: string;
}

export class CadastrarCondominioDto implements CadastrarCondominioRequisicao {
  @ApiProperty({
    example: 'Residencial Jardim das Flores',
    maxLength: REGRAS_NOME_CONDOMINIO.max,
  })
  @TextoObrigatorio(REGRAS_NOME_CONDOMINIO.max, 'Informe o nome do condomínio.')
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
