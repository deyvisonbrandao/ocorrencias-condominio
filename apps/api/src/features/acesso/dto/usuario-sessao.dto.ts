import { ApiProperty } from '@nestjs/swagger';
import {
  type CondominioPublico,
  Papel,
  StatusUsuario,
  type UsuarioSessao,
} from '@ocorrencias/contratos';

export class CondominioDaSessaoDto implements CondominioPublico {
  @ApiProperty({ example: 'Residencial Jardim das Flores' })
  nome!: string;

  @ApiProperty({ example: 'jardim-das-flores' })
  slug!: string;
}

export class UsuarioSessaoDto implements UsuarioSessao {
  @ApiProperty({ example: 'Maria Souza' })
  nome!: string;

  @ApiProperty({ example: '+5511912345678', description: 'E.164.' })
  telefone!: string;

  @ApiProperty({ enum: Papel, example: Papel.SINDICO })
  papel!: Papel;

  @ApiProperty({
    enum: StatusUsuario,
    example: StatusUsuario.ATIVO,
    description: 'Numa sessão válida é sempre `ATIVO`.',
  })
  status!: StatusUsuario;

  @ApiProperty({
    example: false,
    description:
      'Entrou com senha temporária: o web leva para `/trocar-senha` antes de qualquer outra tela.',
  })
  senhaTemporaria!: boolean;

  @ApiProperty({ type: CondominioDaSessaoDto })
  condominio!: CondominioDaSessaoDto;
}
