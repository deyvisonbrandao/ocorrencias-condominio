import { carregarConfig } from '../src/core/config/app-config.js';
import { PrismaSistema } from '../src/core/prisma/prisma-sistema.js';

let cliente: PrismaSistema | undefined;

export function prismaDeTeste(): PrismaSistema {
  cliente ??= new PrismaSistema(carregarConfig(process.env));
  return cliente;
}

export async function limparBanco(): Promise<void> {
  const prisma = prismaDeTeste();
  const tabelas = await prisma.$queryRaw<{ nome: string }[]>`
    SELECT TABLE_NAME AS nome FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`;

  // FOREIGN_KEY_CHECKS vale por sessão: a transação interativa garante que tudo roda na mesma conexão.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const { nome } of tabelas) {
        await tx.$executeRawUnsafe(`DELETE FROM \`${nome}\``);
      }
    } finally {
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    }
  });
}

export async function fecharBanco(): Promise<void> {
  await cliente?.$disconnect();
  cliente = undefined;
}
