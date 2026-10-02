import { carregarConfig, ConfigInvalidaError } from './app-config.js';

const DATABASE_URL = 'mysql://usuario:senha@localhost:3306/ocorrencias';

function erroDe(env: NodeJS.ProcessEnv): ConfigInvalidaError {
  try {
    carregarConfig(env);
  } catch (erro) {
    if (erro instanceof ConfigInvalidaError) return erro;
    throw erro;
  }
  throw new Error('era esperado ConfigInvalidaError');
}

describe('carregarConfig', () => {
  it('aplica os padrões quando só DATABASE_URL é informada', () => {
    const config = carregarConfig({ DATABASE_URL });

    expect(config.ambiente).toBe('development');
    expect(config.porta).toBe(3000);
    expect(config.databaseUrl).toBe(DATABASE_URL);
    expect(config.swaggerHabilitado).toBe(true);
    expect(config.jwtSecret).toBeUndefined();
  });

  it('converte API_PORT para número', () => {
    expect(carregarConfig({ DATABASE_URL, API_PORT: '3100' }).porta).toBe(3100);
  });

  it('recusa subir sem DATABASE_URL', () => {
    expect(erroDe({}).problemas).toEqual([
      expect.stringMatching(/^DATABASE_URL: /),
    ]);
  });

  it('trata variável vazia como ausente', () => {
    expect(erroDe({ DATABASE_URL: '  ' }).problemas[0]).toMatch(
      /^DATABASE_URL: /,
    );
    expect(
      carregarConfig({ DATABASE_URL, JWT_SECRET: '' }).jwtSecret,
    ).toBeUndefined();
  });

  it('lista todos os problemas de uma vez, sem expor os valores', () => {
    const erro = erroDe({
      NODE_ENV: 'prod',
      API_PORT: '70000',
      DATABASE_URL: 'postgres://segredo@host/banco',
      SWAGGER_ENABLED: 'sim',
      JWT_SECRET: 'curto',
    });

    expect(erro.problemas.map((p) => p.split(':')[0]).sort()).toEqual(
      [
        'API_PORT',
        'DATABASE_URL',
        'JWT_SECRET',
        'NODE_ENV',
        'SWAGGER_ENABLED',
      ].sort(),
    );
    expect(erro.message).not.toContain('segredo');
    expect(erro.message).not.toContain('curto');
  });

  it.each([['abc'], ['0'], ['3000.5']])('recusa API_PORT=%s', (API_PORT) => {
    expect(erroDe({ DATABASE_URL, API_PORT }).problemas[0]).toMatch(
      /^API_PORT: /,
    );
  });

  it.each([
    [{ NODE_ENV: 'production' }, false],
    [{ NODE_ENV: 'test' }, true],
    [{ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }, true],
    [{ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' }, false],
  ])('Swagger com %o -> %s', (env, esperado) => {
    expect(carregarConfig({ DATABASE_URL, ...env }).swaggerHabilitado).toBe(
      esperado,
    );
  });

  it('aceita JWT_SECRET com 32+ caracteres', () => {
    const segredo = 'x'.repeat(32);
    expect(
      carregarConfig({ DATABASE_URL, JWT_SECRET: segredo }).jwtSecret,
    ).toBe(segredo);
  });
});
