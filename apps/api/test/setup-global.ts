import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { carregarEnvRaiz, urlDoBancoDeTeste } from './banco-teste.js';

export default function prepararBancoDeTeste(): void {
  carregarEnvRaiz();
  execSync('npx prisma migrate deploy', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: urlDoBancoDeTeste(process.env) },
    stdio: 'inherit',
  });
}
