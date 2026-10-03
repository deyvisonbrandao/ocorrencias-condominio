import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CodigoErroCadastroMorador,
  type CondominioPublico,
  type MoradorCadastrado,
} from '@ocorrencias/contratos';
import { gerarHashSenha } from '../../../core/auth/senha.js';
import { ErroApi } from '../../../core/http/erro-api.js';
import { violouIndiceUnico } from '../../../core/prisma/erros-prisma.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../../../core/prisma/prisma-escopado.js';
import { CondominiosPublicoService } from '../../condominios/publico/condominios-publico.service.js';
import type { CadastrarMoradorDto } from '../dto/cadastro-morador.dto.js';

export const INDICE_TELEFONE = 'usuario_condominio_id_telefone_key';

export function telefoneEmUso(): ErroApi {
  return new ErroApi(
    HttpStatus.CONFLICT,
    CodigoErroCadastroMorador.TELEFONE_EM_USO,
    'Este telefone já tem cadastro neste condomínio.',
    { campo: 'telefone' },
  );
}

type DadosDoCadastro = Pick<CadastrarMoradorDto, 'nome' | 'bloco' | 'apto'> & {
  email: string | null;
  senhaHash: string;
};

// Ponto único da reabertura: tudo o que um cadastro RECUSADO precisa limpar ao voltar a PENDENTE fica aqui.
export function dadosDaReabertura(dados: DadosDoCadastro) {
  return {
    ...dados,
    status: 'PENDENTE' as const,
    senhaTemporaria: false,
    versaoSessao: { increment: 1 },
  };
}

@Injectable()
export class CadastroMoradorService {
  constructor(
    private readonly condominios: CondominiosPublicoService,
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  cadastrar(
    slug: string,
    dto: CadastrarMoradorDto,
  ): Promise<MoradorCadastrado> {
    return this.condominios.executarNoCondominio(slug, async (condominio) => {
      try {
        await this.gravar(condominio.id, dto);
      } catch (erro) {
        if (violouIndiceUnico(erro, INDICE_TELEFONE)) {
          throw telefoneEmUso();
        }
        throw erro;
      }
      return {
        nome: dto.nome,
        status: 'PENDENTE',
        condominio: publico(condominio),
      };
    });
  }

  private async gravar(
    condominioId: string,
    dto: CadastrarMoradorDto,
  ): Promise<void> {
    const existente = await this.prisma.usuario.findUnique({
      where: {
        condominioId_telefone: { condominioId, telefone: dto.telefone },
      },
      select: { id: true, papel: true, status: true },
    });
    if (
      existente &&
      (existente.status !== 'RECUSADO' || existente.papel !== 'MORADOR')
    ) {
      throw telefoneEmUso();
    }

    const dados: DadosDoCadastro = {
      nome: dto.nome,
      bloco: dto.bloco,
      apto: dto.apto,
      email: dto.email ?? null,
      senhaHash: await gerarHashSenha(dto.senha),
    };

    if (!existente) {
      await this.prisma.usuario.create({
        data: {
          ...dados,
          condominioId,
          telefone: dto.telefone,
          papel: 'MORADOR',
          status: 'PENDENTE',
        },
        select: { id: true },
      });
      return;
    }

    // Condicional ao status: se a administração mexeu no registro entre a leitura e a escrita, nada é sobrescrito.
    const { count } = await this.prisma.usuario.updateMany({
      where: { id: existente.id, papel: 'MORADOR', status: 'RECUSADO' },
      data: dadosDaReabertura(dados),
    });
    if (count === 0) {
      throw telefoneEmUso();
    }
  }
}

function publico({ nome, slug }: CondominioPublico): CondominioPublico {
  return { nome, slug };
}
