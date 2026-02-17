#!/usr/bin/env bash
# Uso: export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
# Exemplo:
# export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=secret PGDATABASE=syslari_dev
# ./scripts/apply_migrations_dev.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$ROOT_DIR/migrations"

if [ -z "${PGHOST:-}" ] || [ -z "${PGUSER:-}" ] || [ -z "${PGPASSWORD:-}" ] || [ -z "${PGDATABASE:-}" ]; then
  echo "Defina as variáveis de ambiente: PGHOST, PGPORT (opcional), PGUSER, PGPASSWORD, PGDATABASE"
  exit 1
fi

echo "Executando migrations em: $MIG_DIR"
psql -v ON_ERROR_STOP=1 "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:${PGPORT:-5432}/$PGDATABASE" -f "$MIG_DIR/101_add_dias_funcionamento_locais.sql"
psql -v ON_ERROR_STOP=1 "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:${PGPORT:-5432}/$PGDATABASE" -f "$MIG_DIR/102_add_dias_defuncionamento_metas_vendas.sql"
psql -v ON_ERROR_STOP=1 "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:${PGPORT:-5432}/$PGDATABASE" -f "$MIG_DIR/103_add_meta_total_metas_vendas.sql"

echo "Migrations aplicadas com sucesso (dev)."