import type { ConexaoBanco } from '../config/app-config.js';
import { opcoesPool } from './opcoes-pool.js';

const banco: ConexaoBanco = {
  host: 'db.local',
  porta: 3307,
  usuario: 'us@r',
  senha: 's:e/nha',
  banco: 'ocorrencias',
  limiteConexoes: 4,
};

describe('opcoesPool', () => {
  it('repassa a conexão já validada pela config', () => {
    expect(opcoesPool(banco, 'development')).toMatchObject({
      host: 'db.local',
      port: 3307,
      user: 'us@r',
      password: 's:e/nha',
      database: 'ocorrencias',
      connectionLimit: 4,
    });
  });

  it('limita conexão, espera por conexão livre e consulta parada', () => {
    const opcoes = opcoesPool(banco, 'development');

    expect(opcoes.connectTimeout).toBeLessThanOrEqual(5_000);
    expect(opcoes.acquireTimeout).toBeGreaterThan(opcoes.connectTimeout ?? 0);
    expect(opcoes.socketTimeout).toBe(15_000);
  });

  it('só busca a chave RSA do servidor fora de produção', () => {
    expect(opcoesPool(banco, 'development').allowPublicKeyRetrieval).toBe(true);
    expect(opcoesPool(banco, 'production').allowPublicKeyRetrieval).toBe(false);
  });
});
