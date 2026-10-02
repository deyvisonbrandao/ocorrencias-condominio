import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export const AMBIENTES = ['development', 'test', 'production'] as const;
export type Ambiente = (typeof AMBIENTES)[number];

const LIMITE_CONEXOES_PADRAO = 10;

class VariaveisAmbiente {
  @IsIn(AMBIENTES, {
    message: `é obrigatória e deve ser um de: ${AMBIENTES.join(', ')}`,
  })
  NODE_ENV!: Ambiente;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'deve ser um número inteiro' })
  @Min(1, { message: 'deve estar entre 1 e 65535' })
  @Max(65535, { message: 'deve estar entre 1 e 65535' })
  API_PORT?: number;

  @IsString({ message: 'é obrigatória' })
  @Matches(/^mysql:\/\/[^/]+\/[^/?]+/, {
    message: 'deve ter o formato mysql://usuario:senha@host:porta/banco',
  })
  DATABASE_URL!: string;

  @IsOptional()
  @IsIn(['true', 'false'], { message: 'deve ser true ou false' })
  SWAGGER_ENABLED?: 'true' | 'false';

  @IsOptional()
  @IsString()
  @MinLength(32, { message: 'deve ter pelo menos 32 caracteres' })
  JWT_SECRET?: string;
}

export interface ConexaoBanco {
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  banco: string;
  limiteConexoes: number;
}

export class AppConfig {
  constructor(
    readonly ambiente: Ambiente,
    readonly porta: number,
    readonly banco: ConexaoBanco,
    readonly swaggerHabilitado: boolean,
    readonly jwtSecret: string | undefined,
  ) {}

  get producao(): boolean {
    return this.ambiente === 'production';
  }
}

export class ConfigInvalidaError extends Error {
  constructor(readonly problemas: string[]) {
    super(
      `Configuração inválida. Corrija o .env ou as variáveis de ambiente:\n- ${problemas.join('\n- ')}`,
    );
    this.name = 'ConfigInvalidaError';
  }
}

const ARQUIVO_ENV_RAIZ = fileURLToPath(
  new URL('../../../../../.env', import.meta.url),
);

export function carregarArquivoEnv(caminho = ARQUIVO_ENV_RAIZ): void {
  if (existsSync(caminho)) {
    process.loadEnvFile(caminho);
  }
}

const PROBLEMA_URL_INVALIDA =
  'DATABASE_URL: URL inválida (codifique caracteres especiais da senha, ex.: %23 para #)';

// Nunca repassar o erro original: a mensagem do TypeError/URIError traz a URL inteira, com a senha.
function lerConexaoBanco(databaseUrl: string): ConexaoBanco | string {
  let conexao: ConexaoBanco;
  try {
    const url = new URL(databaseUrl);
    conexao = {
      host: url.hostname,
      porta: url.port ? Number(url.port) : 3306,
      usuario: decodeURIComponent(url.username),
      senha: decodeURIComponent(url.password),
      banco: decodeURIComponent(url.pathname.slice(1)),
      limiteConexoes: LIMITE_CONEXOES_PADRAO,
    };
    if (url.protocol !== 'mysql:' || !conexao.host || !conexao.banco) {
      return PROBLEMA_URL_INVALIDA;
    }
    const limite = url.searchParams.get('connection_limit');
    if (limite !== null) {
      conexao.limiteConexoes = Number(limite);
      if (
        !Number.isInteger(conexao.limiteConexoes) ||
        conexao.limiteConexoes < 1
      ) {
        return 'DATABASE_URL: connection_limit deve ser um inteiro positivo';
      }
    }
  } catch {
    return PROBLEMA_URL_INVALIDA;
  }
  return conexao;
}

export function carregarConfig(env: NodeJS.ProcessEnv): AppConfig {
  const preenchidas = Object.fromEntries(
    Object.entries(env).filter(
      ([, valor]) => valor !== undefined && valor.trim() !== '',
    ),
  );
  const variaveis = plainToInstance(VariaveisAmbiente, preenchidas);
  const erros = validateSync(variaveis);
  const problemas = erros.map(
    (erro) =>
      `${erro.property}: ${[...new Set(Object.values(erro.constraints ?? {}))].join('; ')}`,
  );

  const urlValidada = !erros.some((erro) => erro.property === 'DATABASE_URL');
  const banco = urlValidada
    ? lerConexaoBanco(variaveis.DATABASE_URL)
    : undefined;
  if (typeof banco === 'string') {
    problemas.push(banco);
  }
  if (
    problemas.length > 0 ||
    banco === undefined ||
    typeof banco === 'string'
  ) {
    throw new ConfigInvalidaError(problemas);
  }

  const ambiente = variaveis.NODE_ENV;
  const swaggerHabilitado =
    variaveis.SWAGGER_ENABLED === undefined
      ? ambiente !== 'production'
      : variaveis.SWAGGER_ENABLED === 'true';

  return new AppConfig(
    ambiente,
    variaveis.API_PORT ?? 3000,
    banco,
    swaggerHabilitado,
    variaveis.JWT_SECRET,
  );
}
