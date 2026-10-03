import { REGRAS_SLUG } from '@ocorrencias/contratos';

const MARCAS_DIACRITICAS = /[̀-ͯ]/g;
const CARACTERES_ACEITOS = /^[a-z0-9-]+$/;
const SEGMENTO_SLUG = /\/c\/([^/?#]*)/;

export function derivarSlug(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, REGRAS_SLUG.max).replace(/-+$/, '');
}

export function slugValido(slug: string): boolean {
  return (
    slug.length >= REGRAS_SLUG.min &&
    slug.length <= REGRAS_SLUG.max &&
    REGRAS_SLUG.padrao.test(slug)
  );
}

export const MENSAGEM_SLUG_VAZIO = 'Informe o endereço do link.';
export const MENSAGEM_SLUG_CARACTERES = 'Use só letras minúsculas, números e hífen.';
export const MENSAGEM_SLUG_HIFEN_NA_PONTA = 'O endereço não pode começar nem terminar com hífen.';
export const MENSAGEM_SLUG_TAMANHO = `Use de ${REGRAS_SLUG.min} a ${REGRAS_SLUG.max} caracteres.`;
export const MENSAGEM_SLUG_EM_USO = 'Endereço já em uso. Tente outro.';

export function problemaDoSlug(slug: string): string | null {
  if (slug === '') {
    return MENSAGEM_SLUG_VAZIO;
  }
  if (!CARACTERES_ACEITOS.test(slug)) {
    return MENSAGEM_SLUG_CARACTERES;
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return MENSAGEM_SLUG_HIFEN_NA_PONTA;
  }
  if (slug.length < REGRAS_SLUG.min || slug.length > REGRAS_SLUG.max) {
    return MENSAGEM_SLUG_TAMANHO;
  }
  return null;
}

export function extrairSlug(texto: string): string {
  const limpo = texto.trim();
  const doLink = SEGMENTO_SLUG.exec(limpo);
  return (doLink ? doLink[1] : limpo).replace(/^\/+|\/+$/g, '').toLowerCase();
}
