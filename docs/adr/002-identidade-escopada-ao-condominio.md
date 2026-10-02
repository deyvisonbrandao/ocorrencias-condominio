# ADR-002 — Identidade escopada ao condomínio

- **Status:** Aceita
- **Data:** 2026-10-02

## Contexto

Moradores entram pelo link ou QR code do próprio condomínio e se identificam pelo telefone. A mesma pessoa pode, em tese, morar em dois condomínios atendidos pelo produto, e o telefone não é único globalmente nesse cenário. Uma identidade global exigiria vínculo pessoa-condomínio, troca de contexto na sessão e regras de autorização mais complexas, o que está fora do MVP ("pessoa em vários condomínios").

## Decisão

- O usuário pertence a exatamente um condomínio: `UNIQUE(condominio_id, telefone)`. O mesmo telefone em dois condomínios gera dois usuários independentes.
- Login com `{slug, telefone, senha}`. O slug vem da rota `/c/:slug/entrar` e escopa a busca do usuário.
- Telefone normalizado em E.164 antes de gravar e antes de comparar.
- Sessão em JWT num cookie httpOnly com `{sub, cid, papel, sv}`. O guard confere `status = ATIVO` e se `sv` bate com `versao_sessao` do usuário; incrementar `versao_sessao` revoga todas as sessões na hora (inativação, reset de senha).
- Reset de senha de morador é feito pelo síndico ou subsíndico, e o do subsíndico pelo síndico: gera senha temporária, exibida uma vez, e o login com ela obriga a troca.
- A senha do **síndico** não é resetada por nenhum admin do condomínio: o reset é feito por um comando de suporte (issue #26), que aplica a mesma senha temporária com troca forçada.
- O limite de 2 admins por condomínio é garantido no banco por `slot_admin` com `UNIQUE(condominio_id, slot_admin)`.

## Consequências

- Positivas: o modelo de dados e a autorização ficam simples; o `cid` na sessão alimenta diretamente o isolamento do ADR-001; revogação de sessão sem lista de bloqueio.
- Negativas: quem mora em dois condomínios tem duas contas e duas senhas; não há "esqueci minha senha" self-service, o reset depende do admin, e o do síndico depende do suporte.
- Evolução: se identidade global entrar no escopo, o caminho é criar `pessoa` com vínculo `usuario(condominio_id, pessoa_id)`, mantendo o `usuario` atual como associação. A unicidade por condomínio continua válida.
