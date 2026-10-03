import { Global, Module } from '@nestjs/common';
import { criarPrismaEscopado, PRISMA_ESCOPADO } from './prisma-escopado.js';
import { PrismaSistema } from './prisma-sistema.js';

// PrismaSistema fica exportado para a DI, mas só pode ser importado onde o lint permite (.oxlintrc.json).
@Global()
@Module({
  providers: [
    PrismaSistema,
    {
      provide: PRISMA_ESCOPADO,
      useFactory: (sistema: PrismaSistema) => criarPrismaEscopado(sistema),
      inject: [PrismaSistema],
    },
  ],
  exports: [PrismaSistema, PRISMA_ESCOPADO],
})
export class PrismaModule {}
