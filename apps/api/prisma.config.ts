import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// O Prisma 7 não lê .env sozinho e o .env do monorepo fica na raiz. Variável já exportada no shell (CI) tem precedência.
const arquivoEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(arquivoEnv)) {
  process.loadEnvFile(arquivoEnv);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
