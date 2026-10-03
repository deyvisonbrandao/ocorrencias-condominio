import { HttpException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface CorpoErroApi {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export class ErroApiDto implements CorpoErroApi {
  @ApiProperty({ example: 400, description: 'Status HTTP repetido no corpo.' })
  statusCode!: number;

  @ApiProperty({
    example: 'VALIDACAO_FALHOU',
    description:
      'Código estável do erro, em maiúsculas. Use este campo para tratar o erro no cliente.',
  })
  code!: string;

  @ApiProperty({
    example: 'Os dados enviados são inválidos.',
    description: 'Mensagem em português, pronta para exibir ao usuário.',
  })
  message!: string;

  @ApiPropertyOptional({
    description:
      'Detalhes específicos do erro, como a lista de campos inválidos.',
    example: [{ campo: 'titulo', erros: ['titulo must be a string'] }],
  })
  details?: unknown;
}

export class ErroApi extends HttpException {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    const corpo: CorpoErroApi = { statusCode, code, message };
    if (details !== undefined) {
      corpo.details = details;
    }
    super(corpo, statusCode);
  }
}
