import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module.js';
import { HealthModule } from './core/health/health.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { CondominiosModule } from './features/condominios/condominios.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, CondominiosModule],
})
export class AppModule {}
