import { Injectable } from '@nestjs/common';
import { LimiteCadastroPublicoInterceptor } from '../../../core/http/limite-cadastro-publico.interceptor.js';

// Números e motivos na ADR-002 (issue #7): o cadastro do morador chega em rajada, do mesmo IP, por condomínio.
export const LIMITES_CADASTRO_MORADOR = {
  janelaMs: 15 * 60 * 1000,
  maxTentativasPorIp: 200,
  maxSimultaneos: 16,
  maxSimultaneosPorCondominio: 4,
  retryAfterConcorrenciaSegundos: 2,
} as const;

@Injectable()
export class LimiteCadastroMoradorInterceptor extends LimiteCadastroPublicoInterceptor {
  constructor() {
    super({
      janelaMs: LIMITES_CADASTRO_MORADOR.janelaMs,
      maxTentativasPorIp: LIMITES_CADASTRO_MORADOR.maxTentativasPorIp,
      maxSimultaneos: LIMITES_CADASTRO_MORADOR.maxSimultaneos,
      retryAfterConcorrenciaSegundos:
        LIMITES_CADASTRO_MORADOR.retryAfterConcorrenciaSegundos,
      porParticao: {
        maxSimultaneos: LIMITES_CADASTRO_MORADOR.maxSimultaneosPorCondominio,
        chave: (requisicao) => String(requisicao.params['slug']).toLowerCase(),
      },
    });
  }
}
