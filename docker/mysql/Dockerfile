FROM mysql:8.4

# Copiado na imagem (e não montado): bind mount no Docker Desktop/Windows chega como 0777
# e o mysqld ignora arquivo de configuração gravável por todos.
COPY --chmod=0644 conf.d/ /etc/mysql/conf.d/
