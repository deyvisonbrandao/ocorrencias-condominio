import { Logger } from '@nestjs/common';
import { AppConfig } from '../config/app-config.js';
import { PrismaService } from './prisma.service.js';

function criarServico(): PrismaService {
  return new PrismaService(
    new AppConfig(
      'test',
      3000,
      {
        host: '127.0.0.1',
        porta: 3306,
        usuario: 'u',
        senha: 'p',
        banco: 'b',
        limiteConexoes: 1,
      },
      false,
      undefined,
    ),
  );
}

describe('PrismaService.bancoDisponivel', () => {
  let servico: PrismaService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    servico = criarServico();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('responde true quando o SELECT 1 volta', async () => {
    vi.spyOn(servico, '$queryRaw').mockResolvedValue([{ 1: 1 }] as never);

    await expect(servico.bancoDisponivel(3_000)).resolves.toBe(true);
  });

  it('responde false quando o banco não responde dentro do limite', async () => {
    vi.spyOn(servico, '$queryRaw').mockReturnValue(
      new Promise(() => undefined) as never,
    );

    const resultado = servico.bancoDisponivel(3_000);
    await vi.advanceTimersByTimeAsync(2_999);
    let resolvido = false;
    void resultado.then(() => (resolvido = true));
    await Promise.resolve();
    expect(resolvido).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(resultado).resolves.toBe(false);
  });

  it('responde false quando a consulta falha', async () => {
    vi.spyOn(servico, '$queryRaw').mockRejectedValue(
      new Error('ECONNREFUSED') as never,
    );

    await expect(servico.bancoDisponivel(3_000)).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
