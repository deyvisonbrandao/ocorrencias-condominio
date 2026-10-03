# ADR-006 — Flowbite como referência visual, sem `initFlowbite()`

- **Status:** Aceita
- **Data:** 2026-10-02
- **Origem:** revisão do PR #28 (issue #4, especificação de UI)
- **Afeta:** `apps/web` (issue #3 em diante), [`docs/ui/especificacao.md`](../ui/especificacao.md) (seção 3)

## Contexto

O plano do MVP ([`arquitetura-mvp.md`](../arquitetura-mvp.md)) previa Tailwind + Flowbite com `initFlowbite()` nos componentes interativos. Também previa encapsular os componentes em `shared/components`, para que as telas não dependam das classes do Flowbite.

A especificação de UI mostrou três problemas no JS do Flowbite, que é o que `initFlowbite()` ativa, dentro de uma SPA Angular:

1. **Ciclo de vida.** O `initFlowbite()` varre o DOM uma vez e liga ouvintes por atributos `data-*`. Num componente criado depois, por troca de rota, `@if` ou `@for`, o comportamento não existe até alguém chamar a inicialização de novo. Na volta, ouvintes órfãos ficam presos a nós removidos.
2. **Acessibilidade.** O modal e o drawer do Flowbite não levam o foco para dentro ao abrir, não prendem o Tab e não devolvem o foco a quem abriu. Dropdown e abas não mantêm `aria-expanded` e `aria-selected` em sincronia com o estado do Angular. A especificação exige essas garantias (WCAG 2.2 AA, seção 9).
3. **Dois donos do estado.** Estado de "aberto ou fechado" no DOM, controlado pelo Flowbite, compete com o estado em signals do Angular. Testar e depurar fica mais difícil.

O valor do Flowbite para o projeto está na **marcação e nas classes** dos componentes e no conjunto de **ícones**, não no JS.

## Decisão

1. O Flowbite é usado só como **referência de marcação e classes Tailwind** para os componentes de `apps/web/src/app/shared/components`. O plugin do Tailwind do Flowbite não é usado (ver [especificação, seção 2.7](../ui/especificacao.md#27-mapeamento-para-o-tailwind)).
2. **`initFlowbite()` não é chamado**, e nenhum módulo JS do Flowbite é importado.
3. O **comportamento** interativo é implementado no Angular, com signals:
   - modal, bottom sheet e drawer usam o elemento nativo **`<dialog>` com `showModal()`**, que prende o foco, fecha com Esc e deixa o fundo inerte; o componente devolve o foco a quem abriu;
   - menus e disclosures são botões com `aria-expanded` controlado por signal;
   - abas são links de rota com `aria-current="page"`;
   - toast é um serviço com região `aria-live` no shell.
4. Os **ícones** vêm do **Flowbite Icons**, em SVG inline, servidos por um componente `ui-icone` com um registro local dos SVGs usados. Nenhum pacote npm de ícones é adicionado.
5. O **QR code** do condomínio é gerado no cliente com a biblioteca **`qrcode`** (npm). É a única dependência nova de UI aprovada junto com esta decisão.

## Consequências

**Positivas**
- O foco e o ARIA dos componentes interativos ficam sob controle do código e testáveis em unit e e2e.
- Uma fonte única de estado (signals) por componente, sem efeito colateral quando a rota troca.
- `<dialog>` nativo dá foco preso, Esc e fundo inerte sem biblioteca.
- O bundle fica menor: nenhum JS do Flowbite.

**Negativas e custos**
- Exemplos da documentação do Flowbite que dependem de `data-modal-toggle`, `data-dropdown-toggle` e semelhantes não funcionam se forem colados. É preciso adaptar a marcação ao componente de `shared/components`.
- Componentes interativos mais ricos, que não estão no MVP (datepicker, carrossel, tooltip com posicionamento), exigirão implementação própria ou uma nova decisão.
- `ui-modal`, `ui-drawer`, menu e toast precisam de testes próprios de foco e teclado.

**Revisão**
- Reabrir esta decisão se uma versão futura do Flowbite oferecer integração Angular que gerencie foco e ARIA, ou se o MVP passar a precisar de um componente interativo cujo custo de implementação própria supere o de adotar a biblioteca.
