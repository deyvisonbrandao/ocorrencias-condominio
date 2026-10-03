import { Module } from '@nestjs/common';
import { LimiteCadastroPublicoInterceptor } from './publico/limite-cadastro-publico.interceptor.js';
import { CondominiosPublicoController } from './publico/condominios-publico.controller.js';
import { CondominiosPublicoService } from './publico/condominios-publico.service.js';

@Module({
  controllers: [CondominiosPublicoController],
  providers: [
    CondominiosPublicoService,
    LimiteCadastroPublicoInterceptor,
  ],
  exports: [CondominiosPublicoService],
})
export class CondominiosModule {}
