# MVP — Ocorrências de Condomínio (Angular + Flowbite + NestJS + MySQL)

## Context

Produto novo: SaaS mobile-first, multi-tenant (tenant = condomínio, banco único MySQL), para moradores registrarem ocorrências e o síndico tratar (triar, comentar, resolver, definir prazo).
- **A IA fica fora do MVP.** O desenho só deixa espaço para ela entrar depois: classificação e similaridade via provedor plugável, com fila outbox.
- **Código:** pasta local `C:\DEV_Projects\DHB\POCs\condominio-ocorrencias`, publicada em https://github.com/deyvisonbrandao/ocorrencias-condominio (repo público e vazio).
- **Trabalho:** organizado num **GitHub Project (kanban)**, com issues verticais testáveis visualmente.
- **Quem faz o quê:** arquitetura do `guardiola`; implementação do `beckenbauer` (API) e do `beckham` (web); telas especificadas pelo `zidane`; revisão do `var`.

## Decisões de produto (fechadas)

- Sem anexos, sem notificações, **sem IA**. Máximo de 2 admins por condomínio (síndico + subsíndico).
- Morador: nome, telefone, bloco, apto, email opcional. Login por **telefone + senha**; o reset é feito pelo síndico (senha temporária + troca forçada).
- Onboarding do morador: link/QR `/c/:slug` → cadastro PENDENTE → síndico/subsíndico aprova.
- Onboarding do condomínio: **autocadastro do síndico** na landing. O síndico cria/promove o subsíndico.
- Anonimato: o morador está sempre logado e o autor fica gravado, mas fica **oculto para síndico, subsíndico e outros moradores**. Admin nunca registra anônimo.
- **Tipo escolhido pelo morador (obrigatório)**. O síndico corrige se necessário.
  - `tipo_efetivo = confirmado ?? declarado`
  - Visibilidade:
    - dúvida, melhoria, manutenção em área comum e mudança/obra → todos os moradores ativos;
    - **reclamação → só autor + admins**.
- **Urgência é definida pelo síndico na triagem**. Começa como "não triada" e o morador não a vê. O formulário de criação sempre mostra uma orientação de emergência ("risco imediato? acione a portaria / 193").
- Outros moradores veem do autor **somente o bloco**.
- **Morador pode reabrir** a própria ocorrência RESOLVIDA ou ARQUIVADA (fechada indevidamente). É obrigatório justificar, e a reabertura é aceita até **30 dias** após o fechamento. A ocorrência volta para ABERTA, para nova triagem.
- UI com **Flowbite** (Tailwind CSS). A API é documentada com **Swagger** (`/api/docs`).

## Arquitetura

Monolito modular NestJS + SPA Angular, em monorepo com npm workspaces:

```
condominio-ocorrencias/
  docker-compose.yml (mysql:8.4, utf8mb4_0900_ai_ci)  .env.example  docs/adr/  .github/workflows/ci.yml
  packages/contratos/            # enums e tipos de DTO compartilhados
  apps/api/  prisma/  src/core/{config,http,prisma,tenancy,auth,health}
             src/features/<feature>/{publico,dto,enums,interfaces}  # condominios, acesso, membros, ocorrencias
             src/shared/{validators,pipes,decorators,utils}
             test/  # e2e: isolamento-tenant, condominios-publico; depois anonimato, maquina-estados
  apps/web/  (Angular standalone + signals, Tailwind + Flowbite)
             src/app/core/{config,interceptors,layouts/{publico,morador,admin},services,guards}
             src/app/features/<feature>/{components,services,interfaces,enums}  # uma pasta por entrega, lazy
             src/app/shared/{components,validators,services,utils,pipes,directives}
```

**Estrutura do web** (`apps/web/src/app`, três áreas, sem NgModules)
- `core/`: o que carrega na inicialização e existe uma vez só: shells e rotas de cada área (`layouts/`), interceptors, guards, configuração (`config/`) e serviços globais, como os clients da API e a navegação (`services/`).
- `features/<feature>/`: uma pasta por entrega de valor, com o componente de página na raiz, carregado por lazy loading a partir das rotas da área. Subpastas `components/`, `services/`, `interfaces/` e `enums/` só quando a feature tem os seus próprios.
- `shared/`: reutilizável, agrupado por tipo: `components/` (os `ui-*`), `validators/`, `services/`, `utils/` (funções puras), `pipes/` e `directives/`.
- Dependências: `features` importam `core` e `shared`; `shared` não importa `core` nem `features`; `core` não importa `features`, exceto nas rotas das áreas; uma feature não importa outra (o que for comum sobe para `shared` ou `core`).

