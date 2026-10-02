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
- O client sem filtro (`PrismaSistema`) existe só para login, autocadastro e scripts, e o lint restringe onde pode ser importado.
- Um teste sobre o DMMF do Prisma exige que todo modelo esteja classificado como "de condomínio" ou "global". Modelo novo sem classificação quebra o build.
- Relações entre tabelas de condomínio usam **FK composta** `(condominio_id, x_id)`, de modo que o banco recusa ligar uma ocorrência a um usuário de outro condomínio.
- Recurso de outro condomínio responde **404**, não 403, para não confirmar a existência do id.

## Consequências

- Positivas: um único banco e uma única migração; o isolamento é garantido em três camadas (contexto, extensão Prisma e FK composta), e o teste do DMMF impede esquecer um modelo novo.
- Negativas: toda chave estrangeira carrega `condominio_id`, o que aumenta índices e deixa o esquema mais verboso; SQL cru precisa de caminho explícito e revisado.
- Riscos: um tenant muito grande disputa recursos com os demais (vizinho barulhento). Se acontecer, o caminho é particionar por `condominio_id` ou mover o tenant para outro banco, já que a chave existe em toda tabela.
- A suíte e2e de isolamento (`test/e2e/isolamento-tenant`) é obrigatória no CI.
