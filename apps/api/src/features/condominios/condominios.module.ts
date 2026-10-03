import { Module } from '@nestjs/common';
import { CondominioAdminController } from './condominio-admin.controller.js';
import { CondominioAdminService } from './condominio-admin.service.js';
import { LimiteCadastroPublicoInterceptor } from './publico/limite-cadastro-publico.interceptor.js';
import { CondominiosPublicoController } from './publico/condominios-publico.controller.js';
import { CondominiosPublicoService } from './publico/condominios-publico.service.js';

@Module({
  controllers: [CondominiosPublicoController, CondominioAdminController],
  providers: [
    CondominiosPublicoService,
    CondominioAdminService,
    LimiteCadastroPublicoInterceptor,
  ],
  exports: [CondominiosPublicoService],
})
export class CondominiosModule {}
