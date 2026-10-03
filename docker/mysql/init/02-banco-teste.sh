#!/usr/bin/env bash
# Banco dos testes e2e: eles gravam e apagam dados, então não podem rodar no banco de desenvolvimento.
# Roda sozinho na criação do volume. Para um volume que já existe:
#   docker compose exec mysql bash /docker-entrypoint-initdb.d/02-banco-teste.sh
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<EOSQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
EOSQL
