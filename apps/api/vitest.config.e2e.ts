import { defineConfig } from 'vitest/config';
import { carregarEnvRaiz, urlDoBancoDeTeste } from './test/banco-teste.js';

carregarEnvRaiz();

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { DATABASE_URL: urlDoBancoDeTeste(process.env) },
    globalSetup: ['./test/setup-global.ts'],
    setupFiles: ['./test/setup-banco.ts'],
    // As suítes compartilham o banco de teste e o limpam no início: rodar arquivos em paralelo misturaria os dados.
    fileParallelism: false,
  },
});
