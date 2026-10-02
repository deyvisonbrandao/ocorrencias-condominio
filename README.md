# Ocorrências de Condomínio

SaaS mobile-first, multi-tenant, para registro e acompanhamento de ocorrências de condomínio.

- **Stack:** Angular + Tailwind/Flowbite · NestJS + Prisma · MySQL 8.4
- **Desenho do MVP:** [docs/arquitetura-mvp.md](docs/arquitetura-mvp.md)
- **Decisões de arquitetura:** [docs/adr/](docs/adr/)
- **Board:** https://github.com/users/deyvisonbrandao/projects/5

## Estrutura

```
apps/api/             API NestJS (porta 3000, prefixo /api)
apps/web/             SPA Angular (porta 4200, proxy /api -> API)
packages/contratos/   enums e tipos compartilhados entre API e web
docs/                 plano do MVP e ADRs
```

## Pré-requisitos

- **Node.js 22.22.3 ou superior** na linha 22 (ou 24.15+), versão mínima exigida pelo Angular CLI 22. O `.nvmrc` fixa `22.22.3` para quem usa nvm/fnm; no **nvm-windows**, que não lê `.nvmrc`, rode `nvm install 22.22.3` e `nvm use 22.22.3`.
- **npm 10+** (vem com o Node).
- **Docker** com **Docker Compose v2+** (Docker Desktop no Windows/macOS).
- Portas livres: `3306` (MySQL), `3000` (API) e `4200` (web). A porta do MySQL é configurável no `.env`.

## Como rodar localmente

1. Clone e entre na pasta:
   ```bash
   git clone https://github.com/deyvisonbrandao/ocorrencias-condominio.git
   cd ocorrencias-condominio
   ```
2. Crie o `.env` a partir do exemplo e troque as senhas:
   ```bash
   cp .env.example .env
   ```
   No PowerShell: `Copy-Item .env.example .env`.

   - A `DATABASE_URL` repete usuário, senha, porta e banco do bloco MySQL: se mudar algum deles, ajuste a URL também.
   - As senhas do MySQL só são aplicadas na primeira subida, quando o volume é criado. Para trocá-las depois, rode `docker compose down -v` (apaga os dados deste projeto) e suba de novo.
3. Suba o MySQL; o comando só retorna quando o container estiver `healthy`:
   ```bash
   docker compose up -d --wait
   ```
   Na primeira vez o Docker baixa a imagem `mysql:8.4` e inicializa o banco, o que leva cerca de 30 segundos. `docker compose ps` mostra o status.
4. Instale as dependências de todos os workspaces:
   ```bash
   npm install
   ```
5. Suba API e web juntos:
   ```bash
   npm run dev
   ```
   - Web: http://localhost:4200
   - API: http://localhost:3000/api (responde `Hello World!`)
   - Pelo proxy do web: http://localhost:4200/api

   `Ctrl+C` encerra todos os processos.

## Scripts da raiz

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Compila `packages/contratos` e sobe juntos o watch de contratos, a API (watch) e o web (`ng serve`) |
| `npm run build` | Build de produção de contratos, API e web |
| `npm run lint` | Lint da API (oxlint) e checagem de tipos de contratos |
| `npm test` | Testes unitários da API e da web (Vitest) |
| `npm run db:up` / `npm run db:down` | Sobe o MySQL esperando ficar `healthy` / para o MySQL (o volume com os dados é mantido) |

Para rodar um script de um workspace só: `npm run <script> -w @ocorrencias/api` (ou `@ocorrencias/web`, `@ocorrencias/contratos`).

## Banco de dados

- Imagem oficial `mysql:8.4`, com `utf8mb4`, `utf8mb4_0900_ai_ci` e fuso `+00:00` definidos no `command` do `docker-compose.yml`.
- Volume nomeado `ocorrencias-condominio_mysql_data`; `docker compose down` preserva os dados.
- Para zerar o banco deste projeto: `docker compose down -v` (remove só o volume deste compose).
- Conexão a partir do host: `127.0.0.1:${MYSQL_PORT}`, usuário e senha do `.env`. A porta não é exposta para a rede local.
