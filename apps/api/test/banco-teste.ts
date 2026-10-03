import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ARQUIVO_ENV_RAIZ = fileURLToPath(
  new URL('../../../.env', import.meta.url),
);
const SUFIXO = '_test';

export function carregarEnvRaiz(): void {
  if (existsSync(ARQUIVO_ENV_RAIZ)) {
    process.loadEnvFile(ARQUIVO_ENV_RAIZ);
  }
}

function nomeDoBanco(url: URL): string {
  return decodeURIComponent(url.pathname.slice(1));
}

// Os e2e apagam todas as tabelas: só rodam num banco cujo nome termina em _test e que não é o de DATABASE_URL.
export function urlDoBancoDeTeste(env: NodeJS.ProcessEnv): string {
  const explicita = env.DATABASE_URL_TEST?.trim();
  const desenvolvimento = env.DATABASE_URL?.trim();
  if (!explicita && !desenvolvimento) {
    throw new Error(
      'e2e: defina DATABASE_URL_TEST (ou DATABASE_URL, de onde o banco <nome>_test é derivado).',
    );
  }

  let url: URL;
  try {
    url = new URL(explicita || desenvolvimento!);
  } catch {
    throw new Error('e2e: DATABASE_URL_TEST/DATABASE_URL inválida.');
  }
  if (!explicita) {
    url.pathname = `/${nomeDoBanco(url)}${SUFIXO}`;
  }

  const banco = nomeDoBanco(url);
  if (!banco.endsWith(SUFIXO)) {
    throw new Error(
      `e2e: o banco de teste precisa terminar em "${SUFIXO}" (recebido "${banco}"). Os testes apagam todos os dados dele.`,
    );
  }
  if (desenvolvimento && nomeDoBanco(new URL(desenvolvimento)) === banco) {
    throw new Error(
      'e2e: DATABASE_URL_TEST aponta para o banco de DATABASE_URL.',
    );
  }
  return url.toString();
}
