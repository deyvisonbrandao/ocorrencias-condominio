import { ErroApi } from '../http/erro-api.js';
import type { PrismaSistema } from '../prisma/prisma-sistema.js';
import { HealthController, TIMEOUT_BANCO_MS } from './health.controller.js';

function controllerCom(disponivel: boolean) {
  const bancoDisponivel = vi.fn().mockResolvedValue(disponivel);
  const controller = new HealthController({
    bancoDisponivel,
  } as unknown as PrismaSistema);
  return { controller, bancoDisponivel };
}

describe('HealthController', () => {
  it('responde ok quando o banco responde', async () => {
    const { controller, bancoDisponivel } = controllerCom(true);

    await expect(controller.verificar()).resolves.toEqual({
      status: 'ok',
      banco: 'ok',
    });
    expect(bancoDisponivel).toHaveBeenCalledWith(TIMEOUT_BANCO_MS);
  });

  it('lança 503 BANCO_INDISPONIVEL quando o banco não responde', async () => {
    const { controller } = controllerCom(false);

    const erro = await controller.verificar().catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).getStatus()).toBe(503);
    expect((erro as ErroApi).getResponse()).toMatchObject({
      code: 'BANCO_INDISPONIVEL',
    });
  });
});
