import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Publico } from '../../core/auth/decoradores.js';
import {
  SessaoJwt,
  VALIDADE_SESSAO_SEGUNDOS,
} from '../../core/auth/sessao-jwt.js';
import { ErroApiDto } from '../../core/http/erro-api.js';
import { NOME_COOKIE_SESSAO } from '../../core/http/swagger.js';
import { UsuarioSessaoDto } from './dto/usuario-sessao.dto.js';
import { LoginDto } from './login/login.dto.js';
import { LoginService } from './login/login.service.js';

const DIAS_SESSAO = VALIDADE_SESSAO_SEGUNDOS / 86_400;

@ApiTags('Sessão')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginService,
    private readonly sessao: SessaoJwt,
  ) {}

  @Post('login')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Entrar com telefone e senha no condomínio do slug',
    description:
      `Define o cookie httpOnly \`${NOME_COOKIE_SESSAO}\` (SameSite=Lax, Secure em produção, Path=/), com JWT válido por ${DIAS_SESSAO} dias. ` +
      'Condomínio inexistente, telefone inexistente e senha errada respondem o mesmo 401. ' +
      'Os 403 de status só aparecem quando a senha confere.',
  })
  @ApiOkResponse({
    description: 'Sessão aberta. Nunca devolve hash nem token no corpo.',
    type: UsuarioSessaoDto,
  })
  @ApiBadRequestResponse({
    description: 'Campo ausente ou fora do tipo. `code` = `VALIDACAO_FALHOU`.',
    type: ErroApiDto,
  })
  @ApiUnauthorizedResponse({
    description: '`code` = `CREDENCIAIS_INVALIDAS`.',
    type: ErroApiDto,
    example: {
      statusCode: 401,
      code: 'CREDENCIAIS_INVALIDAS',
      message: 'Telefone ou senha inválidos.',
    },
  })
  @ApiForbiddenResponse({
    description:
      'Senha correta, mas o cadastro não está ATIVO. `code` = `CADASTRO_PENDENTE`, `CADASTRO_RECUSADO` ou `ACESSO_INATIVO`.',
    type: ErroApiDto,
    example: {
      statusCode: 403,
      code: 'CADASTRO_PENDENTE',
      message: 'Seu cadastro ainda aguarda aprovação da administração.',
    },
  })
  async entrar(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<UsuarioSessaoDto> {
    const { claims, usuario } = await this.login.autenticar(dto);
    this.sessao.abrir(resposta, claims);
    return usuario;
  }

  @Post('logout')
  @Publico()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Sair',
    description:
      'Apaga o cookie de sessão. Idempotente: responde 204 com ou sem sessão.',
  })
  @ApiNoContentResponse({ description: 'Cookie apagado.' })
  sair(@Res({ passthrough: true }) resposta: Response): void {
    this.sessao.encerrar(resposta);
  }
}
