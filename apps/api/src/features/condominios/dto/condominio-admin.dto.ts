import { ApiProperty } from '@nestjs/swagger';
import {
  type AtualizarCondominioRequisicao,
  type CondominioAdmin,
  REGRAS_CIDADE,
  REGRAS_NOME_CONDOMINIO,
  Uf,
  UFS,
  ufValida,
} from '@ocorrencias/contratos';
import { ValidateBy, ValidateIf } from 'class-validator';
import { TextoObrigatorio } from '../../../shared/validators/campos-pessoa.js';

export const MENSAGEM_UF = 'Escolha a UF.';
export const MENSAGEM_SLUG_IMUTAVEL =
  'O endereço não pode ser alterado: os QR codes impressos deixariam de funcionar.';

export class CondominioAdminDto implements CondominioAdmin {
  @ApiProperty({ example: 'Residencial Jardim das Flores' })
  nome!: string;

  @ApiProperty({
    example: 'jardim-das-flores',
    description: 'Endereço do link `/c/:slug`. Somente leitura no MVP.',
  })
  slug!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Belo Horizonte',
    description:
      '`null` enquanto o síndico não preenche (o autocadastro não pede cidade).',
  })
  cidade!: string | null;

  @ApiProperty({
    enum: UFS,
    enumName: 'Uf',
    nullable: true,
    example: Uf.MG,
    description: '`null` enquanto o síndico não preenche.',
  })
  uf!: Uf | null;
}

export class AtualizarCondominioDto implements AtualizarCondominioRequisicao {
  @ApiProperty({
    example: 'Residencial Jardim das Flores',
    maxLength: REGRAS_NOME_CONDOMINIO.max,
  })
  @TextoObrigatorio(REGRAS_NOME_CONDOMINIO.max, 'Informe o nome do condomínio.')
  nome!: string;

  @ApiProperty({ example: 'Belo Horizonte', maxLength: REGRAS_CIDADE.max })
  @TextoObrigatorio(REGRAS_CIDADE.max, 'Informe a cidade.')
  cidade!: string;

  @ApiProperty({ enum: UFS, enumName: 'Uf', example: Uf.MG })
  @ValidateBy(
    {
      name: 'uf',
      validator: { validate: (valor: unknown) => ufValida(valor) },
    },
    { message: MENSAGEM_UF },
  )
  uf!: Uf;

  // Fora do Swagger de propósito: existe só para recusar o slug com mensagem própria em vez do genérico do whitelist.
  @ValidateIf((dto: AtualizarCondominioDto) => dto.slug !== undefined)
  @ValidateBy(
    { name: 'slugImutavel', validator: { validate: () => false } },
    { message: MENSAGEM_SLUG_IMUTAVEL },
  )
  slug?: never;
}
