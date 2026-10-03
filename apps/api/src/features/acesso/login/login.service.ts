import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  CodigoErroCondominio,
  CodigoErroSessao,
  normalizarCelularBr,
  type UsuarioSessao,
} from '@ocorrencias/contratos';
import type { ClaimsSessao } from '../../../core/auth/jwt.js';
import { gerarHashSenha, verificarSenha } from '../../../core/auth/senha.js';
import { ErroApi } from '../../../core/http/erro-api.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../../core/prisma/prisma-escopado.js';
import { ContextoTenant } from '../../../core/tenancy/contexto-tenant.js';
import { CondominiosPublicoService } from '../../condominios/publico/condominios-publico.service.js';
import type { LoginDto } from './login.dto.js';

export interface LoginAceito {
  claims: ClaimsSessao;
  usuario: UsuarioSessao;
}

export function credenciaisInvalidas(): ErroApi {
  return new ErroApi(
    HttpStatus.UNAUTHORIZED,
    CodigoErroSessao.CREDENCIAIS_INVALIDAS,
    'Telefone ou senha inválidos.',
  );
}

const ERRO_POR_STATUS = {
  PENDENTE: [
    CodigoErroSessao.CADASTRO_PENDENTE,
    'Seu cadastro ainda aguarda aprovação da administração.',
  ],
  RECUSADO: [
    CodigoErroSessao.CADASTRO_RECUSADO,
    'Seu cadastro não foi aprovado. Fale com a administração do condomínio.',
  ],
  INATIVO: [
    CodigoErroSessao.ACESSO_INATIVO,
    'Seu acesso está desativado. Fale com a administração do condomínio.',
  ],
} as const;

@Injectable()
export class LoginService implements OnModuleInit {
  private hashFicticio!: string;

  constructor(
    private readonly condominios: CondominiosPublicoService,
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  // Hash gerado com os mesmos parâmetros do real: telefone ou condomínio inexistente custa o mesmo argon2 de uma senha errada.
  async onModuleInit(): Promise<void> {
    this.hashFicticio = await gerarHashSenha(
      randomBytes(32).toString('base64url'),
    );
  }

  async autenticar(dto: LoginDto): Promise<LoginAceito> {
    const condominio = await this.buscarCondominio(dto.slug);
    const telefone = normalizarCelularBr(dto.telefone);
    const usuario =
      condominio && telefone
        ? await ContextoTenant.executar(condominio.id, () =>
            this.prisma.usuario.findUnique({
              where: {
                condominioId_telefone: {
                  condominioId: condominio.id,
                  telefone,
                },
              },
              select: {
                id: true,
                nome: true,
                telefone: true,
                senhaHash: true,
                papel: true,
                status: true,
                senhaTemporaria: true,
                versaoSessao: true,
              },
            }),
          )
        : null;

    const senhaConfere = await verificarSenha(
      usuario?.senhaHash ?? this.hashFicticio,
      dto.senha,
    );
    if (!condominio || !usuario || !senhaConfere) {
      throw credenciaisInvalidas();
    }

    if (usuario.status !== 'ATIVO') {
      const [codigo, mensagem] = ERRO_POR_STATUS[usuario.status];
      throw new ErroApi(HttpStatus.FORBIDDEN, codigo, mensagem);
    }

    return {
      claims: {
        sub: usuario.id,
        cid: condominio.id,
        papel: usuario.papel,
        sv: usuario.versaoSessao,
      },
      usuario: {
        nome: usuario.nome,
        telefone: usuario.telefone,
        papel: usuario.papel,
        status: usuario.status,
        senhaTemporaria: usuario.senhaTemporaria,
        condominio: { nome: condominio.nome, slug: condominio.slug },
      },
    };
  }

  private async buscarCondominio(slug: string) {
    try {
      return await this.condominios.buscarAtivoPorSlug(slug);
    } catch (erro) {
      if (
        erro instanceof ErroApi &&
        (erro.getResponse() as { code?: string }).code ===
          CodigoErroCondominio.CONDOMINIO_NAO_ENCONTRADO
      ) {
        return null;
      }
      throw erro;
    }
  }
}
