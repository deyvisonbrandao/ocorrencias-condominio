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

class VariaveisAmbiente {
  @IsOptional()
  @IsIn(AMBIENTES, { message: `deve ser um de: ${AMBIENTES.join(', ')}` })
  NODE_ENV?: Ambiente;

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

export class AppConfig {
  constructor(
    readonly ambiente: Ambiente,
    readonly porta: number,
    readonly databaseUrl: string,
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

export function carregarConfig(env: NodeJS.ProcessEnv): AppConfig {
  const preenchidas = Object.fromEntries(
    Object.entries(env).filter(
      ([, valor]) => valor !== undefined && valor.trim() !== '',
    ),
  );
  const variaveis = plainToInstance(VariaveisAmbiente, preenchidas);
  const erros = validateSync(variaveis);
  if (erros.length > 0) {
    throw new ConfigInvalidaError(
      erros.map(
        (erro) =>
          `${erro.property}: ${[...new Set(Object.values(erro.constraints ?? {}))].join('; ')}`,
      ),
    );
  }

  const ambiente = variaveis.NODE_ENV ?? 'development';
  const swaggerHabilitado =
    variaveis.SWAGGER_ENABLED === undefined
      ? ambiente !== 'production'
      : variaveis.SWAGGER_ENABLED === 'true';

  return new AppConfig(
    ambiente,
    variaveis.API_PORT ?? 3000,
    variaveis.DATABASE_URL,
    swaggerHabilitado,
    variaveis.JWT_SECRET,
  );
}
