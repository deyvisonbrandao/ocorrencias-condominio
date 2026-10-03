import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { REGRAS_SLUG } from '@ocorrencias/contratos';
import { Publico } from '../../../core/auth/decoradores.js';
import { ErroApiDto } from '../../../core/http/erro-api.js';
import { LimiteCadastroPublicoInterceptor } from '../../../core/http/limite-cadastro-publico.interceptor.js';
import {
  CadastrarMoradorDto,
  MoradorCadastradoDto,
} from '../dto/cadastro-morador.dto.js';
import { CadastroMoradorService } from './cadastro-morador.service.js';

@ApiTags('Cadastro do morador (público)')
@Publico()
@Controller('public/condominios')
export class CadastroMoradorController {
  constructor(private readonly servico: CadastroMoradorService) {}

  @Post(':slug/moradores')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(LimiteCadastroPublicoInterceptor)
  @ApiOperation({
    summary: 'Cadastro do morador pelo link do condomínio',
    description:
      'Cria o morador com status PENDENTE: ele só entra depois da aprovação da administração. Rota pública, sem autenticação. ' +
      'O telefone é normalizado para E.164; bloco e apto são normalizados (ver os campos). ' +
      'Se o telefone pertence a um cadastro RECUSADO deste condomínio, o mesmo registro volta a PENDENTE com os dados e a senha novos; ' +
      'a resposta é igual à de um cadastro novo. O mesmo telefone em outro condomínio é um cadastro independente.',
  })
  @ApiParam({
    name: 'slug',
    example: 'jardim-das-flores',
    description: `${REGRAS_SLUG.min} a ${REGRAS_SLUG.max} caracteres: a-z, 0-9 e hífen.`,
  })
  @ApiCreatedResponse({
    description: 'Cadastro enviado para aprovação. Não abre sessão.',
    type: MoradorCadastradoDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos. `code` = `VALIDACAO_FALHOU`; `details` lista `{ campo, erros[] }`.',
    type: ErroApiDto,
    example: {
      statusCode: 400,
      code: 'VALIDACAO_FALHOU',
      message: 'Os dados enviados são inválidos.',
      details: [{ campo: 'bloco', erros: ['Informe o bloco.'] }],
    },
  })
  @ApiNotFoundResponse({
    description:
      'Condomínio inexistente, inativo ou slug fora do formato. `code` = `CONDOMINIO_NAO_ENCONTRADO`.',
    type: ErroApiDto,
    example: {
      statusCode: 404,
      code: 'CONDOMINIO_NAO_ENCONTRADO',
      message: 'Condomínio não encontrado.',
    },
  })
  @ApiConflictResponse({
    description:
      'O telefone já tem cadastro PENDENTE, ATIVO ou INATIVO neste condomínio (ou é de um admin). `code` = `TELEFONE_EM_USO`.',
    type: ErroApiDto,
    example: {
      statusCode: 409,
      code: 'TELEFONE_EM_USO',
      message: 'Este telefone já tem cadastro neste condomínio.',
      details: { campo: 'telefone' },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description:
      'Limite de cadastros por IP ou de cadastros simultâneos atingido. `code` = `MUITAS_REQUISICOES`.',
    type: ErroApiDto,
    example: {
      statusCode: 429,
      code: 'MUITAS_REQUISICOES',
      message: 'Muitas requisições. Tente de novo em instantes.',
    },
  })
  cadastrar(
    @Param('slug') slug: string,
    @Body() dto: CadastrarMoradorDto,
  ): Promise<MoradorCadastradoDto> {
    return this.servico.cadastrar(slug, dto);
  }
}
