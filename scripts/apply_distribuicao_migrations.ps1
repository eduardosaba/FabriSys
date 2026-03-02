<#
  apply_distribuicao_migrations.ps1

  Script PowerShell para aplicar as migrations relacionadas a `distribuicao_pedidos`
  e executar verificações rápidas no banco.

  Uso:
    - Defina a variável de ambiente `DATABASE_URL` com a connection string do Postgres
      (format: postgresql://user:pass@host:port/dbname) OU informe quando solicitado.
    - Execute no PowerShell:
        .\scripts\apply_distribuicao_migrations.ps1

  Observação: este script usa `psql` (cliente Postgres). Garanta que esteja instalado
  e disponível no PATH.
#>

Set-StrictMode -Version Latest

function ExitOnError($code, $message) {
    if ($code -ne 0) {
        Write-Error $message
        exit $code
    }
}

if (-not $env:DATABASE_URL) {
    $db = Read-Host "DATABASE_URL não definido: cole a connection string (postgresql://user:pass@host:port/db)"
} else {
    $db = $env:DATABASE_URL
}

if (-not $db) {
    Write-Error "Connection string não fornecida. Abortando."
    exit 1
}

$repoRoot = Resolve-Path -Path "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)/.." | Select-Object -ExpandProperty Path

$m1 = Join-Path $repoRoot 'syslari/migrations/2026-02-27_distribuicao_pedidos_prepare_and_trigger.sql'
$m2 = Join-Path $repoRoot 'syslari/migrations/2026-02-27_distribuicao_pedidos_fks.sql'

if (-not (Test-Path $m1)) { Write-Error "Arquivo não encontrado: $m1"; exit 1 }
if (-not (Test-Path $m2)) { Write-Error "Arquivo não encontrado: $m2"; exit 1 }

Write-Host "Aplicando migration 1: $m1" -ForegroundColor Cyan
& psql $db -f $m1
ExitOnError $LASTEXITCODE "Falha ao aplicar $m1"

Write-Host "Aplicando migration 2: $m2" -ForegroundColor Cyan
& psql $db -f $m2
ExitOnError $LASTEXITCODE "Falha ao aplicar $m2"

Write-Host "Migrations aplicadas com sucesso." -ForegroundColor Green

Write-Host "Executando verificações rápidas..." -ForegroundColor Cyan

$queries = @(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'public.distribuicao_pedidos'::regclass;",
    "SELECT id, ordem_producao_id, produto_id, quantidade_solicitada, status FROM public.distribuicao_pedidos WHERE status = 'pendente' LIMIT 50;",
    "SELECT DISTINCT status_logistica FROM public.ordens_producao;"
)

foreach ($q in $queries) {
    Write-Host "--- QUERY: $q" -ForegroundColor Yellow
    & psql $db -c $q
    ExitOnError $LASTEXITCODE "Query falhou: $q"
}

Write-Host "Próximo passo: reinicie o banco no Supabase Console (Settings → Database → Restart) para forçar atualização do cache do PostgREST/Reatime." -ForegroundColor Magenta

Write-Host "Script finalizado." -ForegroundColor Green
