import type { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { Ambiente } from '../config/app-config.js';

export type PoolConfig = Exclude<
  ConstructorParameters<typeof PrismaMariaDb>[0],
  string | { getConnection: unknown }
>;

const LIMITE_CONEXOES_PADRAO = 10;

export function opcoesPool(
  databaseUrl: string,
  ambiente: Ambiente,
): PoolConfig {
  const url = new URL(databaseUrl);
  const limite = Number(
    url.searchParams.get('connection_limit') ?? LIMITE_CONEXOES_PADRAO,
  );

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit:
      Number.isInteger(limite) && limite > 0 ? limite : LIMITE_CONEXOES_PADRAO,
    connectTimeout: 3_000,
    acquireTimeout: 5_000,
    // MySQL 8.4 autentica com caching_sha2_password: sem TLS, o driver precisa buscar a chave RSA do servidor.
    // Fora de produção a conexão é local; em produção a conexão deve usar TLS e esta opção fica desligada.
    allowPublicKeyRetrieval: ambiente !== 'production',
  };
}
