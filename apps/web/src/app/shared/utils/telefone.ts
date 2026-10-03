const CELULAR_BR_E164 = /^\+55(\d{2})(\d{4,5})(\d{4})$/;

export function formatarTelefoneParaExibir(e164: string): string {
  const partes = CELULAR_BR_E164.exec(e164);
  return partes ? `(${partes[1]}) ${partes[2]}-${partes[3]}` : e164;
}
