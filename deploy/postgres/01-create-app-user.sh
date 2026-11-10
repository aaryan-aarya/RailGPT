#!/bin/sh
set -eu

# The official Postgres image sources non-executable .sh init files, preserving
# access to POSTGRES_* and APP_DB_* environment variables.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 \
  --set=app_user="$APP_DB_USER" --set=app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password') \gexec
SELECT format('GRANT CONNECT, TEMPORARY ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
GRANT USAGE, CREATE ON SCHEMA public TO :"app_user";
SQL
