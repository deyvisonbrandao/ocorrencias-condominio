import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErroApi, ErroApiDto } from '../http/erro-api.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const TIMEOUT_BANCO_MS = 3_000;

export class HealthDto {
  @ApiProperty({ example: 'ok', enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({
    example: 'ok',
    enum: ['ok'],
    description: 'Resultado do `SELECT 1` no MySQL.',
  })
  banco!: 'ok';
}

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Verifica se a API e o banco estão no ar',
    description: `Executa \`SELECT 1\` no MySQL com limite de ${TIMEOUT_BANCO_MS} ms. Rota pública, sem autenticação.`,
  })
  @ApiOkResponse({ description: 'API e banco respondendo.', type: HealthDto })
  @ApiServiceUnavailableResponse({
    description: 'O banco não respondeu. `code` = `BANCO_INDISPONIVEL`.',
    type: ErroApiDto,
    example: {
      statusCode: 503,
      code: 'BANCO_INDISPONIVEL',
      message: 'O banco de dados não está respondendo.',
      details: { banco: 'indisponivel' },
    },
  })
  async verificar(): Promise<HealthDto> {
    if (!(await this.prisma.bancoDisponivel(TIMEOUT_BANCO_MS))) {
      throw new ErroApi(
        HttpStatus.SERVICE_UNAVAILABLE,
        'BANCO_INDISPONIVEL',
        'O banco de dados não está respondendo.',
        { banco: 'indisponivel' },
      );
    }
    return { status: 'ok', banco: 'ok' };
  }
}
