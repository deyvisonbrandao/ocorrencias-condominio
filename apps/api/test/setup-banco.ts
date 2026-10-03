import { fecharBanco, limparBanco } from './banco.js';

beforeAll(async () => {
  await limparBanco();
});

afterAll(async () => {
  await fecharBanco();
});
