import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { REGRAS_SLUG } from '@ocorrencias/contratos';
import { Publico } from '../../../core/auth/decoradores.js';
import { ErroApiDto } from '../../../core/http/erro-api.js';
import {
  CadastrarCondominioDto,
  CondominioCriadoDto,
  CondominioPublicoDto,
} from '../dto/condominio-publico.dto.js';
import { CondominiosPublicoService } from './condominios-publico.service.js';

@ApiTags('Condomínios (público)')
@Publico()
@Controller('public/condominios')
export class CondominiosPublicoController {
  constructor(private readonly servico: CondominiosPublicoService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Autocadastro do condomínio e do síndico',
    description:
      'Cria o condomínio ATIVO e o síndico ATIVO numa transação. Rota pública, sem autenticação. ' +
      'O telefone é normalizado para E.164. O 409 `SLUG_EM_USO` é a fonte da verdade sobre o endereço: ' +
      'a consulta por `GET /public/condominios/{slug}` serve só de ajuda no formulário.',
  })
  @ApiCreatedResponse({
    description: 'Condomínio criado. Não devolve nenhum dado de senha.',
    type: CondominioCriadoDto,
  })
  @ApiBadRequestResponse({
    description:
      'Dados inválidos. `code` = `VALIDACAO_FALHOU`; `details` lista `{ campo, erros[] }` (campo aninhado como `sindico.telefone`).',
    type: ErroApiDto,
    example: {
      statusCode: 400,
      code: 'VALIDACAO_FALHOU',
      message: 'Os dados enviados são inválidos.',
      details: [
        {
          campo: 'sindico.telefone',
          erros: ['Informe um celular com DDD, como (11) 91234-5678.'],
        },
      ],
    },
  })
  @ApiConflictResponse({
    description: 'O endereço (slug) já está em uso. `code` = `SLUG_EM_USO`.',
    type: ErroApiDto,
    example: {
      statusCode: 409,
      code: 'SLUG_EM_USO',
      message: 'Endereço já em uso. Tente outro.',
      details: { campo: 'slug' },
    },
  })
  cadastrar(@Body() dto: CadastrarCondominioDto): Promise<CondominioCriadoDto> {
    return this.servico.cadastrar(dto);
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Dados públicos do condomínio pelo endereço',
    description:
      'Usado pela página `/c/:slug` e pela verificação de endereço disponível no autocadastro (404 = disponível). ' +
      'Condomínio inexistente, inativo ou slug fora do formato respondem o mesmo 404.',
  })
  @ApiParam({
    name: 'slug',
    example: 'jardim-das-flores',
    description: `${REGRAS_SLUG.min} a ${REGRAS_SLUG.max} caracteres: a-z, 0-9 e hífen.`,
  })
  @ApiOkResponse({ type: CondominioPublicoDto })
  @ApiNotFoundResponse({
    description: '`code` = `CONDOMINIO_NAO_ENCONTRADO`.',
    type: ErroApiDto,
    example: {
      statusCode: 404,
      code: 'CONDOMINIO_NAO_ENCONTRADO',
      message: 'Condomínio não encontrado.',
    },
  })
  async buscar(@Param('slug') slug: string): Promise<CondominioPublicoDto> {
    const { nome, slug: slugEncontrado } =
      await this.servico.buscarAtivoPorSlug(slug);
    return { nome, slug: slugEncontrado };
  }
}
