# PowerShell script para aplicar migrations (Windows)
# Uso:
# $env:PGHOST = 'localhost'
# $env:PGPORT = '5432'
# $env:PGUSER = 'postgres'
# $env:PGPASSWORD = 'secret'
# $env:PGDATABASE = 'syslari_dev'
# .\scripts\apply_migrations_dev.ps1

if (-not $env:PGHOST -or -not $env:PGUSER -or -not $env:PGPASSWORD -or -not $env:PGDATABASE) {
    Write-Error "Defina as variáveis de ambiente: PGHOST, PGPORT (opcional), PGUSER, PGPASSWORD, PGDATABASE"
    exit 1
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$mig = Join-Path $root 'migrations'

Write-Host "Executando migrations em: $mig"

& psql -v ON_ERROR_STOP=1 "postgresql://$($env:PGUSER):$($env:PGPASSWORD)@$($env:PGHOST):$($env:PGPORT -or 5432)/$($env:PGDATABASE)" -f (Join-Path $mig '101_add_dias_funcionamento_locais.sql')
& psql -v ON_ERROR_STOP=1 "postgresql://$($env:PGUSER):$($env:PGPASSWORD)@$($env:PGHOST):$($env:PGPORT -or 5432)/$($env:PGDATABASE)" -f (Join-Path $mig '102_add_dias_defuncionamento_metas_vendas.sql')
& psql -v ON_ERROR_STOP=1 "postgresql://$($env:PGUSER):$($env:PGPASSWORD)@$($env:PGHOST):$($env:PGPORT -or 5432)/$($env:PGDATABASE)" -f (Join-Path $mig '103_add_meta_total_metas_vendas.sql')

Write-Host "Migrations aplicadas com sucesso (dev)."