# ADR-001 — Isolamento multi-tenant por coluna `condominio_id`

- **Status:** Aceita
- **Data:** 2026-10-02

## Contexto

O produto é um SaaS em que o tenant é o condomínio. Moradores e síndicos de condomínios diferentes nunca podem ver ou alterar dados uns dos outros. O MVP roda num único MySQL 8.4, com volume pequeno por tenant e muitos tenants esperados. Banco ou schema por tenant multiplicaria migração, conexão e operação sem ganho que justifique nesta fase.

O risco principal de banco compartilhado é humano: uma consulta que esquece o filtro por condomínio vaza dado. A defesa não pode depender de cada desenvolvedor lembrar do `where`.

## Decisão

- Banco único, com coluna `condominio_id` em toda tabela de dado de condomínio.
- O `condominio_id` da requisição vem **somente** da autenticação (claim `cid` do JWT), guardado em AsyncLocalStorage. Rotas públicas resolvem o condomínio pelo slug. Nunca vem de corpo, query ou parâmetro de rota.
- Acesso a dado de condomínio passa por uma *client extension* do Prisma, `PrismaEscopado`, **fail-closed**:
  - injeta `condominioId` em toda leitura e escrita;
  - sem contexto de condomínio, lança exceção em vez de consultar sem filtro;
  - `$queryRaw` e `$executeRaw` ficam bloqueados nele.
- O client sem filtro (`PrismaSistema`) existe só para autocadastro e scripts, e o lint restringe onde pode ser importado.
- Um teste sobre o DMMF do Prisma exige que todo modelo esteja classificado como "de condomínio" ou "global". Modelo novo sem classificação quebra o build.
- Relações entre tabelas de condomínio usam **FK composta** `(condominio_id, x_id)`, de modo que o banco recusa ligar uma ocorrência a um usuário de outro condomínio.
- Recurso de outro condomínio responde **404**, não 403, para não confirmar a existência do id.

## Consequências

- Positivas: um único banco e uma única migração; o isolamento é garantido em três camadas (contexto, extensão Prisma e FK composta), e o teste do DMMF impede esquecer um modelo novo.
- Negativas: toda chave estrangeira carrega `condominio_id`, o que aumenta índices e deixa o esquema mais verboso; SQL cru precisa de caminho explícito e revisado.
- Riscos: um tenant muito grande disputa recursos com os demais (vizinho barulhento). Se acontecer, o caminho é particionar por `condominio_id` ou mover o tenant para outro banco, já que a chave existe em toda tabela.
- A suíte e2e de isolamento (`test/e2e/isolamento-tenant`) é obrigatória no CI.

## Implementação (issue #5)

Registro das escolhas feitas ao implementar a decisão acima, em `apps/api/src/core/{tenancy,prisma}`.

- **Contexto.** `ContextoTenant` (AsyncLocalStorage) tem três entradas:
  - um middleware abre um contexto vazio em toda requisição (`configurarApp`);
  - o guard de autenticação chama `ContextoTenant.vincular(cid)` com o `cid` do JWT; o valor vale até o fim da requisição e não pode ser trocado;
  - rota pública e script usam `ContextoTenant.executar(cid, fn)`. A rota pública resolve o condomínio pelo slug com `CondominiosPublicoService.executarNoCondominio(slug, fn)`.
- **Três classes de modelo**, numa lista única (`classificacao-modelos.ts`) que a extensão e o teste usam:
  - `escopado`: tem `condominioId` e é filtrado por ele;
  - `raiz`: o próprio `Condominio`, filtrado por `id` igual ao do contexto. Criar condomínio só pelo `PrismaSistema`;
  - `global`: passa sem filtro. Hoje não há nenhum.
- **`PrismaEscopado` falha fechado** além do filtro:
  - `condominioId` (ou `id`, na raiz) diferente do contexto no `where` ou no `data` gera exceção, em vez de ser sobrescrito em silêncio;
  - não aceita escrita aninhada em relação (`connect`, `create`, `set`...), que escaparia do hook do modelo filho: cada modelo é gravado na própria operação. Leitura aninhada (`include`/`select`) é segura porque toda relação entre tabelas de condomínio usa FK composta;
  - operação desconhecida e SQL cru (`$queryRaw`, `$executeRaw` e as variantes `Unsafe`) são recusados.
  - Os tipos do client continuam pedindo `condominioId` no `create`: passe `condominioId: ContextoTenant.exigir()`. A extensão grava o valor do contexto e recusa qualquer outro.
- **Lint.** O `.oxlintrc.json` da API proíbe importar `prisma-sistema` e instanciar `PrismaClient` fora de `src/core/prisma`, `src/core/health` (o `SELECT 1`), `src/features/condominios/publico/condominios-publico.service.ts` (autocadastro e resolução do slug), `prisma/`, `scripts/` e `test/`.
- **Teste do DMMF.** O generator `prisma-client` do Prisma 7 não exporta `Prisma.dmmf`. O teste usa `Prisma.ModelName` e `Prisma.<Modelo>ScalarFieldEnum`, gerados do mesmo DMMF.
- **`upsert` no MySQL não é atômico** (o Prisma faz `SELECT` e depois `INSERT`/`UPDATE`). Quem usar precisa tratar P2002 com `violouIndiceUnico`. O autocadastro trata a corrida pelo slug assim, sem pré-checagem.
- A suíte de isolamento fica em `apps/api/test/isolamento-tenant.e2e-spec.ts` e roda no job de e2e do CI, num banco `_test` separado.
