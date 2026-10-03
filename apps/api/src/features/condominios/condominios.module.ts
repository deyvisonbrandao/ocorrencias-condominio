import { Module } from '@nestjs/common';
import { LimiteAutocadastroInterceptor } from './publico/limite-autocadastro.interceptor.js';
import { CondominiosPublicoController } from './publico/condominios-publico.controller.js';
import { CondominiosPublicoService } from './publico/condominios-publico.service.js';

@Module({
  controllers: [CondominiosPublicoController],
  providers: [CondominiosPublicoService, LimiteAutocadastroInterceptor],
  exports: [CondominiosPublicoService],
})
export class CondominiosModule {}
