import { Router, UrlTree } from '@angular/router';
import { Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { AreaDaSessao } from '../models/sessao';

export const ROTA_TROCAR_SENHA = '/trocar-senha';

export const ROTA_INICIAL: Readonly<Record<AreaDaSessao, string>> = {
  admin: '/admin/painel',
  morador: '/app/ocorrencias',
};

const PREFIXO_DA_AREA: Readonly<Record<AreaDaSessao, string>> = {
  admin: '/admin',
  morador: '/app',
};

export const MENSAGEM_SEM_ACESSO = 'Você não tem acesso a essa página.';
export const MENSAGEM_SESSAO_TERMINOU = 'Sua sessão terminou. Entre de novo.';

function temCaractereDeControle(texto: string): boolean {
  return [...texto].some((caractere) => {
    const codigo = caractere.charCodeAt(0);
    return codigo < 0x20 || codigo === 0x7f;
  });
}

export function areaDoPapel(papel: Papel): AreaDaSessao {
  return papel === 'MORADOR' ? 'morador' : 'admin';
}

export function rotaInterna(url: string): boolean {
  return (
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.includes('\\') &&
    !temCaractereDeControle(url)
  );
}

export function pertenceAArea(url: string, area: AreaDaSessao): boolean {
  const prefixo = PREFIXO_DA_AREA[area];
  if (!url.startsWith(prefixo)) {
    return false;
  }
  const seguinte = url.charAt(prefixo.length);
  return seguinte === '' || seguinte === '/' || seguinte === '?' || seguinte === '#';
}

export function destinoAposLogin(usuario: UsuarioSessao, voltar: string | null): string {
  if (usuario.senhaTemporaria) {
    return ROTA_TROCAR_SENHA;
  }
  const area = areaDoPapel(usuario.papel);
  if (voltar !== null && rotaInterna(voltar) && pertenceAArea(voltar, area)) {
    return voltar;
  }
  return ROTA_INICIAL[area];
}

export function rotaDoLogin(router: Router, slug: string | null, voltar?: string): UrlTree {
  if (slug === null) {
    return router.parseUrl('/');
  }
  return router.createUrlTree(['/c', slug, 'entrar'], {
    queryParams: voltar ? { voltar } : {},
  });
}
