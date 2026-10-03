import { Module } from '@nestjs/common';
import { CondominiosModule } from '../condominios/condominios.module.js';
import { AuthController } from './auth.controller.js';
import { LoginService } from './login/login.service.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [CondominiosModule],
  controllers: [AuthController, MeController],
  providers: [LoginService, MeService],
})
export class AcessoModule {}
