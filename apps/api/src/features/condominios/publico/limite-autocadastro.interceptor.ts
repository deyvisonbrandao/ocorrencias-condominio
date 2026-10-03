import { Injectable } from '@nestjs/common';
import { LimiteCadastroPublicoInterceptor } from '../../../core/http/limite-cadastro-publico.interceptor.js';

@Injectable()
export class LimiteAutocadastroInterceptor extends LimiteCadastroPublicoInterceptor {
  constructor() {
    super({
      janelaMs: 15 * 60 * 1000,
      maxTentativasPorIp: 30,
      maxSimultaneos: 2,
      retryAfterConcorrenciaSegundos: 2,
    });
  }
}
