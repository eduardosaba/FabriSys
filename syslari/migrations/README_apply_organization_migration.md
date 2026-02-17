# Instruções: aplicar migration de organização e índices (Supabase)

Este documento contém o SQL final sugerido e passos seguros para aplicar as mudanças necessárias nas tabelas `user_theme_colors` e `configuracoes_sistema` no Supabase/Postgres.

IMPORTANTE: faça backup antes de qualquer alteração em produção.

---

## 1) Backup (obrigatório)

Execute no SQL editor do Supabase (ou via psql):

```sql
-- Backup completo das tabelas afetadas
CREATE TABLE backup_user_theme_colors AS TABLE user_theme_colors;
CREATE TABLE backup_configuracoes_sistema AS TABLE configuracoes_sistema;

-- Verifique tamanhos
SELECT count(*) FROM backup_user_theme_colors;
SELECT count(*) FROM backup_configuracoes_sistema;
```

Guarde os resultados e exporte os backups se desejar (Supabase permite exportar via UI).

---

## 2) Checar índices e duplicatas (diagnóstico)

```sql
-- Índices existentes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'user_theme_colors';
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'configuracoes_sistema';

-- Duplicatas por org+theme_mode
SELECT organization_id, theme_mode, count(*) FROM user_theme_colors
WHERE organization_id IS NOT NULL
GROUP BY organization_id, theme_mode HAVING count(*) > 1;

-- Duplicatas por user+theme_mode
SELECT user_id, theme_mode, count(*) FROM user_theme_colors
WHERE user_id IS NOT NULL
GROUP BY user_id, theme_mode HAVING count(*) > 1;

-- Duplicatas em configuracoes_sistema (por chave/org)
SELECT coalesce(organization_id::text,'__global__') AS org_key, chave, count(*)
FROM configuracoes_sistema
GROUP BY org_key, chave HAVING count(*) > 1;
```

Se as queries acima retornarem linhas, o próximo passo (migração) já inclui remoção segura das duplicatas.

---

## 3) SQL final recomendado (rodar em transação)

Este script:
- adiciona `organization_id`, `created_at`, `updated_at` (se ainda não existirem)
- normaliza timestamps
- remove duplicatas mantendo a linha mais recente (por `updated_at` ou `created_at`)
- cria índices necessários (útil para `ON CONFLICT` funcionar corretamente)

```sql
BEGIN;

-- 1) configuracoes_sistema: colunas e dedupe
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS configuracoes_sistema
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE configuracoes_sistema SET created_at = now() WHERE created_at IS NULL;
UPDATE configuracoes_sistema SET updated_at = now() WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_organization ON configuracoes_sistema (organization_id);

WITH duplicates AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY coalesce(organization_id::text,'__global__'), chave
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM configuracoes_sistema
)
DELETE FROM configuracoes_sistema
WHERE ctid IN (SELECT ctid FROM duplicates WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_configuracoes_sistema_chave_org
ON configuracoes_sistema ((coalesce(organization_id::text,'__global__')), chave);

-- 2) user_theme_colors: colunas e dedupe
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS user_theme_colors
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE user_theme_colors SET created_at = now() WHERE created_at IS NULL;
UPDATE user_theme_colors SET updated_at = now() WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_theme_colors_organization ON user_theme_colors (organization_id);

-- Remover duplicatas por (user_id, theme_mode)
WITH dup_user AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY user_id, theme_mode
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM user_theme_colors
  WHERE user_id IS NOT NULL
)
DELETE FROM user_theme_colors WHERE ctid IN (SELECT ctid FROM dup_user WHERE rn > 1);

-- Remover duplicatas por (organization_id, theme_mode)
WITH dup_org AS (
  SELECT ctid, ROW_NUMBER() OVER (
    PARTITION BY organization_id, theme_mode
    ORDER BY coalesce(updated_at, created_at) DESC
  ) AS rn
  FROM user_theme_colors
  WHERE organization_id IS NOT NULL
)
DELETE FROM user_theme_colors WHERE ctid IN (SELECT ctid FROM dup_org WHERE rn > 1);

-- Garantir índice ÚNICO que o ON CONFLICT possa usar (não-parcial)
-- Observação: usamos índice não-parcial em (organization_id, theme_mode) para que ON CONFLICT (organization_id,theme_mode) funcione
DROP INDEX IF EXISTS uq_user_theme_colors_org_theme_mode;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_theme_colors_org_theme_mode
  ON user_theme_colors (organization_id, theme_mode);

-- Mantemos também o índice por user (parcial) já criado anteriormente
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_theme_colors_user_theme_mode
  ON user_theme_colors (user_id, theme_mode)
  WHERE user_id IS NOT NULL;

COMMIT;
```

