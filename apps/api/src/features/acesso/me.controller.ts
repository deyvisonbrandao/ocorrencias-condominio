import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSessao, UsuarioAtual } from '../../core/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../core/auth/usuario-autenticado.js';
import { UsuarioSessaoDto } from './dto/usuario-sessao.dto.js';
import { MeService } from './me.service.js';

@ApiTags('Sessão')
@ApiSessao()
@Controller('me')
export class MeController {
  constructor(private readonly servico: MeService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Usuário da sessão atual',
    description:
      'Usado pelo web para restaurar a sessão ao abrir o app e decidir a área (admin ou morador).',
  })
  @ApiOkResponse({ type: UsuarioSessaoDto })
  obter(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioSessaoDto> {
    return this.servico.obter(usuario.id);
  }
}
