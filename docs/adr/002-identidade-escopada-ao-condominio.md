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

## Implementação (issue #6)

Registro das escolhas feitas ao implementar a sessão, em `apps/api/src/core/auth` e `apps/api/src/features/acesso` (login e logout em `publico/`, `/me` na raiz da feature).

- **Token.** JWT HS256 assinado com `JWT_SECRET` (obrigatório, 32+ caracteres), com `{sub, cid, papel, sv, iat, exp}` e validade de **7 dias**, sem renovação deslizante: passado o prazo, o usuário entra de novo. Assinatura e verificação usam `node:crypto` (sem dependência nova); a verificação só aceita o cabeçalho exato `{"alg":"HS256","typ":"JWT"}`, compara a assinatura em tempo constante e confere tipo e formato de cada claim.
- **Cookie.** `HttpOnly`, `SameSite=Lax`, `Path=/`, sem `Domain` e com `Max-Age` igual à validade do token.
  - Em produção o nome é `__Host-sessao`, com `Secure`: o prefixo obriga `Secure`, `Path=/` e ausência de `Domain`, então um subdomínio irmão não consegue implantar nem sobrescrever a sessão (fixação ou negação de serviço). Fora de produção a API roda em http, onde o navegador recusa cookie `__Host-`, e o nome é `sessao`.
  - Se a requisição trouxer mais de um cookie com o nome da sessão (por exemplo, um definido por outro domínio ou caminho), a API não escolhe nenhum: responde 401 `NAO_AUTENTICADO` e apaga o cookie.
  - O logout apaga o cookie com os mesmos atributos e é idempotente. O logout não incrementa `versao_sessao`, para não derrubar as sessões de outros aparelhos; quem precisar revogar tudo (inativação, reset de senha) incrementa a versão.
- **Login.** `POST /auth/login {slug, telefone, senha}`:
  - o condomínio vem de `CondominiosPublicoService.encontrarAtivoPorSlug` (devolve `null` em vez de lançar o 404 da rota pública) e o usuário é lido pelo `PrismaEscopado` dentro de `ContextoTenant.executar(cid)`. O `PrismaSistema` não é necessário: a busca já é por `(condominio_id, telefone)`, e o client escopado mantém o fail-closed também no login;
  - slug inexistente ou inativo, telefone fora do formato ou inexistente e senha errada respondem o mesmo **401 `CREDENCIAIS_INVALIDAS`**, e todos pagam uma verificação argon2 (contra um hash fictício gerado na subida com os mesmos parâmetros), para o tempo de resposta não revelar se o telefone existe;
  - o status só é revelado com a senha correta: **403** `CADASTRO_PENDENTE`, `CADASTRO_RECUSADO` ou `ACESSO_INATIVO`.
- **Guard global** (`GuardaAutenticacao`, `APP_GUARD`): toda rota exige sessão, salvo as marcadas com `@Publico()`. Ele valida o JWT, chama `ContextoTenant.vincular(cid)` e só então busca o usuário pelo `PrismaEscopado`; como o `cid` tem assinatura conferida, a busca fica presa ao condomínio do token e um `sub` de outro condomínio não é encontrado. Recusa com **401 `NAO_AUTENTICADO`** (e apaga o cookie) quando o usuário não existe, não está `ATIVO`, `versao_sessao` difere de `sv` ou o condomínio não está `ATIVO`. O **papel vem do banco**, não do token: rebaixar alguém vale na próxima requisição.
- **Papéis.** `@Papeis('SINDICO', 'SUBSINDICO')` registra o `GuardaPapeis` na rota, que roda depois do global e responde **403 `ACESSO_NEGADO`**. `@UsuarioAtual()` entrega `{id, condominioId, papel}`.
- **CSRF.** Além do `SameSite=Lax`, o `GuardaOrigem` (`APP_GUARD`, antes da autenticação) vale para `POST`, `PUT`, `PATCH` e `DELETE`:
  - com `Sec-Fetch-Site` diferente de `same-origin` ou `none`, responde **403 `ORIGEM_NAO_PERMITIDA`**. Isso cobre o subdomínio irmão, que o `Lax` trata como mesmo site. Navegador sem Fetch Metadata fica só com o `Lax`;
  - corpo que não é `application/json` responde **415**, porque formulário HTML (urlencoded, multipart, text/plain) dispensa o preflight de CORS e o Nest aceitaria urlencoded. Requisição sem corpo não precisa de `Content-Type`.
  - Consequência: web e API precisam ser servidos na **mesma origem** (em desenvolvimento, pelo proxy do `ng serve`). Separar em subdomínios exige rever esta regra.
- **Fora desta issue:** rate limit do login com 429 e `Retry-After` (#23); bloqueio, na API, das rotas para quem entrou com senha temporária até trocar a senha (entra com `POST /auth/trocar-senha`).
