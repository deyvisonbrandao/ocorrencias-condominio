# ADR-005 — IA fora do MVP, com porta para entrar depois

- **Status:** Aceita
- **Data:** 2026-10-02

## Contexto

Classificação automática de tipo, sugestão de urgência e detecção de ocorrências similares são desejáveis, mas não são necessárias para validar o produto. Colocar IA no MVP traz custo variável, dependência externa no caminho da criação, latência, tratamento de dado pessoal enviado a terceiros e avaliação de qualidade, tudo antes de haver uso real para calibrar.

## Decisão

- Nenhuma funcionalidade de IA no MVP: o tipo é escolhido pelo morador e a urgência é definida pelo síndico na triagem.
- O desenho só reserva espaço para a IA entrar depois, sem implementá-la agora:
  - uma **porta** no domínio (ex.: `ClassificadorOcorrencia`, `BuscadorSimilares`) com provedor plugável, sem adaptador no MVP;
  - quando entrar, a análise roda **fora da requisição**, via fila **outbox** gravada na mesma transação da criação da ocorrência e consumida por um worker idempotente;
  - o resultado da IA é **sugestão**: vai para campos próprios (`tipo_ia`, `urgencia_ia`) e tabelas próprias (`analise_ia`, `ocorrencia_similar`), sem sobrescrever `tipo_declarado`, `tipo_confirmado` nem `urgencia`.
- Campos e tabelas de IA **não** são criados agora. Entram por migração em fases quando a funcionalidade for priorizada.

## Consequências

- Positivas: o MVP não depende de provedor externo nem de custo variável; a criação de ocorrência continua síncrona e simples; o modelo de dados não carrega colunas mortas.
- Negativas: a triagem é manual, o que custa tempo ao síndico e é a principal dor que a IA resolveria depois.
- Quando a IA entrar, será preciso: nova ADR escolhendo o provedor; revisão de privacidade (o texto da ocorrência pode conter dado pessoal, e anonimato do ADR-004 vale também para o que vai ao provedor); timeout, retry com backoff e limite de custo por condomínio; e métrica de concordância entre a sugestão e a decisão do síndico.
