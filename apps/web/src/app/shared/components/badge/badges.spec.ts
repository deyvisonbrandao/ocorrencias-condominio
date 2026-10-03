import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusOcorrencia, StatusUsuario, TipoOcorrencia, Urgencia } from '@ocorrencias/contratos';
import { BadgeStatus } from './badge-status';
import { BadgeStatusUsuario } from './badge-status-usuario';
import { BadgeTipo } from './badge-tipo';
import { BadgeUrgencia } from './badge-urgencia';
import { Marcador } from './marcador';

async function renderizar<T>(tipo: Type<T>, entradas: Record<string, unknown>) {
  const fixture = TestBed.createComponent(tipo);
  for (const [nome, valor] of Object.entries(entradas)) {
    fixture.componentRef.setInput(nome, valor);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function textoNormalizado(elemento: Element): string {
  return (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('ui-badge-status', () => {
  const casos: [StatusOcorrencia, string, string][] = [
    ['ABERTA', 'Aberta', 'bg-status-aberta-fundo'],
    ['EM_ANDAMENTO', 'Em andamento', 'bg-status-andamento-fundo'],
    ['RESOLVIDA', 'Resolvida', 'bg-status-resolvida-fundo'],
    ['ARQUIVADA', 'Arquivada', 'bg-status-arquivada-fundo'],
    ['DUPLICADA', 'Duplicada', 'bg-status-duplicada-fundo'],
  ];

  it.each(casos)('mostra %s como "%s" com o token de status', async (status, rotulo, classe) => {
    const elemento = await renderizar(BadgeStatus, { status });
    const badge = elemento.querySelector('span') as HTMLElement;

    expect(textoNormalizado(badge)).toBe(rotulo);
    expect(badge.classList).toContain(classe);
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('ui-badge-status-usuario', () => {
  const casos: [StatusUsuario, string, string][] = [
    ['PENDENTE', 'Pendente', 'bg-aviso-suave'],
    ['ATIVO', 'Ativo', 'bg-sucesso-suave'],
    ['INATIVO', 'Inativo', 'bg-superficie-sutil'],
    ['RECUSADO', 'Recusado', 'bg-perigo-suave'],
  ];

  it.each(casos)('mostra %s como "%s" com texto visível e ponto decorativo', async (status, rotulo, classe) => {
    const elemento = await renderizar(BadgeStatusUsuario, { status });
    const badge = elemento.querySelector('span') as HTMLElement;

    expect(textoNormalizado(badge)).toBe(rotulo);
    expect(badge.classList).toContain(classe);
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('ui-badge-urgencia', () => {
  const casos: [Urgencia, string, number, string][] = [
    ['BAIXA', 'Baixa', 1, 'bg-urgencia-baixa-fundo'],
    ['MEDIA', 'Média', 2, 'bg-urgencia-media-fundo'],
    ['ALTA', 'Alta', 3, 'bg-urgencia-alta-fundo'],
    ['CRITICA', 'Crítica', 4, 'bg-urgencia-critica-fundo'],
  ];

  it.each(casos)(
    'mostra %s como "%s", com %i de 4 barras preenchidas e prefixo para leitor de tela',
    async (urgencia, rotulo, preenchidas, classe) => {
      const elemento = await renderizar(BadgeUrgencia, { urgencia });
      const badge = elemento.querySelector('span') as HTMLElement;

      expect(textoNormalizado(badge)).toBe(`Urgência ${rotulo}`);
      expect(badge.querySelector('.sr-only')?.textContent?.trim()).toBe('Urgência');
      expect(badge.classList).toContain(classe);
      expect(badge.querySelectorAll('rect')).toHaveLength(4);
      expect(badge.querySelectorAll('rect[fill="currentColor"]')).toHaveLength(preenchidas);
      expect(badge.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    },
  );

  it('mostra "Não triada" com borda tracejada e sem ícone quando a urgência é nula', async () => {
    const elemento = await renderizar(BadgeUrgencia, { urgencia: null });
    const badge = elemento.querySelector('span') as HTMLElement;

    expect(textoNormalizado(badge)).toBe('Não triada');
    expect(badge.classList).toContain('border-dashed');
    expect(badge.querySelector('svg')).toBeNull();
  });
});

describe('ui-badge-tipo', () => {
  const casos: [TipoOcorrencia, string, string][] = [
    ['MANUTENCAO_AREA_COMUM', 'Manutenção', 'Manutenção em área comum'],
    ['RECLAMACAO_BARULHO', 'Reclamação', 'Reclamação'],
    ['DUVIDA_REGRAS', 'Dúvida', 'Dúvida'],
    ['SUGESTAO_MELHORIA', 'Sugestão', 'Sugestão de melhoria'],
    ['COMUNICADO_MUDANCA_OBRA', 'Mudança ou obra', 'Comunicado de mudança ou obra'],
  ];

  it.each(casos)('mostra %s com o rótulo curto "%s" por padrão', async (tipo, curto) => {
    const elemento = await renderizar(BadgeTipo, { tipo });

    expect(textoNormalizado(elemento)).toBe(curto);
    expect(elemento.querySelector('ui-icone')?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(casos)('mostra %s com o rótulo longo "%s" quando curto é falso', async (tipo, _curto, longo) => {
    const elemento = await renderizar(BadgeTipo, { tipo, curto: false });

    expect(textoNormalizado(elemento)).toBe(longo);
  });
});

describe('ui-marcador', () => {
  it('mostra "Atrasada" sólido com ícone de relógio', async () => {
    const elemento = await renderizar(Marcador, { tipo: 'atrasada' });
    const badge = elemento.querySelector('span') as HTMLElement;

    expect(textoNormalizado(badge)).toBe('Atrasada');
    expect(badge.classList).toContain('bg-atrasada-fundo');
    expect(badge.querySelector('ui-icone')).not.toBeNull();
  });

  it('mostra "Restrita" neutro com ícone de cadeado', async () => {
    const elemento = await renderizar(Marcador, { tipo: 'restrita' });
    const badge = elemento.querySelector('span') as HTMLElement;

    expect(textoNormalizado(badge)).toBe('Restrita');
    expect(badge.classList).toContain('bg-superficie');
    expect(badge.querySelector('ui-icone')).not.toBeNull();
  });
});
