# Especificação de UI do MVP

> Issue #4 · responsável: `zidane` · implementação: `beckham` (issue #3 em diante)
>
> Fonte de produto e regras: [`docs/arquitetura-mvp.md`](../arquitetura-mvp.md). Este documento não muda regra de negócio; quando a UI precisa de algo que o plano não fixa, o ponto vai para a seção [Pendências](#12-pendências).
>
> Mockups: [`docs/ui/mockups/index.html`](mockups/index.html) (abra no navegador; usa Tailwind e Flowbite via CDN).

## Sumário

1. [Princípios e decisões](#1-princípios-e-decisões)
2. [Tokens](#2-tokens)
3. [Componentes: Flowbite e `shared/ui`](#3-componentes-flowbite-e-sharedui)
4. [Shells, navegação e breakpoints](#4-shells-navegação-e-breakpoints)
5. [Telas](#5-telas)
6. [Visibilidade por papel na UI](#6-visibilidade-por-papel-na-ui)
7. [Fluxos principais](#7-fluxos-principais)
8. [Microcopy](#8-microcopy)
9. [Acessibilidade](#9-acessibilidade)
10. [Para a implementação](#10-para-a-implementação)
11. [Mockups](#11-mockups)
12. [Pendências](#12-pendências)

---

## 1. Princípios e decisões

**Quem usa e onde.** O morador usa o celular, em pé, no elevador ou na garagem, muitas vezes com uma mão só. O síndico usa o celular no dia a dia e o computador para tratar a fila. Por isso, o projeto parte de 375px. O desktop é uma ampliação, não a referência.

**Princípios**

1. **Consequência antes da ação.** Se uma escolha muda quem vê o conteúdo (tipo Reclamação, anonimato, comentário público ou nota interna), a UI diz o efeito no momento da escolha, e não depois.
2. **Status é a informação principal de um card.** A cor fica reservada para status, urgência e alertas. O tipo usa só ícone e texto, em badge neutro.
3. **Uma ação primária por bloco.** O botão primário (fundo azul) indica o próximo passo. As demais ações são secundárias (contorno) ou texto.
4. **Nada depende só de cor.** Todo badge tem texto, toda urgência tem ícone de barras e todo erro tem ícone e mensagem.
5. **Todo dado remoto tem quatro estados:** carregando, vazio, erro e resultado parcial.

**Decisões de design**

| Decisão | Escolhido | Descartado e por quê |
|---|---|---|
| Cor primária | Azul `#1d4ed8` (Tailwind `blue-700`), igual ao padrão do Flowbite | Cor de marca própria: não há guia de marca. O azul padrão evita sobrescrever cada exemplo do Flowbite e é trocável pelo token `primaria` quando houver marca. |
| Fonte | Pilha do sistema (`font-sans` padrão do Tailwind) | Inter (sugerida pela doc do Flowbite): seria fonte nova, sem aprovação, e custa download no 4G. |
| Tema escuro | Fora do MVP. `color-scheme: light` | Dobraria a verificação de contraste. Os tokens são semânticos, então dá para adicionar o tema depois sem trocar classe nas telas. |
| Cor do tipo | Badge neutro com ícone | Uma cor por tipo: com 5 status, 3 urgências e 5 tipos, a paleta deixaria de ter significado. |
| Urgência | Três níveis (Baixa, Média, Alta) com ícone de barras e "Não triada" tracejado | Escala numérica: menos legível. **O enum ainda depende de confirmação; ver Pendências.** |
| Modais e drawers | `<dialog>` nativo com `showModal()`, estilizado com classes Flowbite | Modal JS do Flowbite: não move o foco para dentro, não devolve o foco ao fechar e não prende o Tab. O `<dialog>` faz tudo isso nativamente e sem biblioteca. |
| Data do prazo | `<input type="date">` nativo | Datepicker do Flowbite: seletor nativo do celular é melhor no toque e no leitor de tela, e não exige JS. |
| Fila do admin no celular | Cards empilhados; tabela a partir de 768px | Tabela com rolagem horizontal em 375px: esconde colunas, e com isso a pessoa perde contexto. |
| Navegação do morador | Bottom-nav com 4 destinos (Condomínio, Minhas, Nova, Perfil) só nas telas raiz | Bottom-nav em todas as telas: no formulário, rouba espaço do teclado e um toque acidental descarta o rascunho. |
| Paginação | Botão "Carregar mais" (cursor) | Rolagem infinita: tira o rodapé do alcance, confunde o leitor de tela e não permite voltar ao ponto. |
| Senha | Botão "Mostrar senha" e nenhum campo de confirmação | Campo "Confirmar senha": dobra o esforço; mostrar a senha resolve o erro de digitação com menos atrito. |

---

## 2. Tokens

Os tokens são **semânticos**: o nome diz o papel, não a cor. Os valores vêm da paleta padrão do Tailwind, para não criar cor nova. O código das telas usa **só** os nomes desta seção. Classe de cor crua (`bg-blue-700`, `text-gray-600`) fica restrita a `shared/ui`, e mesmo lá só quando o token não cobre o caso.

Os contrastes foram calculados pela fórmula de luminância relativa da WCAG 2.x. O piso é AA: 4.5:1 para texto normal e 3:1 para texto grande e para elementos de interface.

### 2.1 Cores base

| Token (classe) | Valor | Origem Tailwind | Uso | Contraste |
|---|---|---|---|---|
| `primaria` | `#1d4ed8` | blue-700 | Fundo do botão primário, links, item ativo da navegação | Branco sobre ela: **6.70**. Como texto sobre branco: **6.70**; sobre `superficie-app`: **6.41** |
| `primaria-hover` | `#1e40af` | blue-800 | Hover e pressionado do botão primário | Branco sobre ela: **8.72** |
| `primaria-foco` | `#2563eb` | blue-600 | Anel de foco (2px, com folga de 2px) e borda do campo em foco | Sobre branco: **5.17**; sobre `superficie-app`: **4.95** |
| `primaria-suave` | `#eff6ff` | blue-50 | Fundo do item selecionado (radio card, item ativo da sidebar) | `primaria` sobre ela: **6.16** |
| `texto` | `#111827` | gray-900 | Texto principal e fundo do chip ativo | Sobre branco: **17.74** |
| `texto-secundario` | `#4b5563` | gray-600 | Dicas, meta, rótulos do badge de tipo, ícones de ação | Sobre branco: **7.56**; sobre `superficie-sutil`: **6.87** |
| `texto-suave` | `#6b7280` | gray-500 | Data, número da ocorrência, placeholder | Sobre branco: **4.83**; sobre `superficie-app`: **4.63**. **Não usar sobre `superficie-sutil`** (4.39, reprova) |
| `superficie` | `#ffffff` | white | Cards, campos, barras, modais | — |
| `superficie-app` | `#f9fafb` | gray-50 | Fundo da página | — |
| `superficie-sutil` | `#f3f4f6` | gray-100 | Hover de botão neutro, prefixo de input, skeleton | — |
| `borda` | `#e5e7eb` | gray-200 | Borda **decorativa**: card, divisória, barra | Decorativa, isenta de contraste mínimo |
| `borda-controle` | `#6b7280` | gray-500 | Borda de **controle**: input, select, textarea, botão secundário, trilho do toggle desligado | Sobre branco: **4.83** (passa no 3:1). A borda `gray-300` padrão do Flowbite dá **1.47** e é proibida em controles. |

**Feedback**

| Token | Valores (fundo · texto · linha) | Uso | Contraste do texto |
|---|---|---|---|
| `perigo` | `perigo` `#b91c1c` · `perigo-hover` `#991b1b` · `perigo-suave` `#fef2f2` · `perigo-texto` `#991b1b` · `perigo-borda` `#dc2626` · `perigo-linha` `#fecaca` | Botão destrutivo, erro de campo, orientação de emergência, toast de erro | Branco sobre `perigo`: **6.47**; `perigo-texto` sobre `perigo-suave`: **7.60**; `perigo` sobre branco: **6.47**; `perigo-borda` sobre branco: **4.83** |
| `sucesso` | `sucesso-suave` `#f0fdf4` · `sucesso-texto` `#166534` · `sucesso-linha` `#bbf7d0` | Toast de sucesso, comentário de resolução | **6.81** |
| `info` | `info-suave` `#eff6ff` · `info-texto` `#1e40af` · `info-linha` `#bfdbfe` | Aviso de anonimato, aviso de duplicada | **8.01** |
| `aviso` | `aviso-suave` `#fff7ed` · `aviso-texto` `#9a3412` · `aviso-linha` `#fed7aa` | Conflito de versão, avisos que não são erro | **6.88** |

### 2.2 Cores semânticas do domínio

**Status da ocorrência** (badge com fundo tintado, ponto colorido decorativo e rótulo)

| Status | Rótulo | Fundo | Texto | Ponto | Contraste |
|---|---|---|---|---|---|
| `ABERTA` | Aberta | `status-aberta-fundo` `#dbeafe` | `status-aberta-texto` `#1e40af` | `#2563eb` | **7.15** |
| `EM_ANDAMENTO` | Em andamento | `status-andamento-fundo` `#fef9c3` | `status-andamento-texto` `#854d0e` | `#ca8a04` | **6.38** |
| `RESOLVIDA` | Resolvida | `status-resolvida-fundo` `#dcfce7` | `status-resolvida-texto` `#166534` | `#16a34a` | **6.49** |
| `ARQUIVADA` | Arquivada | `status-arquivada-fundo` `#f3f4f6` | `status-arquivada-texto` `#374151` | `#6b7280` | **9.37** |
| `DUPLICADA` | Duplicada | `status-duplicada-fundo` `#f3e8ff` | `status-duplicada-texto` `#6b21a8` | `#9333ea` | **7.39** |

**Tipo da ocorrência** (badge neutro: fundo `superficie`, borda `borda` decorativa, texto `texto-secundario` com **7.56** de contraste e ícone de 14px)

| Tipo (rótulo longo, usado em formulário e filtro) | Rótulo curto (badge) | Ícone | Visibilidade |
|---|---|---|---|
| Manutenção em área comum | Manutenção | chave inglesa | Todos os moradores ativos |
| Reclamação | Reclamação | megafone | **Só o autor e a administração**. Leva também o marcador "Restrita" na visão do admin e em "Minhas" |
| Dúvida | Dúvida | interrogação em círculo | Todos os moradores ativos |
| Melhoria | Melhoria | lâmpada | Todos os moradores ativos |
| Mudança ou obra | Mudança ou obra | caixa | Todos os moradores ativos |

**Urgência** (só admin; badge tintado, ícone de 3 barras e rótulo; o leitor de tela lê "Urgência alta")

| Urgência | Fundo | Texto | Ícone | Contraste |
|---|---|---|---|---|
| Não triada (`null`) | `superficie` com borda **tracejada** `borda-controle` | `texto-secundario` | sem ícone | **7.56** (texto); borda **4.83** |
| Baixa | `urgencia-baixa-fundo` `#f3f4f6` | `urgencia-baixa-texto` `#374151` | 1 barra cheia | **9.37** |
| Média | `urgencia-media-fundo` `#ffedd5` | `urgencia-media-texto` `#9a3412` | 2 barras cheias | **6.38** |
| Alta | `urgencia-alta-fundo` `#fee2e2` | `urgencia-alta-texto` `#991b1b` | 3 barras cheias | **6.80** |

**Marcadores**

| Marcador | Aparência | Contraste | Onde |
|---|---|---|---|
| Atrasada | Fundo **sólido** `atrasada-fundo` `#b91c1c`, texto branco e ícone de relógio. É o único badge sólido do sistema, para se distinguir de "Alta" | **6.47** | Card, tabela e detalhe, para todos que veem o prazo |
| Restrita | Badge neutro com cadeado | **7.56** | Reclamação, na visão do admin e em "Minhas" |
| Anônima / Anônimo | Texto `texto-suave` com ícone de olho cortado, na linha de meta (não é badge) | **4.83** | Card, detalhe e timeline |
| Nota interna | Card `interna-fundo` `#fffbeb`, borda esquerda 4px `interna-borda` `#d97706`, rótulo "NOTA INTERNA" com cadeado em `interna-rotulo` `#92400e` e texto `interna-texto` `#78350f` | Rótulo **6.84**; texto **8.75**. Borda decorativa (o rótulo e o cadeado carregam a informação) | Timeline do admin |

### 2.3 Tipografia

Pilha do sistema: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` (padrão `font-sans` do Tailwind). Números de contador e de tabela usam `tabular-nums`.

| Papel | Classe | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|---|
| Título de destaque | `text-3xl md:text-4xl` | 30/36 → 36/40 | 700 | Só na landing |
| Título da página (h1) | `text-xl md:text-2xl` | 20/28 → 24/32 | 700 | Uma vez por tela |
| Título de seção (h2) | `text-lg` | 18/28 | 600 | "Histórico", blocos do painel |
| Título de card ou modal | `text-base` | 16/24 | 600 | Título da ocorrência no card, título de modal |
| Corpo | `text-base` | 16/24 | 400 | Descrição, comentários e **todo campo de formulário** (16px evita o zoom automático do iOS) |
| Apoio | `text-sm` | 14/20 | 400 · 500 · 600 | Rótulo de campo (600), dica, meta, botão (600) |
| Sobretítulo | `text-sm uppercase tracking-wide` | 14/20 | 600 | Seções do painel de gestão ("TRIAGEM", "STATUS", "PRAZO") |
| Badge e rótulo da bottom-nav | `text-xs` | 12/20 | 500 · 600 | **Único uso permitido de 12px** |

### 2.4 Espaçamento e layout

A escala de 4px do Tailwind fica como está. Os tokens de layout abaixo são as combinações que as telas usam.

| Token | Valor | Classe | Uso |
|---|---|---|---|
| Margem lateral | 16px abaixo de 768px · 24px a partir de 768px · 32px no admin a partir de 1024px | `px-4 md:px-6 lg:px-8` | Conteúdo de todas as telas |
| Respiro de card | 16px (compacto: 12px) | `p-4` / `p-3` | Card, alerta, modal / radio card, bolha da timeline |
| Entre campos | 24px | `space-y-6` | Formulários |
| Rótulo → dica → campo | 2px → 8px | `mt-0.5` / `mt-2` | Dentro de um campo |
| Entre cards de lista | 12px | `space-y-3` | Feed, Minhas, fila |
| Entre seções | 32px | `mt-8` | Detalhe (descrição → histórico → comentário) |
| Barra superior | 56px | `h-14` | Todas as áreas abaixo de 1024px |
| Bottom-nav | 64px + `env(safe-area-inset-bottom)` | `h-barra-inferior` | Morador, telas raiz |
| Folga para a bottom-nav | 112px | `pb-28` | `main` das telas com bottom-nav |
| Largura de leitura | 672px | `max-w-conteudo` | Área do morador e área pública |
| Largura do admin | 1152px | `max-w-admin` | Conteúdo do admin |
| Sidebar do admin | 256px | `w-64` | A partir de 1024px |
| Coluna de gestão | 352px | `xl:grid-cols-[minmax(0,1fr)_22rem]` | Detalhe do admin a partir de 1280px |
| Alvo de toque | 44px | `min-h-toque`, `h-toque w-toque` | Todo controle interativo |

### 2.5 Raio, borda e elevação

| Token | Valor | Classe | Uso |
|---|---|---|---|
| `controle` | 8px | `rounded-controle` | Botão, input, select, textarea, radio card |
| `cartao` | 12px | `rounded-cartao` | Card, alerta, toast, modal no desktop |
| folha | 16px só no topo | `rounded-t-2xl` | Bottom sheet no celular |
| pílula | 9999px | `rounded-full` | Badge, chip de visão, toggle |

| Nível | Tratamento | Uso |
|---|---|---|
| 0 | Borda `borda`, sem sombra | Card, barra superior, bottom-nav, sidebar |
| 1 | `shadow-lg` | Toast, menu suspenso |
| 2 | `shadow-xl` com fundo `rgb(17 24 39 / .5)` | Modal, bottom sheet, drawer |

### 2.6 Movimento

| Token | Duração e curva | Uso |
|---|---|---|
| `rapido` | 150ms `ease-out` | Hover, foco, toggle, troca de cor |
| `medio` | 200ms `ease-out` na entrada e 150ms `ease-in` na saída | Modal (fade + escala de 0.98), bottom sheet e drawer (deslizamento) |
| skeleton | `animate-pulse` (2s) | Carregamento |

Com `prefers-reduced-motion: reduce`, nada desliza nem escala, o skeleton fica estático e as transições caem para ~0ms (regra global em `styles.css`, igual à de `mockups/assets/mockup.css`).

### 2.7 Mapeamento para o Tailwind

A issue #3 decide a versão. As duas formas abaixo geram **as mesmas classes**, e os mockups usam a forma v3 ([`mockups/assets/mockup.js`](mockups/assets/mockup.js)).

**Tailwind v4 (`@theme` em `apps/web/src/styles.css`)**, com Flowbite 3:

```css
@import "tailwindcss";
@plugin "flowbite/plugin";
@source "../node_modules/flowbite";

@theme {
  /* base */
  --color-primaria: #1d4ed8;  --color-primaria-hover: #1e40af;  --color-primaria-foco: #2563eb;
  --color-primaria-suave: #eff6ff;  --color-primaria-borda: #bfdbfe;
  --color-texto: #111827;  --color-texto-secundario: #4b5563;  --color-texto-suave: #6b7280;  --color-texto-inverso: #ffffff;
  --color-superficie: #ffffff;  --color-superficie-app: #f9fafb;  --color-superficie-sutil: #f3f4f6;
  --color-borda: #e5e7eb;  --color-borda-controle: #6b7280;
  /* feedback */
  --color-perigo: #b91c1c;  --color-perigo-hover: #991b1b;  --color-perigo-suave: #fef2f2;
  --color-perigo-texto: #991b1b;  --color-perigo-borda: #dc2626;  --color-perigo-linha: #fecaca;
  --color-sucesso-suave: #f0fdf4;  --color-sucesso-texto: #166534;  --color-sucesso-linha: #bbf7d0;
  --color-info-suave: #eff6ff;  --color-info-texto: #1e40af;  --color-info-linha: #bfdbfe;
  --color-aviso-suave: #fff7ed;  --color-aviso-texto: #9a3412;  --color-aviso-linha: #fed7aa;
  /* status */
  --color-status-aberta-fundo: #dbeafe;  --color-status-aberta-texto: #1e40af;  --color-status-aberta-ponto: #2563eb;
  --color-status-andamento-fundo: #fef9c3;  --color-status-andamento-texto: #854d0e;  --color-status-andamento-ponto: #ca8a04;
  --color-status-resolvida-fundo: #dcfce7;  --color-status-resolvida-texto: #166534;  --color-status-resolvida-ponto: #16a34a;
  --color-status-arquivada-fundo: #f3f4f6;  --color-status-arquivada-texto: #374151;  --color-status-arquivada-ponto: #6b7280;
  --color-status-duplicada-fundo: #f3e8ff;  --color-status-duplicada-texto: #6b21a8;  --color-status-duplicada-ponto: #9333ea;
  /* urgência e marcadores */
  --color-urgencia-baixa-fundo: #f3f4f6;  --color-urgencia-baixa-texto: #374151;
  --color-urgencia-media-fundo: #ffedd5;  --color-urgencia-media-texto: #9a3412;
  --color-urgencia-alta-fundo: #fee2e2;   --color-urgencia-alta-texto: #991b1b;
  --color-atrasada-fundo: #b91c1c;  --color-atrasada-texto: #ffffff;
  --color-interna-fundo: #fffbeb;  --color-interna-texto: #78350f;  --color-interna-rotulo: #92400e;  --color-interna-borda: #d97706;
  /* forma e medida */
  --radius-controle: 0.5rem;  --radius-cartao: 0.75rem;
  --spacing-toque: 2.75rem;  --spacing-barra-inferior: 4rem;
  --container-conteudo: 42rem;  --container-admin: 72rem;
  --default-transition-duration: 150ms;
}
```

Se o tema padrão do Flowbite 3 for importado, aponte as variáveis de marca dele (família `--color-brand*`; confira os nomes na versão instalada) para `var(--color-primaria)` e seus pares. Assim, componentes copiados da documentação herdam a primária.

**Tailwind v3 (`tailwind.config.js`)**, com Flowbite 2: é o mesmo objeto de `theme.extend` de [`mockups/assets/mockup.js`](mockups/assets/mockup.js), mais `plugins: [require('flowbite/plugin')]` e `content: ['./src/**/*.{html,ts}', './node_modules/flowbite/**/*.js']`.

**Pares proibidos** (reprovam AA): `texto-suave` sobre `superficie-sutil`; qualquer `gray-300` ou `gray-400` como borda de controle ou trilho de toggle; texto branco sobre `primaria-foco`; `interna-borda` como texto.

---

## 3. Componentes: Flowbite e `shared/ui`

**Regra:** as telas usam apenas componentes de `apps/web/src/app/shared/ui`. O Flowbite serve de **referência de marcação e classes** para esses componentes. O **comportamento** (abrir, fechar, foco, `aria-expanded`) fica no Angular, com signals. O `initFlowbite()` não é necessário para nada nesta lista. Motivo: os componentes JS do Flowbite manipulam o DOM fora do ciclo do Angular, se perdem quando a rota troca e não gerenciam o foco como a WCAG exige. Isto revisa a linha "initFlowbite() nos componentes interativos" de `arquitetura-mvp.md`; ver Pendências.

Os nomes de seletor são sugestões. O prefixo `ui-` segue a pasta.

| Necessidade | Componente `shared/ui` | Base Flowbite | Variantes e entradas | Estados obrigatórios | Notas de acessibilidade |
|---|---|---|---|---|---|
| Ação | `ui-botao` (também como `a[ui-botao]`) | Buttons | `primario` · `secundario` (contorno `borda-controle`) · `texto` · `perigo` (sólido) · `perigo-contorno`; `bloco` (largura total abaixo de 768px); `icone` (quadrado 44px, exige `rotulo`) | repouso, hover (`primaria-hover` / `superficie-sutil`), foco visível, ativo (= hover), desabilitado (`opacity-50`, `cursor-not-allowed`, `aria-disabled`), **carregando** (spinner + rótulo no gerúndio + `aria-busy`, sem clique duplo) | Altura mínima de 44px. Botão só com ícone exige `aria-label`. Não use `disabled` para esconder um erro de validação: deixe enviar e mostre o erro. |
| Campo de texto | `ui-campo` | Input field | `tipo` (text, tel, email, password com botão "Mostrar senha"), `rotulo`, `dica`, `erro`, `opcional`, `prefixo` ("#"), `mascara` (telefone) | repouso (borda `borda-controle`), foco (borda `primaria-foco` + anel 2px a 30%), **erro** (borda 2px `perigo-borda` + mensagem `perigo` com ícone), desabilitado (`superficie-sutil`), somente leitura | `<label for>` sempre visível (placeholder não é rótulo). `aria-describedby` = dica + erro. `aria-invalid="true"` no erro. Texto de 16px. |
| Texto longo | `ui-area-texto` | Textarea | `rotulo`, `dica`, `min`, `max`, `contador` | iguais aos do `ui-campo` + contador `n/max` (`tabular-nums`) | O contador não é `aria-live` a cada tecla. Ele anuncia só ao cruzar o mínimo e ao faltarem 100 para o máximo. |
| Escolha em lista | `ui-select` | Select (nativo) | `rotulo`, `opcoes`, `placeholder` (opção desabilitada) | como `ui-campo` | `<select>` nativo; nada de select customizado no MVP. |
| Tipo da ocorrência | `ui-opcoes-cartao` | Radio (variante "advanced") | `opcoes: {valor, rotulo, descricao, icone, aviso?}` | repouso, hover, **selecionado** (borda `primaria` + anel 1px + fundo `primaria-suave` + o próprio radio marcado), foco (anel global no radio), erro (mensagem abaixo da legenda) | `<fieldset>` + `<legend>`. Setas trocam a opção (comportamento nativo do radio). O card inteiro é o `<label>`. |
| Liga/desliga | `ui-alternador` | Toggle | `rotulo`, `dica` | desligado (trilho `borda-controle`), ligado (`primaria`), foco (anel no trilho), desabilitado | `<input type="checkbox" role="switch">`. Toda a linha (rótulo + trilho) é o alvo de 44px. |
| Data | `ui-campo` com `tipo="date"` | — (nativo) | `min` (hoje) | como `ui-campo` | Seletor nativo. Exibição sempre em `dd/mm/aaaa`. |
| Status | `ui-badge-status` | Badge (pill) | `status` | — (não interativo) | Texto sempre visível; o ponto é `aria-hidden`. |
| Tipo | `ui-badge-tipo` | Badge (com borda) | `tipo`, `curto` | — | Ícone `aria-hidden`. |
| Urgência | `ui-badge-urgencia` | Badge | `urgencia` (`null` = Não triada) | — | Prefixo "Urgência" em `sr-only`. **Nunca é renderizado na área do morador.** |
| Marcadores | `ui-marcador` | Badge | `atrasada` · `restrita` | — | — |
| Card de ocorrência | `ui-cartao-ocorrencia` | Card | `contexto: 'feed' \| 'minhas' \| 'admin'` controla quais campos aparecem (ver seção 6) | repouso, hover (borda `gray-300`), foco (anel no card inteiro via `:has(a:focus-visible)`) | O único link é o título (`<a>` com `::after` cobrindo o card); badges e meta não são focáveis. Lista em `<ul>`/`<li>`, card em `<article>`. |
| Tabela da fila | `ui-tabela` (só a fila no MVP) | Table | colunas fixas (5.15) | linha com hover; foco no link do título | `<caption class="sr-only">`, `<th scope="col">`. Nenhuma linha clicável com `onclick`: o link é o título. |
| Histórico | `ui-timeline` | Timeline (vertical) | `eventos` (catálogo em 6.3), `visao: 'morador' \| 'admin'` | vazio impossível (sempre há "registrou") | `<ol>` em ordem cronológica. Cada item tem `<time datetime>`. O ícone do evento é `aria-hidden`; o texto diz o que houve. |
| Comentar | `ui-comentario-form` | Textarea + Button Group | `permiteInterno` (admin) | ocioso, enviando, erro (mantém o texto) | No admin, o grupo "Público / Nota interna" é um `<fieldset>` de radios; a dica e o rótulo do botão mudam com a escolha. |
| Alerta inline | `ui-alerta` | Alert | `info` · `aviso` · `perigo` · `sucesso`; `titulo`; `acao?` | — | `role="alert"` só para erro que surge depois de uma ação; texto fixo (emergência, anonimato) é `<aside>`/`<p>` simples. |
| Toast | `ui-toast` + `ToastService` | Toast | `sucesso` · `erro` | entrando, visível, saindo | Região única `aria-live="polite"` (sucesso) e `role="alert"` (erro) no shell. Sucesso fecha em 5s, com pausa no hover e no foco; erro só fecha manualmente. O botão fechar tem 44px. |
| Modal / bottom sheet | `ui-modal` | Modal (só visual) | `titulo`, `tamanho`, `tipo: 'dialog' \| 'alertdialog'` | abrindo, aberto, enviando (botões desabilitados), erro (dentro do modal) | `<dialog>` + `showModal()`. Abaixo de 768px vira bottom sheet (`rounded-t-2xl`, alinhado à base). Foco inicial no primeiro campo, ou no botão **não destrutivo** em confirmações. Esc fecha. O foco volta ao botão que abriu. |
| Drawer | `ui-drawer` | Drawer | `lado: 'esquerda' \| 'base'` | — | Também `<dialog>`. Usado pelo menu do admin abaixo de 1024px e pelos filtros da fila abaixo de 768px. |
| Navegação do morador | `ui-bottom-nav` | Bottom Navigation | itens fixos | ativo (`primaria` + `aria-current="page"`), hover | `<nav aria-label="Navegação principal">`. Célula de 64px de altura. |
| Barra superior | `ui-barra-superior` | Navbar | `modo: 'raiz' \| 'empilhada'` | — | Na empilhada, o botão voltar tem `aria-label` específico ("Voltar para ocorrências"). |
| Sidebar do admin | `ui-sidebar` | Sidebar | itens por papel | ativo, hover, contador (pendentes) | O contador tem texto `sr-only` ("3 cadastros pendentes"). |
| Abas | `ui-abas` | Tabs (estilo sublinhado) | `abas: {rotulo, contador?, rota}` | ativa, hover, foco | São **links de rota** (`aria-current="page"`), não `role="tab"`: cada aba é uma URL (`?aba=pendentes`). Rolam na horizontal abaixo de 640px. |
| Visões rápidas | `ui-chips-visao` | Button Group / pills | `visoes: {rotulo, contador?, query}` | ativa (fundo `texto`, letra branca, **17.74**), inativa (contorno `borda-controle`) | Links com `aria-current="true"`. Rolagem horizontal com a última visível pela metade como pista. |
| Vazio | `ui-estado-vazio` | — | `icone`, `titulo`, `texto`, `acao?` | — | O título é um `<h2>`/`<h3>` conforme a tela. |
| Erro de carga | `ui-estado-erro` | Alert | `titulo`, `texto`, `tentarDeNovo()` | — | `role="alert"`. O botão "Tentar de novo" recebe o foco se o erro surgiu depois de uma ação. |
| Carregando | `ui-skeleton` | Skeleton | `forma: 'cartao' \| 'linha-tabela' \| 'detalhe'`, `quantidade` | — | Contêiner com `aria-busy="true"` + texto `sr-only` "Carregando…". Formas `aria-hidden`. |
| Paginação | `ui-carregar-mais` | Button | `carregando`, `fim` | ocioso, carregando, fim ("Isso é tudo."), erro (resultado parcial, 5.0) | Depois de carregar, o foco vai para o primeiro item novo. |
| Contador do painel | `ui-cartao-numero` | Card | `rotulo`, `valor`, `destino`, `tom` | repouso, hover, foco | O card inteiro é um link; o nome acessível é "Não triadas: 3". |
| Copiar | `ui-copiar` | Clipboard | `valor`, `rotulo` | ocioso, copiado ("Link copiado" por 2s) | O feedback é anunciado em `aria-live`. |

---

## 4. Shells, navegação e breakpoints

### 4.1 Breakpoints

São os padrões do Tailwind, e cada um se justifica pelo conteúdo.

| Faixa | Justificativa | O que muda |
|---|---|---|
| 320–767px | Uma coluna. Abaixo de ~720px a fila não cabe em tabela | Bottom-nav (morador), barra superior com menu (admin), cards na fila, modais como bottom sheet, botões de largura total |
| ≥ 768px (`md`) | A tabela da fila com 6 colunas pede ~720px; os 4 destinos do morador cabem na barra superior | Morador: a bottom-nav some e a navegação vai para a barra superior. Admin: tabela na fila, filtros inline. Modais centralizados (`max-w-lg`), botões com largura do conteúdo |
| ≥ 1024px (`lg`) | Sidebar de 256px + 768px de conteúdo mantém a tabela legível | Admin: sidebar fixa; a barra superior some |
| ≥ 1280px (`xl`) | 256 (sidebar) + ~600 (conteúdo) + 352 (gestão) + respiros | Detalhe do admin em 2 colunas; coluna "Autor" na tabela |

Largura mínima suportada: 320px, sem rolagem horizontal da página. Só a linha de chips rola por dentro.

### 4.2 Shells

| Shell | Abaixo de 768px | A partir de 768px |
|---|---|---|
| **Público** (`/`, `/cadastrar-condominio`, `/c/:slug/*`, `/trocar-senha`) | Barra de 56px com o nome do produto ou do condomínio; conteúdo em `max-w-conteudo` | Igual, centralizado. Formulários em card branco com `max-w-md` |
| **Morador** (`/app/*`) | **Telas raiz** (Condomínio, Minhas, Perfil): barra com o nome do condomínio e bottom-nav. **Telas empilhadas** (Nova, Detalhe): barra com voltar ou fechar e o título, sem bottom-nav | Barra superior com o nome do condomínio, links Condomínio · Minhas · Perfil e botão primário "Nova ocorrência". Nas empilhadas, o link "← Minhas ocorrências" ou "← Condomínio" fica acima do h1 |
| **Admin** (`/admin/*`) | Barra com menu (drawer à esquerda) e o nome do condomínio. Nas empilhadas, o voltar no lugar do menu | ≥ 1024px: sidebar fixa com o condomínio, os itens, a pessoa logada ("Ana Lima · Síndica") e "Sair" |

**Itens da sidebar por papel:** Painel · Ocorrências · Moradores (com contador de pendentes) · Equipe\* · Condomínio\*. \*Só o síndico vê. Para o subsíndico, os itens não existem; não ficam desabilitados.

**Na troca de rota:** o `document.title` vira `"{Título da tela} · {Condomínio}"`, o foco vai para o `h1` (`tabindex="-1"`) e a rolagem volta ao topo, exceto no "voltar" para uma lista, que restaura a posição.

---

## 5. Telas

Convenção de cada tela: **objetivo**, **conteúdo em ordem de leitura** (é também a ordem do DOM e do foco), **ações**, **estados** e **375px vs. desktop**. Os estados comuns estão em 5.0, e cada tela só registra o que difere deles.

### 5.0 Estados padrão (valem para toda tela com dado remoto)

| Estado | Comportamento | Mockup |
|---|---|---|
| Carregando (primeira carga) | Skeleton na forma do conteúdo. Até 300ms não mostra nada, para evitar o piscar. Se passar de 10s, mantém o skeleton e acrescenta o texto "Está demorando mais que o normal…" | `estados.html` #1 |
| Vazio | `ui-estado-vazio` com ícone, título que diz o que falta e próxima ação | #2, #3 |
| Erro (nada carregou) | `ui-estado-erro` com "Tentar de novo". Para 404 e 403, ver 5.21 | #4 |
| Resultado parcial | Mantém os itens já carregados e mostra o erro inline no lugar do "Carregar mais", com "Tentar de novo" | #5 |
| Ação enviando | O botão da ação fica em "carregando"; os demais controles do bloco ficam desabilitados | #6 |
| Ação com erro | Erro de validação (422): no campo. Outros: toast de erro e o formulário mantém o que foi digitado | #6, #7 |
| Conflito (409, versão) | Alerta `aviso` no topo do bloco com "Recarregar ocorrência". Nada é sobrescrito sem aviso | #8 |

### 5.1 Landing `/`

- **Objetivo:** explicar o produto ao síndico e levar ao cadastro do condomínio; levar quem já usa ao login.
- **Conteúdo:**
  1. Título de destaque: "Ocorrências do condomínio, organizadas".
  2. Subtítulo em uma frase: os moradores registram pelo celular e o síndico acompanha tudo num só lugar.
  3. Botão primário "Cadastrar meu condomínio".
  4. Três blocos curtos: "Moradores registram em 1 minuto", "Reclamações ficam restritas à administração" e "Prazos e histórico em cada ocorrência".
  5. Bloco "Já usa?": campo "Endereço do seu condomínio" com prefixo `…/c/` e botão "Ir para o login" (leva a `/c/:slug/entrar`).
- **Estados:** endereço inexistente → erro no campo "Não encontramos esse condomínio. Confira o endereço com a administração."
- **375 vs. desktop:** uma coluna; a partir de 768px, os três blocos ficam em 3 colunas.

### 5.2 Cadastro do condomínio `/cadastrar-condominio` e sucesso

- **Objetivo:** o síndico cria o condomínio e a própria conta.
- **Conteúdo:** h1 "Cadastre seu condomínio". Fieldset "Condomínio": Nome do condomínio, Endereço do link (slug). Fieldset "Seus dados (síndico)": Nome, Telefone, Bloco, Apartamento, E-mail (opcional), Senha.
- **Slug:**
  - é preenchido a partir do nome (minúsculas, sem acento, hífen) até a pessoa editar;
  - mostra uma prévia "`seudominio/c/jardim-das-flores`";
  - a disponibilidade é verificada com debounce de 400ms e o resultado aparece abaixo do campo ("Disponível", com ícone de check, em `sucesso-texto`; ou "Já está em uso. Tente outro.");
  - regras: 3 a 40 caracteres, `a-z`, `0-9` e `-`.
- **Ações:** "Criar condomínio" (primário, bloco).
- **Sucesso** (mesma rota, outro estado, foco no h1):
  - h1 "Condomínio criado";
  - card com o link `/c/:slug`, `ui-copiar` "Copiar link" e o texto "Envie este link aos moradores ou imprima o QR code na tela Condomínio";
  - botão "Ir para o painel".
- **Erros:** 409 de slug → no campo do slug; 409 de telefone → no campo do telefone.

### 5.3 Página do condomínio `/c/:slug`

- **Conteúdo:**
  1. Nome do condomínio (h1).
  2. "Registre e acompanhe as ocorrências do condomínio pelo celular."
  3. Botão primário "Criar meu cadastro".
  4. Botão secundário "Já tenho cadastro".
  5. Texto pequeno: "Seu cadastro precisa ser aprovado pela administração."
- **Estados:** slug inexistente → página "Condomínio não encontrado", com "Confira o link com a administração do seu condomínio." e um link para a landing. Condomínio inativo → mesma mensagem (não revela o status).

### 5.4 Cadastro do morador `/c/:slug/cadastro`

- **Conteúdo:** h1 "Criar cadastro" e subtítulo com o nome do condomínio. Campos:
  - Nome completo;
  - Telefone (celular): máscara `(11) 91234-5678`, `inputmode="tel"`, `autocomplete="tel-national"`;
  - Bloco e Apartamento, lado a lado mesmo em 375px (2 colunas de 50%);
  - E-mail (opcional), com a dica "Só para contato da administração.";
  - Senha: com "Mostrar senha" e a dica "Mínimo de 8 caracteres.".
- **Ação:** "Enviar cadastro".
- **Erro 409 de telefone:** no campo: "Este telefone já tem cadastro neste condomínio. [Entrar]".
- **Sucesso:** vai para `/c/:slug/aguardando-aprovacao`.

### 5.5 Login `/c/:slug/entrar`

- **Conteúdo:** h1 "Entrar", nome do condomínio, Telefone, Senha (com "Mostrar senha") e "Entrar" (primário, bloco). Abaixo:
  - "Esqueceu a senha? Peça à administração do condomínio para redefinir." (texto, não é link: não existe reset por conta própria);
  - "Ainda não tem cadastro? Criar cadastro".
- **Erros** (num `ui-alerta perigo` acima do formulário, com foco movido para ele):

| Situação | Mensagem |
|---|---|
| Credenciais inválidas | "Telefone ou senha incorretos." |
| PENDENTE | "Seu cadastro ainda aguarda aprovação da administração." |
| RECUSADO | "Seu cadastro não foi aprovado. Fale com a administração do condomínio." |
| INATIVO | "Seu acesso está desativado. Fale com a administração do condomínio." |
| 429 | "Muitas tentativas. Aguarde {n} minutos e tente de novo." (n vem do `Retry-After`; sem ele, "Aguarde alguns minutos…") |

- **Sucesso:** com senha temporária vai para `/trocar-senha`; senão, morador vai para `/app/ocorrencias` e admin para `/admin/painel`. Com `?voltar=` válido (rota interna), volta para ela.

### 5.6 Aguardando aprovação `/c/:slug/aguardando-aprovacao`

Ícone de relógio, h1 "Cadastro enviado", o texto "A administração do {condomínio} precisa aprovar seu acesso. Depois disso, entre com seu telefone e senha." e o botão "Ir para o login". Não há polling.

### 5.7 Trocar senha `/trocar-senha`

- **Modo obrigatório** (depois de login com senha temporária):
  - h1 "Crie sua nova senha" e o texto "Você entrou com uma senha temporária. Para continuar, crie uma senha só sua.";
  - campos: Nova senha (com "Mostrar senha");
  - ação: "Salvar e continuar";
  - não há navegação para outras áreas; existe só "Sair".
- **Modo voluntário** (pelo Perfil): pede também a "Senha atual" e tem "Cancelar".
- **Erros:**
  - senha igual à temporária → "Escolha uma senha diferente da temporária.";
  - curta → "A senha precisa ter pelo menos 8 caracteres.".

### 5.8 Feed do condomínio `/app/ocorrencias` (morador) · mockup [`feed.html`](mockups/feed.html)

- **Objetivo:** ver o que está acontecendo no condomínio e evitar registrar de novo o que já foi registrado.
- **Conteúdo:**
  1. h1 "Ocorrências do condomínio".
  2. Linha de apoio: "Ocorrências públicas dos moradores. Reclamações ficam visíveis só para quem registrou e para a administração."
  3. Lista de `ui-cartao-ocorrencia contexto="feed"`, das mais recentes para as mais antigas.
  4. "Carregar mais".
- **Card (ordem):**
  - linha de badges: status, Atrasada (se houver) e tipo curto, com o número `#61` alinhado à direita;
  - título (link, até 2 linhas);
  - trecho da descrição (até 2 linhas, `text-sm`);
  - meta: autor (seção 6.1) · tempo relativo · "Prazo dd/mm" (se houver).
  - Nas próprias ocorrências, a meta começa com "Sua".
- **Estados:**
  - vazio: "Nenhuma ocorrência pública ainda", com o texto "Dúvidas, melhorias, manutenções e avisos de obra registrados pelos moradores aparecem aqui." e o botão "Registrar ocorrência";
  - erro: "Não foi possível carregar as ocorrências.".
- **375 vs. desktop:** igual, em coluna de 672px; a partir de 768px a navegação vai para a barra superior.

### 5.9 Minhas ocorrências `/app/minhas`

- **Conteúdo:** h1 "Minhas ocorrências" e lista com `contexto="minhas"`. É o mesmo card do feed, com duas diferenças:
  - a meta mostra "Anônima" (ícone) quando for o caso;
  - Reclamação ganha o marcador "Restrita".
- Inclui todas as próprias: reclamações, anônimas e encerradas.
- **Destaque pós-criação:** ao chegar da Nova ocorrência, o card novo fica no topo com fundo `primaria-suave` por 3s (fade de 600ms; sem animação com movimento reduzido), e o toast "Ocorrência #63 registrada." aparece.
- **Vazio:** "Você ainda não registrou ocorrências", com "Quando algo precisar de atenção no condomínio, registre por aqui." e "Registrar ocorrência".

### 5.10 Nova ocorrência `/app/nova` (morador) · mockup [`nova-ocorrencia.html`](mockups/nova-ocorrencia.html)

- **Objetivo:** registrar em ~1 minuto, sabendo quem vai ver.
- **Barra (375px):** botão fechar (X, `aria-label="Cancelar e voltar"`) + "Nova ocorrência". Sem bottom-nav.
- **Conteúdo, em ordem:**
  1. **Orientação de emergência** (fixa, não fecha, sempre no topo): título "Risco imediato?", o texto "Fogo, vazamento de gás, alagamento ou pessoa ferida: acione a portaria ou ligue 193 (Bombeiros). Este canal não tem atendimento em tempo real." e o botão-link `tel:193` "Ligar para 193", com 44px. Usa o tom `perigo` suave.
  2. "Todos os campos são obrigatórios, exceto os marcados como opcionais."
  3. **Tipo da ocorrência:** `ui-opcoes-cartao` com 5 opções. Cada uma tem ícone, rótulo longo e descrição de uma linha (seção 8.2). A opção Reclamação traz também a linha com cadeado "Visível só para você e para a administração".
     - Abaixo do grupo, um texto dinâmico (`aria-live="polite"`) diz a visibilidade da escolha atual: "Todos os moradores do condomínio vão ver esta ocorrência." ou "Só você e a administração vão ver esta ocorrência. Ela não aparece no feed do condomínio.".
     - Nada vem pré-selecionado.
  4. **Título:** com a dica "Resuma em poucas palavras."; de 5 a 100 caracteres.
  5. **Descrição:** com a dica "Conte o que aconteceu, quando e onde. Mínimo de 20 caracteres."; contador `n/2000`.
  6. **Local (opcional):** com a dica "Ex.: garagem G2, hall do bloco B, salão de festas."
  7. **Anonimato:** card com `ui-alternador` "Registrar como anônima" e a dica "Ninguém vê quem registrou: nem os outros moradores, nem a administração." Ligado, abre logo abaixo um `ui-alerta info` com "**Seu nome não aparece.** Evite se identificar no texto: não cite seu nome, seu apartamento ou detalhes que revelem quem você é."
  8. Ações: "Registrar ocorrência" (primário, bloco) e "Cancelar" (texto).
- **Validação:** ao sair do campo (depois do primeiro toque) e no envio. No envio com erro, o foco vai para o primeiro campo inválido. As mensagens estão em 8.4.
- **Enviando:** "Registrando…". **Sucesso:** vai para `/app/minhas` com destaque e toast (5.9).
- **Descartar:** fechar ou voltar com algum campo preenchido abre o `alertdialog` "Descartar ocorrência?", com "O que você escreveu será perdido." e os botões "Continuar escrevendo" (foco inicial) e "Descartar".
- **375 vs. desktop:** a partir de 768px, o h1 aparece no conteúdo, o formulário fica em 672px e os botões ficam à direita com largura do conteúdo.

### 5.11 Detalhe da ocorrência `/app/ocorrencias/:id` (morador) · mockup [`detalhe-morador.html`](mockups/detalhe-morador.html)

- **Barra (375px):** voltar + "Ocorrência #57".
- **Conteúdo:**
  1. Badges: status, Atrasada e tipo (+ "Restrita" se for Reclamação e a pessoa for o autor).
  2. h1 com o título.
  3. Lista de definições:
     - "Registrada por" (seção 6.1);
     - "Criada em";
     - "Local" (se houver);
     - "Prazo" (se houver; vermelho com o marcador "Atrasada" quando vencido);
     - "Resolvida em" ou "Arquivada em" (se encerrada).
  4. **Aviso de duplicada** (se DUPLICADA), em `ui-alerta info`: "Esta ocorrência foi marcada como duplicada da **#48 · Em andamento**. O acompanhamento continua por lá." O #48 é link quando a principal é visível para quem está vendo. Quando é restrita, aparece só o número e o status, sem link, e o texto termina com "Os detalhes dela não são públicos.".
  5. Descrição, em card, preservando as quebras de linha.
  6. **Bloco de ação do autor** (só para o autor):
     - ABERTA: link-botão "Retirar ocorrência" (`perigo-contorno`), que abre um `alertdialog` (`estados.html` #11).
     - RESOLVIDA/ARQUIVADA dentro de 30 dias: card "O problema continua?", com "Você pode reabrir até dd/mm/aaaa. A ocorrência volta para Aberta e passa por nova análise da administração." e o botão "Reabrir ocorrência", que abre o modal com a justificativa obrigatória (#10).
     - Depois de 30 dias: no lugar do botão, "O prazo para reabrir terminou em dd/mm/aaaa. Se o problema voltou, registre uma nova ocorrência." (com link).
     - EM_ANDAMENTO e DUPLICADA: nada.
  7. **Histórico** (`ui-timeline visao="morador"`).
  8. **Comentar** (só o autor):
     - textarea com a dica de visibilidade: "A administração e os moradores do condomínio podem ler seu comentário." quando é pública; "Só a administração lê seu comentário." quando é Reclamação;
     - botão "Enviar comentário".
     - Quem não é o autor vê, no lugar, o texto "Só quem registrou e a administração podem comentar nesta ocorrência."
- **Estados:**
  - 404, ou ocorrência que deixou de ser visível (tipo corrigido para Reclamação): página "Ocorrência não encontrada", com "Ela pode ter sido removida da visualização pública." e "Voltar para o condomínio";
  - comentário enviando: o botão fica em "Enviando…" e, no sucesso, o comentário entra no fim da timeline e o campo é limpo.
- **375 vs. desktop:** igual, em 672px; o link "← Minhas ocorrências" fica acima dos badges.

### 5.12 Perfil `/app/perfil`

- **Conteúdo:**
  - h1 "Perfil";
  - card com os dados somente leitura: Nome, Telefone, Bloco e apartamento, E-mail;
  - o texto "Para alterar seus dados, fale com a administração.";
  - botão secundário "Trocar senha" (leva a `/trocar-senha` no modo voluntário);
  - botão texto "Sair", com confirmação.
- A exclusão de conta fica para a issue #25: o lugar reservado é o fim da página, com o botão `perigo-contorno` "Excluir minha conta".

### 5.13 Painel `/admin/painel`

- **Conteúdo:** h1 "Painel" e uma grade de `ui-cartao-numero`, cada um com link para a fila já filtrada:
  - Em aberto;
  - Não triadas;
  - Atrasadas (tom `perigo` quando > 0);
  - Urgência alta, média e baixa (em aberto);
  - Cadastros pendentes (link para Moradores › Pendentes).
- **Condomínio novo (todos os contadores em 0 e nenhum morador):** substitui a grade por "Primeiros passos", com 3 itens:
  1. Compartilhe o link ou o QR code (link para Condomínio);
  2. Aprove os cadastros;
  3. Convide um subsíndico (opcional; só síndico).
- **375 vs. desktop:** 2 colunas → 4 colunas a partir de 1024px.

### 5.14 Fila de ocorrências `/admin/ocorrencias` · mockup [`fila-admin.html`](mockups/fila-admin.html)

- **Objetivo:** achar o que precisa de ação agora.
- **Conteúdo:**
  1. h1 "Ocorrências" + botão primário "Nova ocorrência" ("Nova" abaixo de 640px).
  2. **Visões rápidas** (`ui-chips-visao`), com contadores: **Em aberto** (padrão: ABERTA + EM_ANDAMENTO) · Não triadas · Atrasadas · Encerradas (RESOLVIDA, ARQUIVADA, DUPLICADA) · Todas.
  3. **Filtros:** Tipo e Urgência (Não triada, Alta, Média, Baixa).
     - Abaixo de 768px: botão "Filtros" (com "(n)" quando houver filtro ativo) que abre um bottom sheet com "Limpar" e "Ver resultados".
     - A partir de 768px: selects inline que aplicam na hora.
     - O total ("12 ocorrências") fica em `aria-live="polite"`.
  4. **Lista:**
     - abaixo de 768px, cards `contexto="admin"`: número, status, urgência ou "Não triada", Atrasada / título / tipo · autor · tempo ou prazo;
     - a partir de 768px, tabela com as colunas Nº · Ocorrência (título-link + tipo) · Status · Urgência · Prazo (data; vermelho + Atrasada se vencido) · Autor (a partir de 1280px) · Criada.
  5. "Carregar mais".
- **Ordem:** mais recentes primeiro (é a ordem do cursor; ver Pendências).
- **URL:** visão e filtros vivem na query (`?visao=nao-triadas&tipo=RECLAMACAO`), para que voltar do detalhe e o link do painel caiam na mesma lista.
- **Estados:**
  - vazio sem filtro e sem nenhuma ocorrência: "Nenhuma ocorrência registrada ainda", com "Compartilhe o link do condomínio para os moradores começarem a registrar." e "Ver link e QR code" (síndico) ou nenhum botão (subsíndico);
  - vazio com filtro: "Nenhuma ocorrência com esses filtros", com o resumo dos filtros e "Limpar filtros";
  - visão "Não triadas" vazia: "Tudo triado. Nenhuma ocorrência esperando urgência.".

### 5.15 Nova ocorrência (admin) `/admin/ocorrencias/nova`

O mesmo formulário de 5.10, com estas diferenças:

- sem anonimato;
- sem orientação de emergência;
- texto no topo: "A ocorrência fica registrada como da administração. Para os moradores, o autor aparece como 'Administração'.";
- o sucesso vai para o detalhe admin da nova ocorrência, com toast.

### 5.16 Detalhe da ocorrência `/admin/ocorrencias/:id` · mockup [`detalhe-admin.html`](mockups/detalhe-admin.html)

- **Conteúdo, coluna principal:**
  1. Badges: status, urgência (ou Não triada), Atrasada, tipo e Restrita.
  2. h1.
  3. Lista de definições:
     - Autor: "Nome · Bloco B, apto 302", com telefone em link `tel:`; "Anônimo" com ícone; ou "Administração";
     - Criada em;
     - Local;
     - Prazo;
     - "Visível para": "Todos os moradores" ou "Autor e administração";
     - "Tipo escolhido pelo morador", quando o confirmado difere.
  4. Descrição.
  5. **Gestão** (abaixo de 1280px fica aqui; a partir de 1280px vai para a coluna lateral, `sticky top-6`).
  6. Histórico (`visao="admin"`, com notas internas).
  7. Comentar.
- **Gestão:** card com 3 seções.
  - **Triagem:**
    - "Urgência" (select; placeholder desabilitado "Escolha a urgência" enquanto não triada), com a dica "O morador não vê a urgência.";
    - "Tipo" (select, com os 5 tipos), com a dica "Escolhido pelo morador: {tipo}".
    - Ao mudar o tipo, o texto de efeito (`aria-live`) muda:

      | Mudança | Texto de efeito |
      |---|---|
      | Para Reclamação | "Ao salvar, a ocorrência sai do feed e fica visível só para o autor e a administração." |
      | De Reclamação para outro tipo | "Ao salvar, a ocorrência passa a aparecer para todos os moradores ativos." Se for anônima: "O autor continua anônimo." |

    - Botão "Salvar triagem" (primário), habilitado só quando há mudança.
  - **Status:** as ações dependem do status atual (seção 6.4). Cada ação abre um modal quando exige texto: Resolver (comentário público obrigatório), Arquivar (motivo obrigatório, visível para o autor), Duplicada (número da principal com prévia; #13). "Iniciar atendimento" e "Desvincular" executam direto, com toast e evento.
  - **Prazo:**
    - date `min=hoje` + "Definir" (ou "Alterar" quando já existe), com a dica "Ao definir um prazo, a ocorrência passa para Em andamento." (só quando ABERTA);
    - desabilitado em RESOLVIDA, ARQUIVADA e DUPLICADA, com a dica "Reabra a ocorrência para definir prazo."
- **Comentar:**
  - fieldset "Público / Nota interna" (padrão Público);
  - a dica muda conforme a escolha:
    - Público: "O autor vê este comentário." (restrita) ou "O autor e os moradores do condomínio veem este comentário." (pública);
    - Nota interna: "Só a administração vê esta nota.";
  - o botão muda junto: "Publicar comentário" ou "Salvar nota interna";
  - com "Nota interna" selecionada, o rótulo fica em tom `interna`, para que o modo seja percebido antes de enviar.
- **Estados:** 409 de versão em qualquer ação da gestão → alerta de conflito no topo do card Gestão (#8).

### 5.17 Moradores `/admin/moradores`

- **Abas (`ui-abas`):** Pendentes (contador) · Ativos · Inativos · Recusados. A aba Inativos existe porque reativar exige ver os inativos; ver Pendências sobre a issue #8.
- **Item:** nome; bloco e apto; telefone (link `tel:`); data do cadastro. São cards abaixo de 768px e tabela a partir de 768px.
- **Ações por aba:**

  | Aba | Ações |
  |---|---|
  | Pendentes | "Aprovar" (primário, executa direto, com toast "Cadastro de {nome} aprovado.") e "Recusar" (secundário; modal com motivo obrigatório: "O motivo fica registrado na auditoria.") |
  | Ativos | Menu "Mais ações" (botão ícone de 44px com `aria-expanded`): "Redefinir senha" e "Inativar" (alertdialog: "{nome} perde o acesso na hora. Você pode reativar depois.") |
  | Inativos | "Reativar" |
  | Recusados | Só leitura, com o motivo |

- **Redefinir senha:**
  - o modal de resultado mostra a senha temporária em fonte mono `text-lg`, com `ui-copiar`;
  - aviso `aviso`: "Anote ou copie agora: esta senha não aparece de novo. Entregue a {nome} pessoalmente ou por mensagem direta.";
  - botão único "Já anotei".
- **Vazio por aba:**
  - Pendentes: "Nenhum cadastro esperando aprovação.";
  - Ativos: "Nenhum morador ativo ainda. Compartilhe o link do condomínio.".

### 5.18 Equipe `/admin/equipe` (só síndico)

- **Conteúdo:** h1 "Equipe", com o texto "Até 2 administradores: o síndico e um subsíndico." e dois cartões de vaga.
  - **Síndico:** você.
  - **Subsíndico** ocupado: nome, telefone, "Redefinir senha" e "Remover do cargo" (alertdialog: "{nome} volta a ser morador e perde o acesso à administração.").
  - **Subsíndico** vazio: "Nenhum subsíndico", com as ações "Promover um morador" (modal com select de moradores ativos) e "Cadastrar novo" (modal com nome, telefone, bloco e apto; depois, a senha temporária é exibida uma vez, como em 5.17).
- **Limite:** com a vaga ocupada, as ações de adicionar não aparecem. Se a API devolver 409: toast "O condomínio já tem 2 administradores."

### 5.19 Condomínio `/admin/condominio` (só síndico)

- **Dados:** Nome, editável, com "Salvar". O endereço do link (slug) aparece somente leitura, com a dica "Para trocar o endereço, fale com o suporte: os QR codes impressos deixariam de funcionar." (ver Pendências).
- **Link de cadastro:**
  - a URL completa em campo somente leitura;
  - "Copiar link";
  - QR code de 240px, com área de respiro branca de 16px;
  - "Baixar QR code (PNG)";
  - "Imprimir cartaz".
- **Cartaz:** rota ou `@media print` com o nome do condomínio, o QR de 8cm, "Aponte a câmera do celular para se cadastrar e registrar ocorrências" e a URL em texto. Em A4 retrato, preto no branco.

### 5.20 Telas globais

| Situação | Tela |
|---|---|
| Rota inexistente | "Página não encontrada", com o link para o início da área do papel |
| 403 (morador em `/admin`, subsíndico em Equipe) | Redireciona para o início da área do papel, com o toast "Você não tem acesso a essa página." |
| 401 / sessão revogada | Vai para `/c/:slug/entrar?voltar=…`, com o alerta "Sua sessão terminou. Entre de novo." |
| Sem conexão (falha de rede) | Toast de erro "Sem conexão. Verifique a internet e tente de novo." O formulário mantém os dados |

### 5.21 404 e 403 de recurso

O detalhe de uma ocorrência de outro condomínio, ou que não é visível, mostra **a mesma** tela de "Ocorrência não encontrada" nos dois casos. A UI não distingue um do outro, para não vazar existência.

---

## 6. Visibilidade por papel na UI

A UI renderiza o que o presenter devolve. As tabelas abaixo dizem **como** mostrar cada caso e servem de checklist para o e2e de anonimato. **O `autor_id` nunca é usado na UI.**

### 6.1 Como o autor aparece

| Quem vê ↓ / ocorrência → | De morador, identificada | De morador, anônima | Da administração |
|---|---|---|---|
| O próprio autor | "Você · Bloco B" | "Você (anônima)" | — |
| Outro morador | "Bloco B" | "Anônima" (ícone) | "Administração" |
| Síndico / subsíndico | "Maria Souza · Bloco B, apto 302" + telefone no detalhe | "Anônimo" (ícone), sem bloco | "Administração" |

### 6.2 O que cada um vê

| Campo ou elemento | Autor | Outro morador | Admin |
|---|---|---|---|
| Ocorrência do tipo Reclamação | Sim (com "Restrita") | **Não aparece** | Sim (com "Restrita") |
| Urgência e "Não triada" | **Não** | **Não** | Sim |
| Prazo e "Atrasada" | Sim | Sim | Sim |
| Tipo efetivo | Sim | Sim | Sim + "escolhido pelo morador" quando difere |
| Comentários públicos | Sim | Sim (só nas públicas) | Sim |
| Notas internas | **Não** | **Não** | Sim |
| Comentar | Sim (só nas próprias) | Não | Sim (público ou interno) |
| Retirar / Reabrir | Conforme status e janela | Não | Ações do admin (6.4) |

### 6.3 Catálogo de eventos da timeline

`{ator}` é o rótulo de quem fez o evento:

- na visão do morador: "Você", "Síndico", "Subsíndico", "Autor (Bloco B)" ou "Autor anônimo";
- na visão do admin: os mesmos papéis, e o autor como "Maria Souza" ou "Autor anônimo".

| Evento | Texto | Ícone e tom | Morador vê |
|---|---|---|---|
| Criada | "{ator} registrou a ocorrência" (admin: "… como {tipo}") | + neutro | Sim |
| Atendimento iniciado | "{ator} iniciou o atendimento" | relógio, andamento | Sim |
| Prazo definido / alterado | "{ator} definiu o prazo para {data}" / "{ator} alterou o prazo de {de} para {para}"; se mudou o status, acrescenta "e a ocorrência passou para Em andamento" | calendário, andamento | Sim |
| Tipo corrigido | "{ator} alterou o tipo de {de} para {para}" | etiqueta, neutro | Sim |
| Urgência definida | "{ator} definiu a urgência como {nível}" | barras, neutro | **Não** |
| Comentário | Bolha com {ator}, hora e texto | balão, primária | Sim |
| Nota interna | Bolha `interna` com "NOTA INTERNA" | cadeado, interna | **Não** |
| Resolvida | "{ator} marcou como Resolvida" + bolha `sucesso` com o comentário | check, resolvida | Sim |
| Arquivada | "{ator} arquivou" + bolha com o motivo | arquivo, arquivada | Sim |
| Retirada | "{ator} retirou a ocorrência" | arquivo, arquivada | Sim |
| Reaberta pelo autor | "{ator} reabriu a ocorrência" + bolha com a justificativa | seta circular, aberta | Sim |
| Reaberta pelo admin | "{ator} reabriu a ocorrência e a colocou Em andamento" | seta circular, andamento | Sim |
| Marcada como duplicada | "{ator} marcou como duplicada da #{n}" | elo, duplicada | Sim |
| Vínculo desfeito | "{ator} desfez o vínculo com a #{n}" | elo, neutro | Sim |

### 6.4 Ações por status

| Status | Admin | Autor (morador) |
|---|---|---|
| ABERTA | Iniciar atendimento · Definir prazo · Marcar como duplicada · Arquivar | Retirar |
| EM_ANDAMENTO | **Resolver** (primário) · Alterar prazo · Marcar como duplicada · Arquivar | — |
| RESOLVIDA | Reabrir | Reabrir (até 30 dias) |
| ARQUIVADA | Reabrir | Reabrir (até 30 dias) |
| DUPLICADA | Desvincular | — |

Triagem e comentário do admin ficam disponíveis em qualquer status.

---

## 7. Fluxos principais

### 7.1 Onboarding do condomínio

```mermaid
flowchart LR
  A["/ (landing)"] -->|Cadastrar meu condomínio| B["/cadastrar-condominio"]
  B -->|Criar condomínio| C["Sucesso: link /c/:slug + Copiar"]
  C -->|Ir para o painel| D["/admin/painel (Primeiros passos)"]
  D -->|Compartilhe o link| E["/admin/condominio: QR, baixar, imprimir"]
```

### 7.2 Cadastro e primeiro acesso do morador

```mermaid
flowchart TD
  Q["QR ou link"] --> P["/c/:slug"]
  P -->|Criar meu cadastro| C["/c/:slug/cadastro"]
  C -->|Enviar cadastro| W["/c/:slug/aguardando-aprovacao"]
  W -.->|admin aprova em /admin/moradores| L["/c/:slug/entrar"]
  P -->|Já tenho cadastro| L
  L -->|senha temporária| T["/trocar-senha"]
  L -->|morador| F["/app/ocorrencias"]
  L -->|admin| AP["/admin/painel"]
  T --> F
  L -->|PENDENTE / RECUSADO / INATIVO| L
```

### 7.3 Ciclo da ocorrência com as ações da UI

```mermaid
stateDiagram-v2
  [*] --> ABERTA: Registrar ocorrência
  ABERTA --> EM_ANDAMENTO: Iniciar atendimento / Definir prazo (admin)
  ABERTA --> ARQUIVADA: Arquivar + motivo (admin) / Retirar (autor)
  ABERTA --> DUPLICADA: Marcar como duplicada (admin)
  EM_ANDAMENTO --> RESOLVIDA: Resolver + comentário (admin)
  EM_ANDAMENTO --> ARQUIVADA: Arquivar + motivo (admin)
  EM_ANDAMENTO --> DUPLICADA: Marcar como duplicada (admin)
  RESOLVIDA --> EM_ANDAMENTO: Reabrir (admin)
  ARQUIVADA --> EM_ANDAMENTO: Reabrir (admin)
  RESOLVIDA --> ABERTA: Reabrir + justificativa, até 30 dias (autor)
  ARQUIVADA --> ABERTA: Reabrir + justificativa, até 30 dias (autor)
  DUPLICADA --> EM_ANDAMENTO: Desvincular (admin)
```

### 7.4 Ponta a ponta do teste visual (arquitetura, "Verificação")

1. Síndico cadastra o condomínio (5.2).
2. Morador A se cadastra pelo QR (5.3, 5.4).
3. Síndico aprova (5.17).
4. A registra uma Reclamação anônima: o texto dinâmico avisa "Só você e a administração…" e o alerta de anonimato aparece (5.10).
5. A registra uma Dúvida; B vê no feed só "Bloco A" (5.8).
6. Síndico tria e define o prazo; vê "Anônimo" na reclamação (5.16).
7. Síndico resolve, com comentário.
8. A reabre, com justificativa (5.11).

---

## 8. Microcopy

**Tom:** direto, em segunda pessoa ("você"), sem jargão de sistema ("registro", "entidade") e sem culpar quem usa. Verbos no infinitivo nos botões ("Registrar ocorrência"), no gerúndio durante o envio ("Registrando…"). Sem ponto de exclamação, exceto no sucesso do cadastro.

### 8.1 Rótulos do domínio

| Enum | Rótulo |
|---|---|
| `ABERTA` · `EM_ANDAMENTO` · `RESOLVIDA` · `ARQUIVADA` · `DUPLICADA` | Aberta · Em andamento · Resolvida · Arquivada · Duplicada |
| urgência `null` · `BAIXA` · `MEDIA` · `ALTA` | Não triada · Baixa · Média · Alta |
| papel `SINDICO` · `SUBSINDICO` · `MORADOR` | Síndico · Subsíndico · Morador (o gênero segue o cadastro quando a UI exibe a pessoa: "Ana Lima · Síndica") |
| status de usuário `PENDENTE` · `ATIVO` · `INATIVO` · `RECUSADO` | Pendente · Ativo · Inativo · Recusado |

### 8.2 Tipos no formulário

| Tipo | Descrição de uma linha |
|---|---|
| Manutenção em área comum | Algo quebrado ou com defeito: elevador, portão, iluminação, vazamento. |
| Reclamação | Barulho, conduta de vizinho ou de funcionário, uso indevido de área comum. + "Visível só para você e para a administração" |
| Dúvida | Pergunta sobre regras, horários ou funcionamento do condomínio. |
| Melhoria | Sugestão para deixar o condomínio melhor. |
| Mudança ou obra | Aviso ou pedido sobre mudança ou obra em unidade. |

### 8.3 Datas e números

- **Tempo relativo nas listas:**
  - < 1 min: "agora";
  - < 60 min: "há N min";
  - < 24 h: "há N h";
  - ontem: "ontem";
  - < 7 dias: "há N dias";
  - depois: `dd/mm/aaaa`.
- O `<time datetime>` sempre carrega o ISO, e o `title` traz a data completa.
- **No detalhe:** `dd/mm/aaaa às HH:mm`. Fuso: `America/Sao_Paulo`.
- **Prazo:** só data (`dd/mm/aaaa`; nas listas, `dd/mm` quando é do ano corrente). Fica atrasado a partir do dia seguinte ao prazo.
- **Número:** sempre `#57`; o leitor de tela lê "número 57" via `aria-label` no contexto do título da página ("Ocorrência número 57").
- **Telefone:** exibido `(11) 91234-5678`.

### 8.4 Validação

| Campo | Regra | Mensagem |
|---|---|---|
| Tipo | obrigatório | "Escolha o tipo da ocorrência." |
| Título | obrigatório; 5–100 | "Informe um título." / "Use pelo menos 5 caracteres." |
| Descrição | obrigatório; 20–2000 | "Descreva a ocorrência." / "A descrição precisa ter pelo menos 20 caracteres." |
| Justificativa (reabrir) | obrigatório; ≥ 10 | "Conte por que está reabrindo." |
| Comentário de resolução | obrigatório | "Escreva o que foi feito para resolver." |
| Motivo (arquivar / recusar) | obrigatório | "Informe o motivo." |
| Número da duplicada | obrigatório; existente; ≠ a própria; não duplicada | "Informe o número da ocorrência principal." / "Não encontramos a ocorrência #{n}." / "Escolha uma ocorrência diferente desta." / "A #{n} já é duplicada da #{m}. Vincule à #{m}." |
| Nome | obrigatório | "Informe seu nome." |
| Telefone | celular BR válido | "Informe um celular com DDD, como (11) 91234-5678." |
| Bloco / Apartamento | obrigatório | "Informe o bloco." / "Informe o apartamento." |
| E-mail | formato, se preenchido | "Confira o e-mail." |
| Senha | ≥ 8 | "A senha precisa ter pelo menos 8 caracteres." |
| Slug | 3–40, `a-z0-9-`, único | "Use só letras minúsculas, números e hífen." / "Já está em uso. Tente outro." |
| Prazo | ≥ hoje | "Escolha uma data a partir de hoje." |

### 8.5 Erros de requisição (fora de campo)

| Situação | Mensagem |
|---|---|
| Rede | "Sem conexão. Verifique a internet e tente de novo." |
| 500 / inesperado | "Algo deu errado do nosso lado. Tente de novo em instantes." |
| 401 | "Sua sessão terminou. Entre de novo." |
| 403 | "Você não tem acesso a essa página." |
| 404 (ocorrência) | "Ocorrência não encontrada." |
| 409 (versão) | "Esta ocorrência foi alterada por outra pessoa. Recarregue para ver a versão atual e tente de novo." |
| 409 (transição inválida) | "Esta ação não está mais disponível para esta ocorrência. Recarregue para ver o status atual." |
| 409 (reabrir fora da janela) | "O prazo de 30 dias para reabrir já terminou." |
| 409 (limite de admins) | "O condomínio já tem 2 administradores." |
| 429 | "Muitas tentativas. Aguarde {n} minutos e tente de novo." |

### 8.6 Toasts de sucesso

| Ação | Mensagem |
|---|---|
| Registrar | "Ocorrência #{n} registrada." |
| Comentário | "Comentário enviado." |
| Nota interna | "Nota interna salva." |
| Triagem | "Triagem salva." |
| Prazo | "Prazo definido para {data}." |
| Iniciar atendimento | "Atendimento iniciado." |
| Resolver | "Ocorrência marcada como resolvida." |
| Arquivar | "Ocorrência arquivada." |
| Retirar | "Ocorrência retirada." |
| Reabrir | "Ocorrência reaberta." |
| Duplicada | "Vinculada à #{n}." |
| Desvincular | "Vínculo desfeito." |
| Aprovar | "Cadastro de {nome} aprovado." |
| Recusar | "Cadastro recusado." |
| Inativar | "{nome} foi inativado." |
| Reativar | "{nome} foi reativado." |
| Link | "Link copiado." |

### 8.7 Textos fixos de regra (não editar sem revisar com produto)

- **Emergência:** "Risco imediato? Fogo, vazamento de gás, alagamento ou pessoa ferida: acione a portaria ou ligue 193 (Bombeiros). Este canal não tem atendimento em tempo real."
- **Anonimato** (dica): "Ninguém vê quem registrou: nem os outros moradores, nem a administração." **Anonimato** (aviso ligado): "Seu nome não aparece. Evite se identificar no texto: não cite seu nome, seu apartamento ou detalhes que revelem quem você é."
- **Reclamação:** "Visível só para você e para a administração."
- **Urgência** (admin): "O morador não vê a urgência."
- **Nota interna:** "Só a administração vê esta nota."

---

## 9. Acessibilidade

Piso: **WCAG 2.2 AA**. Os itens abaixo valem para revisão de PR.

**Contraste**
- Todos os pares da seção 2 foram verificados (valores na própria tabela). Um par novo exige cálculo e registro aqui.
- Borda de controle, trilho de toggle e anel de foco: ≥ 3:1 contra o fundo adjacente.

**Foco**
- Anel único: `outline: 2px solid #2563eb; outline-offset: 2px` em `:focus-visible`, global.
- Proibido `outline: none` sem substituto.
- O card de lista mostra o anel no card inteiro (`:has(a:focus-visible)`).
- O foco nunca fica escondido sob a barra fixa: `scroll-padding-top: 4rem` no `html` e `scroll-padding-bottom: 5rem` nas telas com bottom-nav.
- **Movimento de foco:**
  - troca de rota → h1;
  - abrir modal → primeiro campo, ou o botão não destrutivo em `alertdialog`;
  - fechar modal → elemento que abriu;
  - erro de envio → primeiro campo inválido;
  - "Carregar mais" → primeiro item novo;
  - excluir/mover item da lista → item seguinte.

**Teclado**
- Tudo operável com Tab, Shift+Tab, Enter, Espaço, Esc e setas (nos radios).
- O primeiro item de toda página é o link "Pular para o conteúdo".
- A ordem do DOM é a ordem visual. Na coluna de gestão em `xl`, o DOM mantém a gestão **depois** da descrição, como no celular.

**Alvos de toque**
- ≥ 44 × 44px em todo controle (`min-h-toque`).
- Pelo menos 8px entre alvos adjacentes.
- Links dentro de texto corrido são isentos, mas links de ação isolados não.

**Rótulos e nomes**
- Todo campo tem `<label>` visível; placeholder não é rótulo.
- Grupos de radio usam `<fieldset>`/`<legend>`.
- Botões só com ícone têm `aria-label` com verbo e objeto ("Fechar filtros", "Voltar para ocorrências").
- Ícones decorativos têm `aria-hidden="true"`.

**Estrutura e ARIA**
- Um `h1` por tela; os níveis de título não pulam.
- Landmarks: `header`, `nav` (com `aria-label` distinto quando há mais de um), `main`, `aside` (gestão).
- Item ativo de navegação com `aria-current="page"`.
- Badges são texto simples. A urgência tem o prefixo `sr-only` "Urgência".
- Toggle é `role="switch"`.
- Mensagem de erro de campo é ligada por `aria-describedby`, com `aria-invalid="true"`.
- Regiões vivas:
  - toast de sucesso: `polite`;
  - toast de erro: `role="alert"`;
  - total da fila: `polite`;
  - texto de visibilidade do tipo: `polite`;
  - contador de caracteres: só nos limiares.

**Cor e forma**
- Status, urgência, atrasada, nota interna, erro e seleção sempre têm texto e/ou ícone além da cor (seção 1, princípio 4).

**Movimento**
- `prefers-reduced-motion` respeitado (2.6). Nenhuma animação passa de 200ms nem se repete, exceto o skeleton.

**Zoom e texto**
- Layout íntegro com zoom de 200% e com `text-spacing` aumentado.
- Nenhum texto em imagem; o QR code tem a URL em texto ao lado.

**Idioma**
- `<html lang="pt-BR">`.

---

## 10. Para a implementação

**Fazer**
1. Criar os tokens da seção 2.7 **antes** de qualquer tela (issue #3) e os componentes de `shared/ui` da seção 3 na ordem em que as issues pedem:
   - #3: botão, campo, select, alerta, toast, modal, bottom-nav, barra, sidebar e estados;
   - #12: opções-cartão, alternador e área de texto;
   - #13: badges, cartão de ocorrência e timeline.
2. Mapear enum → rótulo, ícone e token num único lugar (ex.: `shared/ui/dominio.ts`), consumindo `packages/contratos`. Os badges recebem o enum, nunca a string pronta.
3. Toda chamada remota numa tela passa pelos 4 estados de 5.0. O "carregando" do botão bloqueia o clique duplo.
4. Formulários reativos com as mensagens da seção 8.4. Erro 422 da API mapeado para o campo correspondente.
5. Guardar a visão e os filtros da fila na URL, e a rolagem ao voltar do detalhe.
6. Registrar nesta especificação qualquer componente, token ou texto novo no mesmo PR que o introduz.

**Não fazer**
- Classe de cor crua do Tailwind ou valor arbitrário (`bg-[#…]`, `p-[13px]`) fora de `shared/ui`.
- Renderizar urgência, nota interna ou dados do autor anônimo **condicionando só no template**. Se o campo não veio da API, ele não existe; a UI não "esconde" dado recebido.
- Usar a borda `gray-300` do Flowbite em controles, ou `outline-none` sem anel.
- Usar `initFlowbite()` ou o JS do Flowbite em modal, drawer, dropdown e tabs.
- Bottom-nav em tela empilhada; mais de um botão primário por bloco.
- Fonte, biblioteca de ícones ou de componentes nova sem aprovação (ver Pendências: ícones e QR code).

---

## 11. Mockups

[`docs/ui/mockups/`](mockups/) tem HTML estático com Tailwind (Play CDN 3.4) e os tokens da seção 2, em [`assets/mockup.js`](mockups/assets/mockup.js). Abra [`index.html`](mockups/index.html) no navegador: os quadros são iframes de 375 × 812. Cada arquivo aberto sozinho é responsivo e mostra o comportamento em telas largas.

| Arquivo | Tela | Cenário |
|---|---|---|
| `nova-ocorrencia.html` | 5.10 | Reclamação selecionada, anonimato ligado (aviso visível) |
| `feed.html` | 5.8 | 5 cards: em andamento + atrasada, anônima, da própria pessoa, resolvida, arquivada |
| `detalhe-morador.html` | 5.11 | Ocorrência própria RESOLVIDA dentro da janela de reabertura, timeline com prazo, comentários e resolução |
| `fila-admin.html` | 5.14 | Visão "Em aberto"; cards abaixo de 768px, tabela acima; o bottom sheet de filtros e o drawer de menu abrem de verdade (`<dialog>`) |
| `detalhe-admin.html` | 5.16 | Reclamação anônima ABERTA não triada, com nota interna; o seletor Público/Nota interna troca a dica e o botão |
| `estados.html` | 5.0 | Skeleton, vazios, erro, parcial, validação, toasts, conflito, avisos do detalhe e 4 modais |

Os ícones dos mockups são um sprite SVG próprio e provisório (ver Pendências).

---

## 12. Pendências

| # | Pendência | Por que importa | Quem decide |
|---|---|---|---|
| 1 | **Enum de urgência.** A proposta é `BAIXA`, `MEDIA` e `ALTA`; o plano não fixa os níveis | Badges, filtros e painel dependem disso | `beckenbauer` em `packages/contratos` (issue #17), com produto |
| 2 | **Nomes dos enums de tipo e de evento** da timeline (6.3) | A UI mapeia enum → rótulo; nomes diferentes quebram o mapeamento | `beckenbauer` (issues #12, #13) |
| 3 | **Prazo e "Atrasada" visíveis ao morador.** A especificação assume que sim, por transparência; o plano não diz | Se não forem visíveis, saem do card e do detalhe do morador e o presenter não os envia | Produto |
| 4 | **Campos que a UI precisa no presenter do morador:** `ehAutor` (ações, "Sua", "Você"), `podeReabrirAte` (data-limite da janela) e o número e status da principal quando DUPLICADA | Sem eles, a UI teria que inferir regra no cliente | `beckenbauer` |
| 5 | **Limites de texto não fixados:** título 5–100, justificativa ≥ 10, senha ≥ 8, slug 3–40, bloco ≤ 20, apto ≤ 10 | As mensagens de 8.4 citam esses números | `beckenbauer` (validação da API é a fonte) |
| 6 | **Bloco/apto do síndico profissional**, que pode não morar no condomínio | O cadastro do condomínio (5.2) pede bloco e apto | Produto |
| 7 | **Normalização do bloco** ("B", "b", "Bloco B", "Torre 2") | A UI exibe "Bloco {valor}"; sem normalização, aparece "Bloco Bloco B" | `beckenbauer` |
| 8 | **Slug editável.** A especificação o deixa somente leitura no MVP | Trocar o slug invalida os QR codes impressos | Produto |
| 9 | **Aba "Inativos" em Moradores.** A issue #8 cita só Pendentes, Ativos e Recusados | Sem ela, não há onde reativar | Produto / issue #8 |
| 10 | **`initFlowbite()` vs. comportamento no Angular** (seção 3). O plano diz para usar `initFlowbite()` | Acessibilidade de modal e drawer | `beckham` + `guardiola` |
| 11 | **Biblioteca de ícones:** proposta de SVG inline copiado do Flowbite Icons (MIT, sem pacote npm) ou manter o sprite próprio dos mockups | Regra: nenhuma biblioteca nova sem aprovação | Você (aprovação) |
| 12 | **Biblioteca de QR code** para gerar e baixar o PNG (issue #11) | Não existe no stack aprovado | Você (aprovação) / `beckham` |
| 13 | **Marca:** nome do produto, logotipo e cor primária definitiva | O azul é provisório; a troca é só de token | Você |
| 14 | **Tema escuro**, fora do MVP | Os tokens já são semânticos; custo estimado: mais uma coluna de valores e uma nova rodada de contraste | Produto, pós-MVP |
| 15 | **Ordenação da fila:** só "mais recentes", por causa do cursor `(criado_em, id)` | Pode ser útil "prazo mais próximo" ou "urgência" | Produto / `beckenbauer`, pós-MVP |
