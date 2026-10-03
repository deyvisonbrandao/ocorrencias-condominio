import { Module } from '@nestjs/common';
import { LimiteCadastroPublicoInterceptor } from '../../core/http/limite-cadastro-publico.interceptor.js';
import { CondominiosModule } from '../condominios/condominios.module.js';
import { AuthController } from './publico/auth.controller.js';
import { CadastroMoradorController } from './publico/cadastro-morador.controller.js';
import { CadastroMoradorService } from './publico/cadastro-morador.service.js';
import { LoginService } from './publico/login.service.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [CondominiosModule],
  controllers: [AuthController, CadastroMoradorController, MeController],
  providers: [
    LoginService,
    MeService,
    CadastroMoradorService,
    LimiteCadastroPublicoInterceptor,
  ],
})
export class AcessoModule {}
