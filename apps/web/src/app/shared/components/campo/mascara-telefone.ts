const DIGITOS_CELULAR = 11;

function digitosNacionais(texto: string): string {
  const digitos = texto.replace(/\D/g, '');
  if (texto.trim().startsWith('+') && digitos.startsWith('55')) {
    return digitos.slice(2);
  }
  if (digitos.length === 13 && digitos.startsWith('55')) {
    return digitos.slice(2);
  }
  if (digitos.length === 12 && digitos.startsWith('0')) {
    return digitos.slice(1);
  }
  return digitos;
}

export function formatarTelefone(texto: string): string {
  const digitos = digitosNacionais(texto).slice(0, DIGITOS_CELULAR);
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
  return `(${ddd}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}
