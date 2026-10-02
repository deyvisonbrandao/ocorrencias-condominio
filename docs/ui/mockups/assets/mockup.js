/*
 * Mockups estáticos da especificação de UI (issue #4).
 * NÃO é código de produção: serve só para revisar layout e tokens no navegador.
 *
 * 1. Configura o Tailwind Play CDN com os tokens de docs/ui/especificacao.md (seção 2).
 * 2. Injeta o sprite de ícones SVG usado pelos mockups (<svg><use href="#i-..."/></svg>).
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primaria: { DEFAULT: '#1d4ed8', hover: '#1e40af', foco: '#2563eb', suave: '#eff6ff', borda: '#bfdbfe' },
        texto: { DEFAULT: '#111827', secundario: '#4b5563', suave: '#6b7280', inverso: '#ffffff' },
        superficie: { DEFAULT: '#ffffff', app: '#f9fafb', sutil: '#f3f4f6' },
        borda: { DEFAULT: '#e5e7eb', controle: '#6b7280' },
        perigo: { DEFAULT: '#b91c1c', hover: '#991b1b', suave: '#fef2f2', texto: '#991b1b', borda: '#dc2626', linha: '#fecaca' },
        sucesso: { suave: '#f0fdf4', texto: '#166534', linha: '#bbf7d0' },
        info: { suave: '#eff6ff', texto: '#1e40af', linha: '#bfdbfe' },
        aviso: { suave: '#fff7ed', texto: '#9a3412', linha: '#fed7aa' },
        status: {
          'aberta-fundo': '#dbeafe', 'aberta-texto': '#1e40af', 'aberta-ponto': '#2563eb',
          'andamento-fundo': '#fef9c3', 'andamento-texto': '#854d0e', 'andamento-ponto': '#ca8a04',
          'resolvida-fundo': '#dcfce7', 'resolvida-texto': '#166534', 'resolvida-ponto': '#16a34a',
          'arquivada-fundo': '#f3f4f6', 'arquivada-texto': '#374151', 'arquivada-ponto': '#6b7280',
          'duplicada-fundo': '#f3e8ff', 'duplicada-texto': '#6b21a8', 'duplicada-ponto': '#9333ea',
        },
        urgencia: {
          'baixa-fundo': '#f3f4f6', 'baixa-texto': '#374151',
          'media-fundo': '#ffedd5', 'media-texto': '#9a3412',
          'alta-fundo': '#fee2e2', 'alta-texto': '#991b1b',
        },
        atrasada: { fundo: '#b91c1c', texto: '#ffffff' },
        interna: { fundo: '#fffbeb', texto: '#78350f', rotulo: '#92400e', borda: '#d97706' },
      },
      minHeight: { toque: '2.75rem' },
      minWidth: { toque: '2.75rem' },
      height: { toque: '2.75rem', 'barra-inferior': '4rem' },
      width: { toque: '2.75rem' },
      maxWidth: { conteudo: '42rem', admin: '72rem' },
      borderRadius: { controle: '0.5rem', cartao: '0.75rem' },
      transitionDuration: { rapido: '150ms', medio: '200ms' },
    },
  },
};

const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <defs>
    <symbol id="i-casa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/></symbol>
    <symbol id="i-lista" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></symbol>
    <symbol id="i-mais" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="i-usuario" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></symbol>
    <symbol id="i-usuarios" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2.2.6 3.5 2.4 3.5 5.2"/></symbol>
    <symbol id="i-escudo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3z"/></symbol>
    <symbol id="i-predio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/></symbol>
    <symbol id="i-painel" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></symbol>
    <symbol id="i-cadeado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></symbol>
    <symbol id="i-relogio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
    <symbol id="i-alerta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17h.01"/></symbol>
    <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
    <symbol id="i-check-circulo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/></symbol>
    <symbol id="i-voltar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19 8 12l7-7"/></symbol>
    <symbol id="i-direita" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></symbol>
    <symbol id="i-baixo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
    <symbol id="i-fechar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></symbol>
    <symbol id="i-filtro" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5z"/></symbol>
    <symbol id="i-anonimo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.1c.5-.1.9-.1 1.4-.1 5 0 9 6 9 6a17.6 17.6 0 0 1-2.6 3.3M6.6 6.6C4.3 8.2 3 12 3 12s4 6 9 6c1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></symbol>
    <symbol id="i-telefone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3.5h3.5l1.8 4.5-2.3 1.5a11 11 0 0 0 6.5 6.5l1.5-2.3 4.5 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></symbol>
    <symbol id="i-reabrir" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5"/><path d="M5.1 15a7.5 7.5 0 1 0 .5-6L4 9"/></symbol>
    <symbol id="i-arquivo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></symbol>
    <symbol id="i-balao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5z"/></symbol>
    <symbol id="i-local" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
    <symbol id="i-calendario" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></symbol>
    <symbol id="i-sair" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/></symbol>
    <symbol id="i-recarregar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5v5h-5"/><path d="M19 15a7.5 7.5 0 1 1-1.3-7.8L20 10"/></symbol>
    <!-- Tipos -->
    <symbol id="i-duvida" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.4M12 17h.01"/></symbol>
    <symbol id="i-melhoria" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.5.5.8 1.2.8 1.9V16h6v-.5c0-.7.3-1.4.8-1.9A6 6 0 0 0 12 3z"/></symbol>
    <symbol id="i-manutencao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.3 5.3L3.5 17.5l3 3 5.9-5.9a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.3-.6-.6-2.3 2.3-2.5z"/></symbol>
    <symbol id="i-obra" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></symbol>
    <symbol id="i-reclamacao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 10v4h3l6 4.5V5.5L7 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/></symbol>
    <!-- Urgência: barras -->
    <symbol id="i-urg-1" viewBox="0 0 16 16"><rect x="1" y="10" width="3.5" height="5" rx="1" fill="currentColor"/><rect x="6.25" y="6" width="3.5" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.25"/><rect x="11.5" y="2" width="3.5" height="13" rx="1" fill="none" stroke="currentColor" stroke-width="1.25"/></symbol>
    <symbol id="i-urg-2" viewBox="0 0 16 16"><rect x="1" y="10" width="3.5" height="5" rx="1" fill="currentColor"/><rect x="6.25" y="6" width="3.5" height="9" rx="1" fill="currentColor"/><rect x="11.5" y="2" width="3.5" height="13" rx="1" fill="none" stroke="currentColor" stroke-width="1.25"/></symbol>
    <symbol id="i-urg-3" viewBox="0 0 16 16"><rect x="1" y="10" width="3.5" height="5" rx="1" fill="currentColor"/><rect x="6.25" y="6" width="3.5" height="9" rx="1" fill="currentColor"/><rect x="11.5" y="2" width="3.5" height="13" rx="1" fill="currentColor"/></symbol>
  </defs>
</svg>`;

document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
});
