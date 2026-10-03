import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CodigoErroCondominio,
  type CondominioCriado,
  type CondominioPublico,
  slugValido,
} from '@ocorrencias/contratos';
import { gerarHashSenha } from '../../../core/auth/senha.js';
import { ErroApi } from '../../../core/http/erro-api.js';
import { violouIndiceUnico } from '../../../core/prisma/erros-prisma.js';
import { PrismaSistema } from '../../../core/prisma/prisma-sistema.js';
import { ContextoTenant } from '../../../core/tenancy/contexto-tenant.js';
import type { CadastrarCondominioDto } from '../dto/condominio-publico.dto.js';

export const INDICE_SLUG = 'condominio_slug_key';
export const SLOT_SINDICO = 1;

function naoEncontrado(): ErroApi {
  return new ErroApi(
    HttpStatus.NOT_FOUND,
    CodigoErroCondominio.CONDOMINIO_NAO_ENCONTRADO,
    'Condomínio não encontrado.',
  );
}

@Injectable()
export class CondominiosPublicoService {
  constructor(private readonly sistema: PrismaSistema) {}

  async cadastrar(dto: CadastrarCondominioDto): Promise<CondominioCriado> {
    const senhaHash = await gerarHashSenha(dto.sindico.senha);

    try {
      return await this.sistema.$transaction(async (tx) => {
        const condominio = await tx.condominio.create({
          data: { nome: dto.nome, slug: dto.slug, status: 'ATIVO' },
          select: { id: true, nome: true, slug: true },
        });
        await tx.usuario.create({
          data: {
            condominioId: condominio.id,
            nome: dto.sindico.nome,
            telefone: dto.sindico.telefone,
            email: dto.sindico.email ?? null,
            senhaHash,
            papel: 'SINDICO',
            status: 'ATIVO',
            slotAdmin: SLOT_SINDICO,
          },
          select: { id: true },
        });
        return condominio;
      });
    } catch (erro) {
      if (violouIndiceUnico(erro, INDICE_SLUG)) {
        throw new ErroApi(
          HttpStatus.CONFLICT,
          CodigoErroCondominio.SLUG_EM_USO,
          'Endereço já em uso. Tente outro.',
          { campo: 'slug' },
        );
      }
      throw erro;
    }
  }

  async buscarAtivoPorSlug(
    slug: string,
  ): Promise<CondominioPublico & { id: string }> {
    if (!slugValido(slug)) {
      throw naoEncontrado();
    }
    const condominio = await this.sistema.condominio.findUnique({
      where: { slug },
      select: { id: true, nome: true, slug: true, status: true },
    });
    if (!condominio || condominio.status !== 'ATIVO') {
      throw naoEncontrado();
    }
    return { id: condominio.id, nome: condominio.nome, slug: condominio.slug };
  }

  async slugDisponivel(slug: string): Promise<{ disponivel: boolean }> {
    if (!slugValido(slug)) {
      return { disponivel: false };
    }
    const condominio = await this.sistema.condominio.findUnique({
      where: { slug },
      select: { id: true },
    });
    return { disponivel: !condominio };
  }

  async executarNoCondominio<T>(
    slug: string,
    bloco: (condominio: CondominioPublico & { id: string }) => Promise<T>,
  ): Promise<T> {
    const condominio = await this.buscarAtivoPorSlug(slug);
    return ContextoTenant.executar(condominio.id, () => bloco(condominio));
  }
}
