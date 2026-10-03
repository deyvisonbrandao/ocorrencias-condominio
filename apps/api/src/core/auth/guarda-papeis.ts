import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CodigoErroSessao, type Papel } from '@ocorrencias/contratos';
import { ErroApi } from '../http/erro-api.js';
import {
  CHAVE_PAPEIS,
  type RequisicaoAutenticada,
} from './usuario-autenticado.js';

export function acessoNegado(): ErroApi {
  return new ErroApi(
    HttpStatus.FORBIDDEN,
    CodigoErroSessao.ACESSO_NEGADO,
    'Você não tem acesso a essa página.',
  );
}

@Injectable()
export class GuardaPapeis implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<Papel[] | undefined>(
      CHAVE_PAPEIS,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!permitidos) {
      return true;
    }
    const usuario = contexto
      .switchToHttp()
      .getRequest<RequisicaoAutenticada>().usuario;
    if (!usuario || !permitidos.includes(usuario.papel)) {
      throw acessoNegado();
    }
    return true;
  }
}