**Estrutura da API** (`apps/api/src`, mesma divisão do web, com módulos Nest)
- `core/`: infraestrutura essencial, carregada uma vez: configuração validada (`config/`), pipeline HTTP e erro padrão (`http/`), clients do Prisma (`prisma/`), contexto de condomínio (`tenancy/`), hash de senha e, na #6, sessão e guards (`auth/`), e o `health/`.
- `features/<feature>/`: uma pasta por área de negócio, com o `<feature>.module.ts` na raiz. Subpastas só quando a feature precisa: `publico/` (rotas sem autenticação), `dto/`, `enums/`, `interfaces/`. Controllers e services ficam junto da rota que atendem.
- `shared/`: reutilizável entre features e sem estado, agrupado por tipo: `validators/` (decorators de validação de DTO, como celular, e-mail e senha), `pipes/`, `decorators/` e `utils/`. Só nasce quando há um segundo consumidor real ou previsto na issue seguinte.
- Dependências: `features` importam `core` e `shared`; `shared` não importa `core`, `features` nem o client gerado do Prisma; `core` não importa `features` (o `AppModule` é a única ligação); uma feature não importa arquivo de outra, só o módulo Nest que a outra exporta. O `.oxlintrc.json` da API aplica as três primeiras regras; a última fica na revisão.
- `PrismaSistema` (client sem filtro) só pode ser importado em `core/prisma`, `core/health`, `features/condominios/publico/condominios-publico.service.ts` (autocadastro e resolução do slug), `prisma/`, `scripts/` e `test/` (ADR-001).

**Swagger**
- `@nestjs/swagger` em `/api/docs`, com DTOs anotados e autenticação por cookie.
- Habilitado fora de produção, ou protegido por flag.

**Flowbite**
- Tailwind + `flowbite` como referência de marcação e classes, com ícones do Flowbite Icons (SVG inline). O comportamento interativo (modal, drawer, menus, abas) fica no Angular, com `<dialog>` nativo; **sem `initFlowbite()`** ([ADR-006](adr/006-flowbite-sem-initflowbite.md)).
- Componentes de UI encapsulados em `shared/components`: botão, input, select, badge de status/tipo, timeline, modal, toast, bottom-nav, abas.
- Assim as telas não dependem direto das classes do Flowbite.
- O `zidane` define os tokens e o mapeamento de componentes.

### Multi-tenancy (ADR-001/002)

**Identidade e sessão**
- O usuário pertence a um condomínio: `UNIQUE(condominio_id, telefone)`. Login com `{slug, telefone, senha}`.
- JWT em cookie httpOnly, com `{sub, cid, papel, sv}`.
- O guard confere `status=ATIVO` e a `versao_sessao`, o que permite revogar sessões na hora.
- O contexto da requisição fica em AsyncLocalStorage.
- `condominio_id` vem **somente** da autenticação. Rotas públicas resolvem o condomínio pelo slug.

**Filtro por condomínio no Prisma**
- Uma **client extension** fail-closed (`PrismaEscopado`) injeta o `condominioId` em toda leitura e escrita.
  - Sem contexto, lança exceção.
  - `$queryRaw` fica bloqueado.
