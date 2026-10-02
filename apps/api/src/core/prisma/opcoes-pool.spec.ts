import { opcoesPool } from './opcoes-pool.js';

describe('opcoesPool', () => {
  it('extrai a conexão da DATABASE_URL e decodifica credenciais', () => {
    const opcoes = opcoesPool(
      'mysql://us%40r:s%3Ae%2Fnha@db.local:3307/ocorrencias',
      'development',
    );

    expect(opcoes).toMatchObject({
      host: 'db.local',
      port: 3307,
      user: 'us@r',
      password: 's:e/nha',
      database: 'ocorrencias',
      connectionLimit: 10,
    });
  });

  it('usa a porta 3306 quando a URL não traz porta', () => {
    expect(opcoesPool('mysql://u:p@localhost/banco', 'development').port).toBe(
      3306,
    );
  });

  it('respeita connection_limit da URL e ignora valor inválido', () => {
    expect(
      opcoesPool('mysql://u:p@h/b?connection_limit=4', 'test').connectionLimit,
    ).toBe(4);
    expect(
      opcoesPool('mysql://u:p@h/b?connection_limit=abc', 'test')
        .connectionLimit,
    ).toBe(10);
  });

  it('limita o tempo de conexão para o health não ficar pendurado', () => {
    const opcoes = opcoesPool('mysql://u:p@h/b', 'development');
    expect(opcoes.connectTimeout).toBeLessThanOrEqual(5_000);
    expect(opcoes.acquireTimeout).toBeGreaterThan(opcoes.connectTimeout ?? 0);
  });

  it('só busca a chave RSA do servidor fora de produção', () => {
    expect(
      opcoesPool('mysql://u:p@h/b', 'development').allowPublicKeyRetrieval,
    ).toBe(true);
    expect(
      opcoesPool('mysql://u:p@h/b', 'production').allowPublicKeyRetrieval,
    ).toBe(false);
  });
});
