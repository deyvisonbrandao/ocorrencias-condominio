# ADR-004 — Anonimato como pseudonimização perante a interface

- **Status:** Aceita
- **Data:** 2026-10-02

## Contexto

O morador quer poder relatar sem se expor ao síndico ou aos vizinhos. Ao mesmo tempo, o sistema precisa saber quem é o autor para permitir que ele acompanhe, comente, retire e reabra a própria ocorrência, e para conter abuso. Anonimato real (sem gravar o autor) inviabiliza esses fluxos.

## Decisão

- O morador está sempre autenticado e o `autor_id` é sempre gravado. "Anônima" é um atributo (`anonima = true`) que **oculta o autor perante a interface**, para síndico, subsíndico e outros moradores. Trata-se de pseudonimização, não de anonimização: o dado existe no banco.
- Admin nunca registra ocorrência anônima.
- A resposta da API é montada por **presenters por papel** com whitelist de campos (morador-autor, morador-terceiro, admin). Nenhum presenter serializa a entidade inteira.
- O `autor_id` nunca sai na API. O autor reconhece a própria ocorrência por um indicador booleano calculado no servidor a partir da sessão.
- Para outros moradores, de uma ocorrência não anônima sai só o bloco do autor; de uma anônima, nada do autor.
- Controllers separados por papel (`/ocorrencias` e `/admin/ocorrencias`), para que um endpoint de admin não reaproveite por acidente o presenter do morador, nem o contrário.
- Eventos da timeline seguem a mesma regra: evento de ocorrência anônima não expõe o autor nos dados devolvidos.
- **Logs nunca contêm o `autor_id` nem qualquer dado de identidade (nome, telefone, id de usuário) ligado a uma ocorrência anônima**, inclusive em log de erro e de requisição. Isso casa com a política de logs sem PII da issue #23.
- Um e2e de substring verifica que nenhuma resposta sobre ocorrência anônima contém id, nome ou telefone do autor.

## Consequências

- Positivas: os fluxos do autor funcionam normalmente; o vazamento por serialização acidental é barrado pela whitelist e pelo e2e.
- Negativas: quem tem acesso direto ao banco (operação, suporte) consegue identificar o autor. Isso precisa estar claro na política de privacidade (issue #25) e o acesso ao banco de produção deve ser restrito e auditado.
- Riscos: inferência por contexto (texto, horário, bloco) não é tratada pelo sistema; a interface avisa o morador ao marcar como anônima.
- Exclusão de conta (issue #25) torna `autor_id` NULL e mantém as ocorrências como "autor removido".
