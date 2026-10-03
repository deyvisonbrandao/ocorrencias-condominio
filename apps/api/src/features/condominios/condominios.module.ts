import { Module } from '@nestjs/common';
import { CondominiosPublicoController } from './publico/condominios-publico.controller.js';
import { CondominiosPublicoService } from './publico/condominios-publico.service.js';

@Module({
  controllers: [CondominiosPublicoController],
  providers: [CondominiosPublicoService],
  exports: [CondominiosPublicoService],
})
export class CondominiosModule {}
