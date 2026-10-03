const DDDS_BRASIL = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const CARACTERES_ACEITOS = /^[\d\s().+-]+$/;

export function normalizarCelularBr(entrada: string): string | null {
  const texto = entrada.trim();
  if (!CARACTERES_ACEITOS.test(texto)) {
    return null;
  }
  const digitos = texto.replace(/\D/g, '');
  let nacional: string;
  if (texto.startsWith('+')) {
    if (!digitos.startsWith('55')) {
      return null;
    }
    nacional = digitos.slice(2);
  } else if (digitos.length === 13 && digitos.startsWith('55')) {
    nacional = digitos.slice(2);
  } else if (digitos.length === 12 && digitos.startsWith('0')) {
    nacional = digitos.slice(1);
  } else {
    nacional = digitos;
  }

  if (
    nacional.length !== 11 ||
    !DDDS_BRASIL.has(Number(nacional.slice(0, 2))) ||
    nacional[2] !== '9'
  ) {
    return null;
  }
  return `+55${nacional}`;
}

export function celularBrE164Valido(valor: string): boolean {
  return normalizarCelularBr(valor) === valor;
}
