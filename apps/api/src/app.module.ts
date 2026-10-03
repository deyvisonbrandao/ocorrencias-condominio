import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module.js';
import { HealthModule } from './core/health/health.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule],
})
export class AppModule {}
