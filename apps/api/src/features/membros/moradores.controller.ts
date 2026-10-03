import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AcaoMorador,
  CodigoErroMorador,
  CodigoErroPaginacao,
  TRANSICOES_MORADOR,
} from '@ocorrencias/contratos';
import {
  ApiSessao,
  Papeis,
  UsuarioAtual,
} from '../../core/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../core/auth/usuario-autenticado.js';
import { ErroApiDto } from '../../core/http/erro-api.js';
import {
  ContagemMoradoresDto,
  ListarMoradoresDto,
  MoradorAdminDto,
  PaginaMoradoresDto,
  RecusarMoradorDto,
} from './dto/moradores.dto.js';
import { MoradoresService } from './moradores.service.js';

function ApiTransicao(
  acao: AcaoMorador,
  resumo: string,
  detalhe: string,
): MethodDecorator {
  const { de, para } = TRANSICOES_MORADOR[acao];
  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({
      summary: resumo,
      description: `Transição \`${de}\` → \`${para}\`. ${detalhe} Gera um registro em \`auditoria_admin\`.`,
    }),
    ApiParam({ name: 'id', description: 'Id do morador.' }),
    ApiOkResponse({
      type: MoradorAdminDto,
      description: 'Morador já no novo status.',
    }),
    ApiNotFoundResponse({
      description:
        'Id inexistente, de outro condomínio ou de quem não é morador (síndico e subsíndico ficam em Equipe). `code` = `MORADOR_NAO_ENCONTRADO`.',
      type: ErroApiDto,
      example: {
        statusCode: 404,
        code: CodigoErroMorador.MORADOR_NAO_ENCONTRADO,
        message: 'Morador não encontrado.',
      },
    }),
    ApiConflictResponse({
      description: `O morador não está em \`${de}\` (outra pessoa já agiu, ou o status mudou). \`code\` = \`TRANSICAO_MORADOR_INVALIDA\`; \`details.statusAtual\` traz o status atual. Reenviar uma ação que já deu certo também cai aqui, com \`statusAtual\` = \`${para}\`.`,
      type: ErroApiDto,
      example: {
        statusCode: 409,
        code: CodigoErroMorador.TRANSICAO_MORADOR_INVALIDA,
        message:
          'Esta ação não está mais disponível para este morador. Recarregue para ver o status atual.',
        details: { statusAtual: para },
      },
    }),
  );
}

@ApiTags('Admin — moradores')
@ApiSessao()
@Papeis('SINDICO', 'SUBSINDICO')
@Controller('admin/moradores')
export class MoradoresController {
  constructor(private readonly servico: MoradoresService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Lista os moradores do condomínio',
    description:
      'Só papel `MORADOR`: síndico e subsíndico aparecem apenas em Equipe. Ordem: pedido de cadastro mais recente primeiro (o recadastro de um recusado conta como pedido novo). ' +
      'Abas da UI: Pendentes = `status=PENDENTE`; Ativos = `status=ATIVO`; Recusados e inativos = `status=RECUSADO,INATIVO`.',
  })
  @ApiOkResponse({ type: PaginaMoradoresDto })
  @ApiBadRequestResponse({
    description:
      'Filtro inválido (`VALIDACAO_FALHOU`, com `details`) ou cursor inválido (`CURSOR_INVALIDO`).',
    type: ErroApiDto,
    example: {
      statusCode: 400,
      code: CodigoErroPaginacao.CURSOR_INVALIDO,
      message: 'A lista mudou. Recarregue para ver os moradores.',
    },
  })
  listar(@Query() consulta: ListarMoradoresDto): Promise<PaginaMoradoresDto> {
    return this.servico.listar(consulta);
  }

  @Get('contagem')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Quantidade de moradores por status',
    description:
      'Alimenta o contador de pendentes do menu e das abas. Só papel `MORADOR`.',
  })
  @ApiOkResponse({ type: ContagemMoradoresDto })
  contar(): Promise<ContagemMoradoresDto> {
    return this.servico.contar();
  }

  @Post(':id/aprovar')
  @ApiTransicao(
    'aprovar',
    'Aprova o cadastro de um morador',
    'O morador passa a conseguir entrar.',
  )
  aprovar(
    @Param('id') id: string,
    @UsuarioAtual() ator: UsuarioAutenticado,
  ): Promise<MoradorAdminDto> {
    return this.servico.transicionar('aprovar', id, ator);
  }

  @Post(':id/recusar')
  @ApiTransicao(
    'recusar',
    'Recusa o cadastro de um morador',
    'Exige motivo, guardado na auditoria e exibido em `motivoRecusa` enquanto o status for `RECUSADO`.',
  )
  @ApiBadRequestResponse({
    description: 'Motivo ausente ou longo demais. `code` = `VALIDACAO_FALHOU`.',
    type: ErroApiDto,
    example: {
      statusCode: 400,
      code: 'VALIDACAO_FALHOU',
      message: 'Os dados enviados são inválidos.',
      details: [{ campo: 'motivo', erros: ['Informe o motivo.'] }],
    },
  })
  recusar(
    @Param('id') id: string,
    @Body() dto: RecusarMoradorDto,
    @UsuarioAtual() ator: UsuarioAutenticado,
  ): Promise<MoradorAdminDto> {
    return this.servico.transicionar('recusar', id, ator, dto.motivo);
  }

  @Post(':id/inativar')
  @ApiTransicao(
    'inativar',
    'Inativa um morador',
    'Incrementa `versao_sessao`: a sessão aberta do morador cai na próxima requisição.',
  )
  inativar(
    @Param('id') id: string,
    @UsuarioAtual() ator: UsuarioAutenticado,
  ): Promise<MoradorAdminDto> {
    return this.servico.transicionar('inativar', id, ator);
  }

  @Post(':id/reativar')
  @ApiTransicao(
    'reativar',
    'Reativa um morador inativo',
    'O morador volta a conseguir entrar, com a mesma senha.',
  )
  reativar(
    @Param('id') id: string,
    @UsuarioAtual() ator: UsuarioAutenticado,
  ): Promise<MoradorAdminDto> {
    return this.servico.transicionar('reativar', id, ator);
  }
}
