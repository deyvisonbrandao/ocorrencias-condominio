import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AppConfig } from '../config/app-config.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { opcoesPool } from './opcoes-pool.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfig) {
    super({
      adapter: new PrismaMariaDb(opcoesPool(config.banco, config.ambiente)),
    });
  }

  async bancoDisponivel(timeoutMs: number): Promise<boolean> {
    let temporizador: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rejeitar) => {
      temporizador = setTimeout(
        () => rejeitar(new Error(`sem resposta em ${timeoutMs} ms`)),
        timeoutMs,
      );
    });

    try {
      await Promise.race([this.$queryRaw`SELECT 1`, limite]);
      return true;
    } catch (erro) {
      this.logger.warn(
        `Banco indisponível: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
      return false;
    } finally {
      clearTimeout(temporizador);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
