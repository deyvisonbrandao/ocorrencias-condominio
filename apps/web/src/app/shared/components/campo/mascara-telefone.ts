const DIGITOS_CELULAR = 11;
const CODIGO_BRASIL = '55';
const DIGITOS_COM_CODIGO = CODIGO_BRASIL.length + DIGITOS_CELULAR;
const DIGITOS_INTERNACIONAL_MAX = 15;

function formatarNacional(digitos: string): string {
  if (digitos.length === 0) {
    return '';
  }
  if (digitos.length <= 2) {
    return `(${digitos}`;
  }
  const ddd = digitos.slice(0, 2);
  if (digitos.length <= 7) {
    return `(${ddd}) ${digitos.slice(2)}`;
  }
  return `(${ddd}) ${digitos.slice(2, 7)}-${digitos.slice(7, DIGITOS_CELULAR)}`;
}

function formatarComCodigo(digitos: string): string {
  if (!digitos.startsWith(CODIGO_BRASIL)) {
    return `+${digitos.slice(0, DIGITOS_INTERNACIONAL_MAX)}`;
  }
  const nacional = formatarNacional(digitos.slice(CODIGO_BRASIL.length, DIGITOS_COM_CODIGO));
  return nacional ? `+${CODIGO_BRASIL} ${nacional}` : `+${CODIGO_BRASIL}`;
}

export function formatarTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, '');
  if (texto.trim().startsWith('+')) {
    return digitos.length <= CODIGO_BRASIL.length ? `+${digitos}` : formatarComCodigo(digitos);
  }
  if (digitos.length > DIGITOS_CELULAR && digitos.startsWith(CODIGO_BRASIL)) {
    return formatarComCodigo(digitos);
  }
  if (digitos.length > DIGITOS_CELULAR && digitos.startsWith('0')) {
    return formatarNacional(digitos.slice(1));
  }
  return formatarNacional(digitos);
}
