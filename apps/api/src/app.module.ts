import { Module } from '@nestjs/common';
import { AuthModule } from './core/auth/auth.module.js';
import { ConfigModule } from './core/config/config.module.js';
import { HealthModule } from './core/health/health.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { AcessoModule } from './features/acesso/acesso.module.js';
import { CondominiosModule } from './features/condominios/condominios.module.js';
import { MembrosModule } from './features/membros/membros.module.js';
import { PainelModule } from './features/painel/painel.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    CondominiosModule,
    AcessoModule,
    PainelModule,
    MembrosModule,
  ],
})
export class AppModule {}
