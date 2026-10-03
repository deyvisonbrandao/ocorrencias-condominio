import { slugValido } from '@ocorrencias/contratos';
import {
  derivarSlug,
  extrairSlug,
  MENSAGEM_SLUG_CARACTERES,
  MENSAGEM_SLUG_HIFEN_NA_PONTA,
  MENSAGEM_SLUG_TAMANHO,
  MENSAGEM_SLUG_VAZIO,
  problemaDoSlug,
} from './slug';

describe('derivarSlug', () => {
  it.each([
    ['Residencial Jardim das Flores', 'residencial-jardim-das-flores'],
    ['Edifício São João', 'edificio-sao-joao'],
    ['  Condomínio   Ação & Cia.  ', 'condominio-acao-cia'],
    ['Bloco 7 — Torre B', 'bloco-7-torre-b'],
    ['---', ''],
    ['', ''],
  ])('"%s" vira "%s"', (nome, esperado) => {
    expect(derivarSlug(nome)).toBe(esperado);
  });

  it('corta em 40 caracteres sem deixar hífen no fim', () => {
    const slug = derivarSlug('Condominio Residencial Muito Grande Mesmo Com Nome Longo');

    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
    expect(slugValido(slug)).toBe(true);
  });
});

describe('problemaDoSlug', () => {
  it.each([
    ['', MENSAGEM_SLUG_VAZIO],
    ['Jardim', MENSAGEM_SLUG_CARACTERES],
    ['jardim flores', MENSAGEM_SLUG_CARACTERES],
    ['jardim_flores', MENSAGEM_SLUG_CARACTERES],
    ['-jardim', MENSAGEM_SLUG_HIFEN_NA_PONTA],
    ['jardim-', MENSAGEM_SLUG_HIFEN_NA_PONTA],
    ['ab', MENSAGEM_SLUG_TAMANHO],
    ['a'.repeat(41), MENSAGEM_SLUG_TAMANHO],
  ])('"%s" é rejeitado com "%s"', (slug, mensagem) => {
    expect(problemaDoSlug(slug)).toBe(mensagem);
    expect(slugValido(slug)).toBe(false);
  });

  it.each(['abc', 'jardim-das-flores', 'bloco-7', 'a'.repeat(40)])('"%s" é aceito', (slug) => {
    expect(problemaDoSlug(slug)).toBeNull();
    expect(slugValido(slug)).toBe(true);
  });
});

describe('extrairSlug', () => {
  it.each([
    ['jardim-das-flores', 'jardim-das-flores'],
    ['  Jardim-Das-Flores ', 'jardim-das-flores'],
    ['https://ocorrencias.app/c/jardim-das-flores', 'jardim-das-flores'],
    ['ocorrencias.app/c/jardim-das-flores/entrar?x=1', 'jardim-das-flores'],
    ['/jardim/', 'jardim'],
  ])('"%s" vira "%s"', (texto, esperado) => {
    expect(extrairSlug(texto)).toBe(esperado);
  });
});
