Objetivo
- Aplicar as migrations locais 101 → 102 → 103 no ambiente `dev`.

Requisitos
- Ter `psql` disponível no PATH.
- Fazer backup do DB antes de aplicar em qualquer ambiente.

Instruções (bash)
1. Exporte variáveis de conexão:

```bash
export PGHOST=your-host
export PGPORT=5432
export PGUSER=your-user
export PGPASSWORD=your-password
export PGDATABASE=syslari_dev
```
2. Execute o script:

```bash
chmod +x scripts/apply_migrations_dev.sh
./scripts/apply_migrations_dev.sh
```

Instruções (PowerShell)
1. Defina variáveis de ambiente no PowerShell:

```powershell
$env:PGHOST = 'your-host'
$env:PGPORT = '5432'
$env:PGUSER = 'your-user'
$env:PGPASSWORD = 'your-password'
$env:PGDATABASE = 'syslari_dev'
.\scripts\apply_migrations_dev.ps1
```

Notas importantes
- Execute primeiro em `dev` e verifique `metas_vendas` e `locais` para as colunas adicionadas (`dias_defuncionamento`, `meta_total`, `dias_funcionamento`).
- Se seu projeto usa Supabase, você também pode colar o SQL diretamente no editor SQL do painel do projeto (preferível para evitar problemas de conexão).

Checklist de verificação rápida (QA)
- Confirme que as colunas foram criadas:
  - `locais.dias_funcionamento` (`smallint[]`)
  - `metas_vendas.dias_defuncionamento` (`integer`)
  - `metas_vendas.meta_total` (`numeric(14,2)`)
- Pelo frontend (`/dashboard/configuracoes/metas`):
  - Carregar locais e ver `dias_funcionamento` preenchido corretamente.
  - Distribuir meta mensal e salvar; verificar que `metas_vendas` contém `valor_meta`, `dias_defuncionamento` e `meta_total`.
- No dashboard, verifique que o `MetaDoDia` mostra meta diária coerente e os widgets não lançam erros 400/42703.

Se quiser, eu posso:
- Gerar um único script SQL concatenado para revisar antes de aplicar.
- Tentar aplicar as migrations se você fornecer credenciais (recomendo NÃO fornecer credenciais em chat público).