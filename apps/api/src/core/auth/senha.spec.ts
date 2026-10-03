import { gerarHashSenha, verificarSenha } from './senha.js';

describe('senha', () => {
  it('gera hash argon2id com sal, sem conter a senha', async () => {
    const primeiro = await gerarHashSenha('segredo-123');
    const segundo = await gerarHashSenha('segredo-123');

    expect(primeiro).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(primeiro).not.toContain('segredo-123');
    expect(primeiro).not.toBe(segundo);
  });

  it('confere a senha certa e recusa a errada', async () => {
    const senhaHash = await gerarHashSenha('segredo-123');

    await expect(verificarSenha(senhaHash, 'segredo-123')).resolves.toBe(true);
    await expect(verificarSenha(senhaHash, 'segredo-124')).resolves.toBe(false);
  });

  it('trata hash malformado como senha inválida', async () => {
    await expect(verificarSenha('nao-e-hash', 'x')).resolves.toBe(false);
  });
});