Observação: o `DROP INDEX IF EXISTS uq_user_theme_colors_org_theme_mode` remove o índice parcial anterior (se presente) e substitui por um índice não-parcial. Isso é necessário porque `ON CONFLICT (organization_id, theme_mode)` não casa com índices parciais.

---

## 4) Verificações pós-migração

```sql
-- Verifica índices
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'user_theme_colors';

-- Confirma que não há duplicatas
SELECT organization_id, theme_mode, count(*) FROM user_theme_colors
GROUP BY organization_id, theme_mode HAVING count(*) > 1;

SELECT user_id, theme_mode, count(*) FROM user_theme_colors
GROUP BY user_id, theme_mode HAVING count(*) > 1;

-- Teste rápido (substitua os valores de exemplo)
INSERT INTO user_theme_colors (user_id, organization_id, theme_mode, colors_json, created_at, updated_at)
VALUES (null, '00000000-0000-0000-0000-000000000000', 'light', '{}', now(), now())
ON CONFLICT (organization_id, theme_mode) DO UPDATE SET colors_json = EXCLUDED.colors_json, updated_at = now();
```

Se o `ON CONFLICT` acima executar sem erro, o caminho de upsert por `organization_id,theme_mode` está funcionando.

---

## 5) RLS / Policies (exemplo)

Dependendo de como está configurado seu Supabase (tabela `profiles` e `auth.uid()`), você pode criar políticas como estas:

```sql
-- Exemplo: permitir insert/update apenas para usuários autenticados que pertençam à mesma organization
-- Ajuste a lógica de acordo com seu esquema de perfis

-- Habilita RLS (se ainda não estiver)
ALTER TABLE user_theme_colors ENABLE ROW LEVEL SECURITY;

-- Política de inserção (apenas usuários autenticados que possuam o mesmo organization_id)
CREATE POLICY insert_user_theme_colors ON user_theme_colors FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      organization_id IS NULL OR organization_id = (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Política de update
CREATE POLICY update_user_theme_colors ON user_theme_colors FOR UPDATE
  USING (organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
  WITH CHECK (organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
```

ATENÇÃO: adapte as políticas ao seu modelo de permissões. Teste com contas reais antes de bloquear o acesso.

---

## 6) Rollback (se necessário)

Se algo der errado, você pode restaurar a partir das tabelas de backup:

```sql
BEGIN;
TRUNCATE user_theme_colors;
INSERT INTO user_theme_colors SELECT * FROM backup_user_theme_colors;
COMMIT;
```

E remover os índices que criamos:

```sql
DROP INDEX IF EXISTS uq_user_theme_colors_org_theme_mode;
DROP INDEX IF EXISTS uq_user_theme_colors_user_theme_mode;
DROP INDEX IF EXISTS idx_user_theme_colors_organization;
```

---

## 7) Observações finais

- Execute tudo no ambiente de staging primeiro.
- Mantenha os backups exportados até que confirme que tudo está OK.
- Se preferir, posso executar um script de verificação pós-migração ou adaptar as políticas RLS conforme seu modelo de `profiles`.

*** Fim das instruções ***
