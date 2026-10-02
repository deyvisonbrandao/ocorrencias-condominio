#!/usr/bin/env bash
# Banco sombra do `prisma migrate dev`: o usuário da aplicação não tem CREATE DATABASE global e não deve ter.
# Roda sozinho na criação do volume. Para um volume que já existe:
#   docker compose exec mysql bash /docker-entrypoint-initdb.d/01-banco-shadow.sh
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<EOSQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_shadow\`;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_shadow\`.* TO '${MYSQL_USER}'@'%';
EOSQL
