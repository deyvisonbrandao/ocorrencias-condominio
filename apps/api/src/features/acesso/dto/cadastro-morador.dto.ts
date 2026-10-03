import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type CadastrarMoradorRequisicao,
  type MoradorCadastrado,
  REGRAS_APTO,
  REGRAS_BLOCO,
  REGRAS_EMAIL,
  REGRAS_NOME_PESSOA,
  REGRAS_SENHA,
  StatusUsuario,
} from '@ocorrencias/contratos';
import {
  AptoObrigatorio,
  BlocoObrigatorio,
  CelularBr,
  EmailOpcional,
  SenhaNova,
  TextoObrigatorio,
} from '../../../shared/validators/campos-pessoa.js';
import { CondominioDaSessaoDto } from './usuario-sessao.dto.js';

export class CadastrarMoradorDto implements CadastrarMoradorRequisicao {
  @ApiProperty({ example: 'João Pereira', maxLength: REGRAS_NOME_PESSOA.max })
  @TextoObrigatorio(REGRAS_NOME_PESSOA.max, 'Informe seu nome.')
  nome!: string;

  @ApiProperty({
    example: '(11) 98765-4321',
    description:
      'Celular brasileiro com DDD, em qualquer formatação (com ou sem +55). A API grava em E.164, por exemplo `+5511987654321`.',
  })
  @CelularBr()
  telefone!: string;

  @ApiProperty({
    example: 'Bloco B',
    maxLength: REGRAS_BLOCO.max,
    description:
      'Normalizado antes de validar: espaços repetidos viram um, o prefixo "Bloco"/"Bl." sai e o texto vai para maiúsculas ("Bloco b" → "B", "Torre 2" → "TORRE 2"). O limite vale para o valor normalizado.',
  })
  @BlocoObrigatorio()
  bloco!: string;

  @ApiProperty({
    example: 'Apto 302',
    maxLength: REGRAS_APTO.max,
    description:
      'Normalizado como o bloco, com o prefixo "Apartamento"/"Apto"/"Apt"/"Ap" ("apto 302a" → "302A"). O limite vale para o valor normalizado.',
  })
  @AptoObrigatorio()
  apto!: string;

  @ApiPropertyOptional({
    example: 'joao@exemplo.com',
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

export class MoradorCadastradoDto implements MoradorCadastrado {
  @ApiProperty({ example: 'João Pereira' })
  nome!: string;

  @ApiProperty({
    enum: [StatusUsuario.PENDENTE],
    example: StatusUsuario.PENDENTE,
    description:
      'Sempre `PENDENTE`: o acesso depende da aprovação da administração.',
  })
  status!: typeof StatusUsuario.PENDENTE;

  @ApiProperty({ type: CondominioDaSessaoDto })
  condominio!: CondominioDaSessaoDto;
}
