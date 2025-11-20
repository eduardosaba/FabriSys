# 🔧 GUIA COMPLETO - Resolver Erro 403 Fichas Técnicas

## ✅ PASSO 1: Executar Migration 035

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Cole e execute este código:

```sql
-- Migration 035: Corrige políticas RLS da tabela fichas_tecnicas

-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Admin tem acesso total" ON fichas_tecnicas;
DROP POLICY IF EXISTS "Fábrica pode visualizar fichas técnicas ativas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "admin_all_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_all_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_select_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_insert_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_update_fichas_tecnicas" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fabrica_delete_fichas_tecnicas" ON fichas_tecnicas;

-- Política para Admin (acesso total)
CREATE POLICY "admin_all_fichas_tecnicas"
  ON fichas_tecnicas
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- Política SELECT para Fábrica
CREATE POLICY "fabrica_select_fichas_tecnicas"
  ON fichas_tecnicas
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );

-- Política INSERT para Fábrica
CREATE POLICY "fabrica_insert_fichas_tecnicas"
  ON fichas_tecnicas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );

-- Política UPDATE para Fábrica
CREATE POLICY "fabrica_update_fichas_tecnicas"
  ON fichas_tecnicas
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );

-- Política DELETE para Fábrica
CREATE POLICY "fabrica_delete_fichas_tecnicas"
  ON fichas_tecnicas
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') IN ('admin', 'fabrica')
  );
```

4. Aguarde a mensagem de sucesso

---

## ✅ PASSO 2: Verificar Configuração

Execute este script para verificar:

```sql
-- 1. Ver sua role
SELECT
  auth.uid() as user_id,
  auth.jwt() ->> 'role' as user_role,
  auth.jwt() ->> 'email' as user_email;

-- 2. Ver políticas ativas
SELECT
  policyname,
  roles,
  cmd as operation
FROM pg_policies
WHERE tablename = 'fichas_tecnicas'
ORDER BY policyname;
```

**Resultado esperado:**

- Sua role deve ser: **'admin'** ou **'fabrica'**
- Deve ter 5 políticas listadas

---

## ✅ PASSO 3: Verificar Role do Usuário

Se sua role estiver **NULL** ou diferente de 'admin'/'fabrica':

```sql
-- Atualizar sua role para admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'SEU_EMAIL_AQUI@exemplo.com';
```

**⚠️ IMPORTANTE:** Após atualizar a role, faça **LOGOUT** e **LOGIN** novamente!

---

## ✅ PASSO 4: Testar na Aplicação

1. Faça logout e login novamente (se alterou a role)
2. Vá para: `/dashboard/producao/fichas-tecnicas/nova`
3. Selecione um produto
4. Adicione insumos
5. Clique em "Salvar"
6. Abra o **Console do Navegador** (F12) e veja os logs detalhados

---

## 🔍 Logs Esperados no Console

✅ **Sucesso:**

```
🔍 Dados a serem inseridos: [...]
📦 Total de insumos: 3
✅ Fichas criadas: [...]
```

❌ **Erro:**

```
❌ Erro detalhado: {...}
❌ Código: XXXXX
❌ Mensagem: ...
```

---

## 🆘 Se Ainda Não Funcionar

Me envie:

1. O resultado do PASSO 2 (sua role e políticas)
2. Os logs do console (PASSO 4)
3. Screenshot do erro

---

## 📌 Checklist Rápido

- [ ] Executei a migration 035 no Supabase
- [ ] Verifiquei minha role (admin ou fabrica)
- [ ] Fiz logout/login se mudei a role
- [ ] Vi as 5 políticas listadas
- [ ] Testei criar ficha técnica
- [ ] Verifiquei os logs no console (F12)
