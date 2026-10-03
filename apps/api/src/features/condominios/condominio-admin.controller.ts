import { Body, Controller, Get, Header, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiSessao,
  Papeis,
  UsuarioAtual,
} from '../../core/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../core/auth/usuario-autenticado.js';
import { ErroApiDto } from '../../core/http/erro-api.js';
import { CondominioAdminService } from './condominio-admin.service.js';
import {
  AtualizarCondominioDto,
  CondominioAdminDto,
  MENSAGEM_SLUG_IMUTAVEL,
} from './dto/condominio-admin.dto.js';

@ApiTags('Admin')
@ApiSessao()
@Controller('admin/condominio')
export class CondominioAdminController {
  constructor(private readonly servico: CondominioAdminService) {}

  @Get()
  @Papeis('SINDICO', 'SUBSINDICO')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Dados do condomínio da sessão',
    description:
      'Síndico e subsíndico. O condomínio vem da sessão. A URL pública do link e do QR (`/c/:slug`) é montada pelo web com a origem do próprio ambiente.',
  })
  @ApiOkResponse({ type: CondominioAdminDto })
  obter(): Promise<CondominioAdminDto> {
    return this.servico.obter();
  }

  @Put()
  @Papeis('SINDICO')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Edita nome, cidade e UF do condomínio da sessão',
    description:
      'Só o síndico. Substitui os três campos (todos obrigatórios) e devolve os dados atualizados. ' +
      'O slug não é editável: enviá-lo responde 400 `VALIDACAO_FALHOU` no campo `slug`. ' +
      'Quando algo muda, grava `CONDOMINIO_ATUALIZADO` na auditoria com o de/para; reenviar os mesmos dados não grava nada.',
  })
  @ApiOkResponse({ type: CondominioAdminDto })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos ou slug enviado. `code` = `VALIDACAO_FALHOU`; `details` lista `{ campo, erros[] }`.',
    type: ErroApiDto,
    example: {
      statusCode: 400,
      code: 'VALIDACAO_FALHOU',
      message: 'Os dados enviados são inválidos.',
      details: [
        { campo: 'uf', erros: ['Escolha a UF.'] },
        { campo: 'slug', erros: [MENSAGEM_SLUG_IMUTAVEL] },
      ],
    },
  })
  atualizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarCondominioDto,
  ): Promise<CondominioAdminDto> {
    return this.servico.atualizar(usuario.id, dto);
  }
}
