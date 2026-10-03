import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Papel } from '@ocorrencias/contratos';
import { ErroApiDto } from '../http/erro-api.js';
import { ESQUEMA_AUTH_COOKIE } from '../http/swagger.js';
import { GuardaPapeis } from './guarda-papeis.js';
import {
  CHAVE_PAPEIS,
  CHAVE_PUBLICO,
  type RequisicaoAutenticada,
  type UsuarioAutenticado,
} from './usuario-autenticado.js';

export const Publico = (): MethodDecorator & ClassDecorator =>
  SetMetadata(CHAVE_PUBLICO, true);

export const ApiSessao = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiCookieAuth(ESQUEMA_AUTH_COOKIE),
    ApiUnauthorizedResponse({
      description:
        'Sem sessão, sessão expirada ou revogada (usuário não ATIVO ou `versao_sessao` alterada). `code` = `NAO_AUTENTICADO`; o cookie é apagado.',
      type: ErroApiDto,
      example: {
        statusCode: 401,
        code: 'NAO_AUTENTICADO',
        message: 'Sua sessão terminou. Entre de novo.',
      },
    }),
  );

export const Papeis = (
  ...papeis: [Papel, ...Papel[]]
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(CHAVE_PAPEIS, papeis),
    UseGuards(GuardaPapeis),
    ApiForbiddenResponse({
      description: `Papel sem acesso (permitidos: ${papeis.join(', ')}). \`code\` = \`ACESSO_NEGADO\`.`,
      type: ErroApiDto,
      example: {
        statusCode: 403,
        code: 'ACESSO_NEGADO',
        message: 'Você não tem acesso a essa página.',
      },
    }),
  );

export const UsuarioAtual = createParamDecorator(
  (_: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const usuario = contexto
      .switchToHttp()
      .getRequest<RequisicaoAutenticada>().usuario;
    if (!usuario) {
      throw new Error('@UsuarioAtual() usado em rota sem autenticação');
    }
    return usuario;
  },
);
