import { argon2id, hash, verify } from 'argon2';

// Parâmetros mínimos do OWASP para argon2id (19 MiB, 2 iterações): limitam a memória por login simultâneo.
const OPCOES_HASH = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES_HASH);
}

export async function verificarSenha(
  senhaHash: string,
  senha: string,
): Promise<boolean> {
  try {
    return await verify(senhaHash, senha);
  } catch {
    return false;
  }
}
