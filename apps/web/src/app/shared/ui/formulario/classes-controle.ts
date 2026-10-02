const BASE =
  'block w-full min-w-0 bg-superficie px-3 py-2.5 text-base text-texto placeholder:text-texto-suave focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-superficie-sutil disabled:text-texto-secundario';

const NORMAL = 'border border-borda-controle focus:border-primaria-foco focus:ring-primaria-foco/30';
const COM_ERRO = 'border-2 border-perigo-borda focus:border-perigo-borda focus:ring-perigo-borda/30';

export function classesControle(comErro: boolean, extras = ''): string {
  return `${BASE} ${comErro ? COM_ERRO : NORMAL} ${extras}`.trim();
}
