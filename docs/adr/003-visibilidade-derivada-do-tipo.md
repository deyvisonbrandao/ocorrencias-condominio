# ADR-003 — Visibilidade da ocorrência derivada do tipo

- **Status:** Aceita
- **Data:** 2026-10-02

## Contexto

Parte das ocorrências interessa a todos (dúvida, melhoria, manutenção em área comum, mudança/obra) e parte é sensível, por envolver um vizinho ou um conflito (reclamação). Deixar o morador escolher a visibilidade abre espaço para erro e para exposição indevida. O tipo é obrigatório na criação, e o síndico pode corrigi-lo na triagem.

## Decisão

- `tipo_declarado` (escolhido pelo morador, obrigatório) e `tipo_confirmado` (corrigido pelo admin, opcional) são gravados separadamente.
- `tipo_efetivo = tipo_confirmado ?? tipo_declarado`.
- A `visibilidade` é **derivada** do `tipo_efetivo` por uma função pura no domínio, nunca informada pelo cliente:
  - dúvida, melhoria, manutenção em área comum e mudança/obra → `CONDOMINIO` (todos os moradores ativos);
  - reclamação → `RESTRITA` (só o autor e os admins).
- `tipo_efetivo` e `visibilidade` são persistidos e recalculados na mesma transação de qualquer mudança de tipo, o que gera evento na timeline.
- As duas listas do morador têm predicados separados, cada um servido por um índice próprio:
  - **feed do condomínio:** só `visibilidade = CONDOMINIO`, pelo índice `(condominio_id, visibilidade, criado_em)`;
  - **"minhas":** `autor_id = usuário`, pelo índice `(condominio_id, autor_id, criado_em)`.
- A reclamação do próprio autor não aparece no feed, só em "minhas". O detalhe de uma ocorrência restrita é liberado ao autor e aos admins.
- Se uma duplicada aponta para uma ocorrência restrita, o autor da duplicada vê só o número e o status da principal.

## Consequências

- Positivas: a regra fica num lugar só e é testável isoladamente; o morador não decide sobre exposição; reclassificar uma dúvida como reclamação a retira do feed na hora; sem `OR` entre colunas, cada lista usa um índice de forma direta.
- Negativas: a coluna derivada pode divergir se alguém atualizar o tipo fora do serviço de domínio. Mitigação: o tipo só muda por um caso de uso, e há teste unitário da derivação.
- Uma ocorrência pública que vira restrita já pode ter sido vista. Isso é aceito: a reclassificação controla a exposição dali em diante, não apaga o que já foi lido.
