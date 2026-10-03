import { Controller, Get, Header } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import type { CondominioPublico, PainelAdmin } from '@ocorrencias/contratos';
import { ApiSessao, Papeis } from '../../core/auth/decoradores.js';
import { PainelService } from './painel.service.js';

export class CondominioDoPainelDto implements CondominioPublico {
  @ApiProperty({ example: 'Residencial Jardim das Flores' })
  nome!: string;

  @ApiProperty({ example: 'jardim-das-flores' })
  slug!: string;
}

export class PainelAdminDto implements PainelAdmin {
  @ApiProperty({ type: CondominioDoPainelDto })
  condominio!: CondominioDoPainelDto;
}

@ApiTags('Admin')
@ApiSessao()
@Papeis('SINDICO', 'SUBSINDICO')
@Controller('admin/painel')
export class PainelController {
  constructor(private readonly servico: PainelService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Resumo do painel do síndico e do subsíndico',
    description:
      'Por enquanto só identifica o condomínio da sessão; os indicadores entram na issue #12.',
  })
  @ApiOkResponse({ type: PainelAdminDto })
  resumo(): Promise<PainelAdminDto> {
    return this.servico.resumo();
  }
}
