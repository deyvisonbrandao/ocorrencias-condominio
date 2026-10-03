import type { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { Ambiente, ConexaoBanco } from '../config/app-config.js';

export type PoolConfig = Exclude<
  ConstructorParameters<typeof PrismaMariaDb>[0],
  string | { getConnection: unknown }
>;

export function opcoesPool(
  banco: ConexaoBanco,
  ambiente: Ambiente,
): PoolConfig {
  return {
    host: banco.host,
    port: banco.porta,
    user: banco.usuario,
    password: banco.senha,
    database: banco.banco,
    connectionLimit: banco.limiteConexoes,
    connectTimeout: 3_000,
    acquireTimeout: 5_000,
    socketTimeout: 15_000,
    // MySQL 8.4 autentica com caching_sha2_password: sem TLS, o driver precisa buscar a chave RSA do servidor.
    // Fora de produção a conexão é local; em produção a conexão deve usar TLS e esta opção fica desligada.
    allowPublicKeyRetrieval: ambiente !== 'production',
  };
}
