import { carregarConfig, ConfigInvalidaError } from './app-config.js';

const DATABASE_URL = 'mysql://usuario:senha@localhost:3306/ocorrencias';
const JWT_SECRET = 'segredo-de-teste-com-32-caracteres!';
const BASE = { NODE_ENV: 'development', DATABASE_URL, JWT_SECRET };

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
  it('aplica os padrões quando só o obrigatório é informado', () => {
    const config = carregarConfig(BASE);

    expect(config.ambiente).toBe('development');
    expect(config.porta).toBe(3000);
    expect(config.swaggerHabilitado).toBe(true);
    expect(config.jwtSecret).toBe(JWT_SECRET);
  });

  it('converte API_PORT para número', () => {
    expect(carregarConfig({ ...BASE, API_PORT: '3100' }).porta).toBe(3100);
  });

  it('recusa subir sem NODE_ENV, sem assumir ambiente', () => {
    expect(erroDe({ DATABASE_URL, JWT_SECRET }).problemas).toEqual([
      expect.stringMatching(/^NODE_ENV: é obrigatória/),
    ]);
  });

  it('recusa subir sem DATABASE_URL', () => {
    expect(erroDe({ NODE_ENV: 'test', JWT_SECRET }).problemas).toEqual([
      expect.stringMatching(/^DATABASE_URL: /),
    ]);
  });

  it('trata variável vazia como ausente', () => {
    expect(erroDe({ ...BASE, DATABASE_URL: '  ' }).problemas[0]).toMatch(
      /^DATABASE_URL: /,
    );
    expect(erroDe({ ...BASE, JWT_SECRET: '   ' }).problemas).toEqual([
      expect.stringMatching(/^JWT_SECRET: .*é obrigatória/),
    ]);
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
    expect(erroDe({ ...BASE, API_PORT }).problemas[0]).toMatch(/^API_PORT: /);
  });

  it.each([
    [{ NODE_ENV: 'production' }, false],
    [{ NODE_ENV: 'test' }, true],
    [{ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }, true],
    [{ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' }, false],
  ])('Swagger com %o -> %s', (env, esperado) => {
    expect(
      carregarConfig({ DATABASE_URL, JWT_SECRET, ...env }).swaggerHabilitado,
    ).toBe(esperado);
  });

  it('aceita JWT_SECRET com 32+ caracteres', () => {
    const segredo = 'x'.repeat(32);
    expect(carregarConfig({ ...BASE, JWT_SECRET: segredo }).jwtSecret).toBe(
      segredo,
    );
  });

  describe('DATABASE_URL', () => {
    it('extrai a conexão e decodifica as credenciais', () => {
      const { banco } = carregarConfig({
        ...BASE,
        DATABASE_URL: 'mysql://us%40r:s%3Ae%2Fnha@db.local:3307/ocorrencias',
      });

      expect(banco).toEqual({
        host: 'db.local',
        porta: 3307,
        usuario: 'us@r',
        senha: 's:e/nha',
        banco: 'ocorrencias',
        limiteConexoes: 10,
      });
    });

    it('usa a porta 3306 quando a URL não traz porta', () => {
      expect(
        carregarConfig({ ...BASE, DATABASE_URL: 'mysql://u:p@localhost/b' })
          .banco.porta,
      ).toBe(3306);
    });

    it('lê connection_limit e recusa valor inválido', () => {
      expect(
        carregarConfig({
          ...BASE,
          DATABASE_URL: 'mysql://u:p@h/b?connection_limit=4',
        }).banco.limiteConexoes,
      ).toBe(4);
      expect(
        erroDe({ ...BASE, DATABASE_URL: 'mysql://u:p@h/b?connection_limit=0' })
          .problemas,
      ).toEqual([
        'DATABASE_URL: connection_limit deve ser um inteiro positivo',
      ]);
    });

    it.each([
      ['# sem codificar', 'mysql://u:Sen#Ha9@h/db', 'Sen#Ha9'],
      ['/ sem codificar', 'mysql://u:Sen/Ha9@h/db', 'Sen/Ha9'],
      ['% inválido', 'mysql://u:pa%zzSenHa9@h/db', 'pa%zzSenHa9'],
    ])('recusa senha com %s sem vazar a senha', (_, url, senha) => {
      const erro = erroDe({ ...BASE, DATABASE_URL: url });

      expect(erro.problemas).toEqual([
        'DATABASE_URL: URL inválida (codifique caracteres especiais da senha, ex.: %23 para #)',
      ]);
      expect(erro.message).not.toContain(senha);
      expect(erro.message).not.toContain('SenHa9');
      expect(erro.stack ?? '').not.toContain('SenHa9');
    });
  });
});
