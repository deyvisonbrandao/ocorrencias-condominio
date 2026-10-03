import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type ContagemMoradores,
  LIMITE_PAGINA_MORADORES,
  type ListarMoradoresConsulta,
  type MoradorAdmin,
  type PaginaMoradores,
  REGRAS_BUSCA_MORADORES,
  REGRAS_MOTIVO_RECUSA,
  type RecusarMoradorRequisicao,
  StatusUsuario,
} from '@ocorrencias/contratos';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TextoObrigatorio } from '../../../shared/validators/campos-pessoa.js';

const STATUS = Object.values(StatusUsuario);

function listaDeStatus({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null) return undefined;
  const brutos: unknown[] = Array.isArray(value) ? value : [value];
  if (brutos.some((item) => typeof item !== 'string')) return value;
  const itens = (brutos as string[])
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  return itens.length ? [...new Set(itens)] : undefined;
}

function textoOuAusente({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const texto = value.trim();
  return texto === '' ? undefined : texto;
}

function inteiro({ value }: TransformFnParams): unknown {
  return typeof value === 'string' && /^\d{1,4}$/.test(value)
    ? Number(value)
    : value;
}

export class ListarMoradoresDto implements ListarMoradoresConsulta {
  @ApiPropertyOptional({
    enum: StatusUsuario,
    isArray: true,
    example: [StatusUsuario.RECUSADO, StatusUsuario.INATIVO],
    description:
      'Um ou mais status, repetindo o parâmetro ou separados por vírgula (`status=RECUSADO,INATIVO`). Sem o parâmetro, lista todos os moradores.',
  })
  @IsOptional()
  @Transform(listaDeStatus)
  @IsArray({ message: 'Status inválido.' })
  @ArrayMaxSize(STATUS.length, { message: 'Status inválido.' })
  @IsIn(STATUS, { each: true, message: 'Status inválido.' })
  status?: StatusUsuario[];

  @ApiPropertyOptional({
    example: 'B 302',
    maxLength: REGRAS_BUSCA_MORADORES.max,
    description: `Busca por nome, bloco ou apto, sem diferenciar maiúsculas e acentos. Cada palavra (até ${REGRAS_BUSCA_MORADORES.termos}) precisa aparecer em um dos três campos. Palavra de até ${REGRAS_BUSCA_MORADORES.termoCurtoMax} caracteres vale só como bloco exato ou início do apto ("B 302" não acha nomes com "b").`,
  })
  @IsOptional()
  @Transform(textoOuAusente)
  @IsString({ message: 'Busca inválida.' })
  @MaxLength(REGRAS_BUSCA_MORADORES.max, {
    message: `Use no máximo ${REGRAS_BUSCA_MORADORES.max} caracteres.`,
  })
  q?: string;

  @ApiPropertyOptional({
    description:
      'Valor de `proximoCursor` da página anterior. Opaco: não monte nem altere no cliente.',
  })
  @IsOptional()
  @IsString({ message: 'Cursor inválido.' })
  @MaxLength(200, { message: 'Cursor inválido.' })
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: LIMITE_PAGINA_MORADORES.max,
    default: LIMITE_PAGINA_MORADORES.padrao,
  })
  @IsOptional()
  @Transform(inteiro)
  @IsInt({ message: 'Limite inválido.' })
  @Min(1, { message: 'Limite inválido.' })
  @Max(LIMITE_PAGINA_MORADORES.max, {
    message: `Use no máximo ${LIMITE_PAGINA_MORADORES.max}.`,
  })
  limite?: number;
}

export class RecusarMoradorDto implements RecusarMoradorRequisicao {
  @ApiProperty({
    example: 'Apartamento informado não existe no condomínio.',
    maxLength: REGRAS_MOTIVO_RECUSA.max,
    description:
      'Obrigatório. Fica registrado na auditoria e aparece para a administração na aba "Recusados e inativos".',
  })
  @TextoObrigatorio(REGRAS_MOTIVO_RECUSA.max, 'Informe o motivo.')
  motivo!: string;
}

export class MoradorAdminDto implements MoradorAdmin {
  @ApiProperty({ example: '0199a5c2-7f3e-7a51-9b0e-3c2d1e4f5a6b' })
  id!: string;

  @ApiProperty({ example: 'João Pereira' })
  nome!: string;

  @ApiProperty({ example: '+5511912345678', description: 'E.164.' })
  telefone!: string;

  @ApiProperty({ type: String, nullable: true, example: 'B' })
  bloco!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '302' })
  apto!: string | null;

  @ApiProperty({ enum: StatusUsuario, example: StatusUsuario.PENDENTE })
  status!: StatusUsuario;

  @ApiProperty({
    example: '2026-10-03T14:31:33.000Z',
    format: 'date-time',
    description:
      'Data do pedido de cadastro, em UTC. O recadastro de um recusado regrava a data.',
  })
  criadoEm!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description:
      'Motivo da recusa que levou ao status atual. Sempre `null` quando o status não é `RECUSADO`.',
  })
  motivoRecusa!: string | null;
}

export class PaginaMoradoresDto implements PaginaMoradores {
  @ApiProperty({ type: [MoradorAdminDto] })
  itens!: MoradorAdminDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Envie em `cursor` para buscar a próxima página ("Carregar mais"). `null` quando não há mais itens.',
  })
  proximoCursor!: string | null;
}

export class ContagemMoradoresDto implements ContagemMoradores {
  @ApiProperty({ example: 3 })
  pendentes!: number;

  @ApiProperty({ example: 120 })
  ativos!: number;

  @ApiProperty({ example: 2 })
  recusados!: number;

  @ApiProperty({ example: 5 })
  inativos!: number;
}