- O `PrismaSistema` (sem filtro) é restrito por lint ao autocadastro, à resolução do slug e a scripts. O login (#6) usa o `PrismaEscopado` dentro de `ContextoTenant.executar`.
- Um teste sobre o DMMF exige que todo modelo esteja classificado como de condomínio ou global.
- FKs compostas `(condominio_id, x_id)` em todas as relações.

### Modelo de dados

- **`condominio`**: id (UUIDv7), nome, slug UNIQUE, status, proximo_numero_ocorrencia, cidade?, uf? (enum das 27 UFs). Cidade e UF são nulas no banco porque o autocadastro não as pede; o `PUT /admin/condominio` exige as duas (issue #11). `versao` serve de lock otimista para esse PUT: a gravação só vale se a versão lida não mudou, com nova tentativa no servidor e 409 `EDICAO_CONCORRENTE` se esgotar.
- **`usuario`**:
  - Dados: condominio_id, nome, telefone (E.164), email?, senha_hash, bloco, apto.
  - Acesso: papel, status (PENDENTE/ATIVO/RECUSADO/INATIVO), senha_temporaria, versao_sessao.
  - **`slot_admin` com `UNIQUE(condominio_id, slot_admin)`**, que garante o limite de 2 admins no banco.
- **`ocorrencia`**:
  - Identificação: `numero` por condomínio (#57), autor_id, anonima, origem (MORADOR/ADMIN).
  - Conteúdo: titulo, descricao (20 a 2000 caracteres), local?.
  - Classificação: `tipo_declarado` NOT NULL, `tipo_confirmado`, `tipo_efetivo`, `urgencia` NULL (não triada), `visibilidade` (derivada).
  - Ciclo de vida: status, prazo, duplicada_de_id, fechada_em, versao (lock otimista).
  - Índices: `(condominio_id, visibilidade, criado_em)`, `(condominio_id, autor_id, criado_em)`, `(condominio_id, status, urgencia, criado_em)`, `(condominio_id, prazo)`.
  - Os campos `tipo_ia`/`urgencia_ia` e as tabelas `analise_ia`, `ocorrencia_similar` e `outbox` **ficam para depois**.
- **`ocorrencia_evento`**:
  - Timeline append-only; comentário também é evento.
  - `interno` marca nota que só o admin vê.
  - `ator_papel` guarda o papel do autor do evento.
  - `dados` em JSON, com o de/para da mudança.
- **`auditoria_admin`**: registra aprovar, recusar, inativar, resetar senha, mudanças na equipe e edição dos dados do condomínio (`CONDOMINIO_ATUALIZADO`, com o de/para).

### Máquina de estados

- **Transições do admin:**
  - ABERTA → EM_ANDAMENTO → RESOLVIDA
  - ABERTA ou EM_ANDAMENTO → ARQUIVADA, ou → DUPLICADA (vinculada a outra ocorrência)
  - RESOLVIDA ou ARQUIVADA → EM_ANDAMENTO (reabrir)
  - DUPLICADA → EM_ANDAMENTO (desvincular)
- **Transições do autor:**
  - ABERTA → ARQUIVADA (retirar)
  - RESOLVIDA ou ARQUIVADA → **ABERTA** (reabrir com justificativa, até 30 dias após o fechamento)
- **Regras:**
  - Prazo é **atributo**, não estado. Definir prazo numa ABERTA a leva para EM_ANDAMENTO. "Atrasada" é derivada.
  - Resolver exige comentário. Arquivar exige motivo.
  - Duplicada aponta sempre para a ocorrência raiz, sem cadeia. Se a principal for restrita, o autor da duplicada vê só o número e o status dela.
  - Toda transição gera um evento na timeline.

### Permissões

- **Morador:**
  - cria ocorrência (pode ser anônima);
  - vê as próprias e as públicas;
  - comenta só nas próprias;
  - retira a própria se ABERTA e reabre a própria se fechada (com justificativa, até 30 dias).
- **Síndico e subsíndico:**
  - fazem tudo nas ocorrências: triagem de tipo e urgência, status, prazo, duplicada, comentários públicos e internos;
  - moderam moradores: aprovar, recusar, inativar, reativar, resetar senha.
- **Só o síndico:** gerencia a equipe (subsíndico) e edita o condomínio, incluindo link e QR code.
- **Proibições:**
  - nenhum admin vê o autor de uma ocorrência anônima;
  - nenhum admin apaga ocorrência ou comentário.
- **Presenters por papel** com whitelist de campos. Controllers separados: `/ocorrencias` (morador) e `/admin/ocorrencias`. O `autor_id` nunca sai na API.

### Rotas e endpoints

**Web:**
- Pública:
  - `/`, `/cadastrar-condominio`;
  - `/c/:slug`, `/c/:slug/cadastro`, `/c/:slug/entrar`, `/c/:slug/aguardando-aprovacao`;
  - `/trocar-senha`.
- Morador: `/app/{ocorrencias,minhas,nova,ocorrencias/:id,perfil}`.
- Admin: `/admin/{painel,ocorrencias,ocorrencias/nova,ocorrencias/:id,moradores,equipe,condominio}`.

**API `/api/v1`:**
- Pública: `POST /public/condominios`, `GET /public/condominios/:slug`, `POST /public/condominios/:slug/moradores`.
- Autenticação: `POST /auth/login|logout|trocar-senha`, `GET /me`.
- Morador: `GET|POST /ocorrencias` (`escopo=condominio|minhas`), `GET /ocorrencias/:id`, `POST /ocorrencias/:id/{comentarios|retirar|reabrir}`.
- Admin:
  - `/admin/ocorrencias` (filtros e criação);
  - `/admin/ocorrencias/:id/{assumir|resolver|arquivar|reabrir}`;
  - `PUT /admin/ocorrencias/:id/{prazo|triagem}`;
  - `POST|DELETE /admin/ocorrencias/:id/duplicada`, `POST /admin/ocorrencias/:id/comentarios`;
  - `/admin/painel`, `/admin/moradores/:id/{aprovar|recusar|inativar|reativar|redefinir-senha}`.
- Só síndico: `PUT /admin/condominio`, `/admin/equipe/subsindico`. O `GET /admin/condominio` vale também para o subsíndico, em modo leitura (R6 da especificação de UI).
- Paginação por cursor `(criado_em, id)`.

## Execução

### Passo 1 — Repositório e board

1. **Pré-requisito seu:** dar ao `gh` o escopo de Projects, que hoje está faltando. Rode no terminal:
   ```bash
   gh auth refresh -s project
   ```
2. Criar a pasta local, rodar `git init` e configurar o remote `origin` para o repositório. Mover a sessão para a pasta.
3. No GitHub:
   - **labels**: `area:api`, `area:web`, `area:infra`, `area:design`, `tipo:feature`, `tipo:tecnico`;
   - **milestones**: M0 a M3;
   - **Project v2** "Ocorrências Condomínio — MVP", com Status Todo / In Progress / Review / Done;
   - as **issues** abaixo, adicionadas ao board.
4. Cada issue terá: objetivo, escopo API/web, critérios de aceite e uma seção **"Como testar visualmente"**, com passo a passo no navegador em 375px ou no Swagger.

### Passo 2 — Implementação por issue

- Cada issue segue o mesmo fluxo: branch `feat/<n>-slug`, PR com "Closes #n", revisão do `var` e merge.
- Ao fim de cada milestone, paro para você testar visualmente.

### Issues (fatiamento vertical)

**M0 — Fundação**

1. **Setup do monorepo**
   - Workspaces, docker-compose MySQL, `.env.example`, README "como rodar", ADRs em `docs/adr/`.
   - Testar: `docker compose up` sobe o MySQL; `npm run dev` sobe a API e a web.
2. **API base com Swagger**
   - NestJS, Prisma, config validada, filtro de erros padrão, `/health`, Swagger em `/api/docs`, CI no GitHub Actions (lint, test, build).
   - Testar: abrir `/api/docs` e executar `/health`; checks verdes no PR.
3. **Web base com Flowbite**
   - Angular, Tailwind e Flowbite; shells das áreas pública, morador (bottom-nav) e admin (navbar/sidebar responsiva); componentes base em `shared/components`.
   - Testar: navegar pelos shells em 375px e em desktop.
4. **Especificação de UI** (`zidane`)
   - Tokens, mapeamento Flowbite e fluxo das telas do MVP, com estados vazio, carregando e erro.
   - Testar: revisar o documento e o mockup.
5. **Autocadastro do condomínio e do síndico, com isolamento entre condomínios**
   - Landing e `/cadastrar-condominio` com validação de slug.
   - Contexto de condomínio, extensão Prisma fail-closed e e2e de isolamento.
   - Testar: cadastrar o condomínio e ver a tela de sucesso com o link `/c/:slug`.
6. **Login e sessão**
   - `/c/:slug/entrar` (telefone + senha), cookie, `/me`, logout, guards por papel, redirecionamento por papel.
   - Testar: síndico loga e cai no painel admin vazio; logout funciona; rota admin sem login volta para o login.

**M1 — Moradores e equipe**

7. **Página pública e cadastro do morador**
   - `/c/:slug`, formulário de cadastro, tela "aguardando aprovação"; login de pendente é bloqueado com mensagem.
   - Testar: cadastrar morador pelo link e tentar logar.
8. **Gestão de moradores**
   - Abas Pendentes/Ativos/Recusados; aprovar, recusar (motivo), inativar e reativar.
   - Testar: aprovar e o morador conseguir logar; inativar e a sessão dele cair.
9. **Reset de senha e troca forçada**
   - Admin gera senha temporária, exibida uma vez; o morador é obrigado a trocar no login.
   - Testar: resetar, logar com a temporária e ser levado a `/trocar-senha`.
10. **Equipe**
    - Síndico cria subsíndico novo ou promove morador, remove e reseta a senha dele; limite de 2 admins.
    - Testar: o segundo subsíndico é barrado com mensagem; subsíndico não vê o menu Equipe.
11. **Dados do condomínio, link e QR code**
    - Editar dados; exibir, copiar e baixar o QR para imprimir.
    - Testar: escanear o QR no celular e abrir o cadastro.

**M2 — Ocorrências**

12. **Registrar ocorrência (morador)**
    - Tipo obrigatório, título, descrição, local, toggle anônimo com aviso, orientação de emergência.
    - Testar: criar e ver o toast e a ocorrência em "Minhas".
13. **Minhas ocorrências e detalhe**
    - Lista com badges de status e tipo; detalhe com timeline.
    - Testar: abrir a criada e ver o evento "Criada".
14. **Feed do condomínio**
    - Públicas com autor = só o bloco; anônima sem autor; reclamações não aparecem.
    - Testar: com 2 moradores, A cria uma dúvida e uma reclamação, e B vê só a dúvida, com o bloco.
15. **Fila admin e detalhe**
    - Filtros (status, tipo, urgência, não triadas, atrasadas); detalhe com autor ou "Anônimo"; timeline completa.
    - Testar: o síndico vê a reclamação anônima sem a identidade do autor.
16. **Admin registra ocorrência** (origem ADMIN, nunca anônima)
    - Testar: criar pelo admin e ver no feed, se o tipo for público.
17. **Triagem**
    - Definir urgência e corrigir o tipo; a visibilidade é recalculada; evento na timeline.
    - Testar: mudar uma dúvida para reclamação e ver que ela some do feed do morador B.
18. **Comentários**
    - Morador comenta nas próprias; admin comenta em público ou interno.
    - Testar: o morador não vê a nota interna.
19. **Fluxo de status do admin**
    - Assumir, definir e alterar prazo, resolver (com comentário), arquivar (com motivo), reabrir; badge "Atrasada".
    - Testar: prazo vencido mostra o badge; resolver exige comentário.
20. **Ações do morador**
    - Retirar se ABERTA; reabrir se fechada, com justificativa e até 30 dias.
    - Testar: reabrir uma resolvida, que volta para "Aberta" com evento na timeline; depois de 30 dias o botão some.
21. **Duplicada manual**
    - Admin vincula pelo número e desvincula; o morador vê "vinculada à #N — status".
    - Testar: vincular e ver a mudança no detalhe das duas.
22. **Painel admin**
    - Contadores: abertas, não triadas, por urgência, atrasadas, cadastros pendentes; atalhos para a fila filtrada.
    - Testar: os números batem com a fila.

**M3 — Endurecimento para piloto**

23. **Rate limit e segurança**
    - Login, cadastro e criação de ocorrência; logs sem PII; headers de segurança.
    - Testar: a 6ª tentativa de login errada mostra mensagem de bloqueio temporário.
24. **e2e de anonimato e estados**
    - Teste de substring sobre todas as respostas; transições válidas e inválidas; tudo no CI.
    - Testar: checks verdes no PR.
25. **Privacidade**
    - Página de política e termos; exclusão de conta pelo morador (`autor_id` vira NULL, as ocorrências ficam).
    - Testar: excluir a conta e ver as ocorrências mantidas como "autor removido".
26. **Operação**
    - Seed de demonstração (2 condomínios); comando de suporte para resetar a senha do síndico; Dockerfiles de produção.
    - Testar: `npm run seed` e navegar pelo demo.

**Fora do MVP:** IA (classificação, urgência sugerida, similaridade), anexos, notificações, pessoa em vários condomínios, transferência de sindicatura in-app, edição pela pessoa autora, "eu também", relatórios, superadmin, billing, PWA offline, deploy em nuvem (o alvo será decidido depois).

## Verificação

- Testes unitários das regras puras: derivação de tipo e visibilidade, máquina de estados (incluindo a janela de 30 dias da reabertura) e presenters.
- e2e na API:
  - isolamento: o ID de outro condomínio retorna 404;
  - anonimato: o JSON não contém id, nome nem telefone do autor;
  - limite de 2 admins;
  - transições de estado.
- CI no GitHub Actions em todo PR.
- Teste visual ao fim de cada milestone, em viewport de 375px, seguindo o "Como testar" das issues. Fluxo ponta a ponta:
  1. Autocadastro do síndico.
  2. QR e cadastro do morador.
  3. Aprovação.
  4. Reclamação anônima, que fica restrita.
  5. Dúvida pública, que mostra só o bloco.
  6. Triagem e prazo.
  7. Resolver.
  8. Morador reabre.
