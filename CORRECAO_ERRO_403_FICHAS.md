# 🔧 CORREÇÃO DO ERRO 403 - Fichas Técnicas

## ❌ Problema Identificado

Erro 403 (Forbidden) ao tentar criar ficha técnica - As políticas RLS não permitem INSERT

## ✅ Solução

### Passo 1: Executar Migration 035

Abra o **SQL Editor** no Supabase e execute:

```sql
-- Cole o conteúdo completo do arquivo:
-- migrations/035_fix_fichas_tecnicas_rls.sql
```

Esta migration irá:

- ✓ Remover políticas antigas restritivas
- ✓ Criar novas políticas permitindo INSERT/UPDATE/DELETE para admin e fabrica
- ✓ Manter segurança com RLS ativo

### Passo 2: Verificar Permissões (Opcional)

Para confirmar que funcionou, execute:

```sql
-- Cole o conteúdo completo do arquivo:
-- migrations/debug_fichas_tecnicas_permissions.sql
```

Isso irá mostrar:

- Seu user_id e role atual
- Status do RLS
- Todas as políticas ativas

### Passo 3: Testar na Aplicação

1. Volte para a página de criar ficha técnica
2. Selecione um produto
3. Adicione insumos
4. Clique em "Salvar Ficha Técnica"

## 📊 O que foi corrigido

**Antes:**

```sql
-- Apenas SELECT para fabrica
CREATE POLICY "Fábrica pode visualizar fichas técnicas ativas"
  FOR SELECT  -- ❌ Só leitura!
```

**Depois:**

```sql
-- Políticas completas para fabrica
CREATE POLICY "fabrica_select_fichas_tecnicas" FOR SELECT ...
CREATE POLICY "fabrica_insert_fichas_tecnicas" FOR INSERT ... ✓
CREATE POLICY "fabrica_update_fichas_tecnicas" FOR UPDATE ... ✓
CREATE POLICY "fabrica_delete_fichas_tecnicas" FOR DELETE ... ✓
```

## 🔐 Segurança Mantida

As políticas continuam verificando:

- ✓ Usuário autenticado (authenticated)
- ✓ Role adequada (admin ou fabrica)
- ✓ RLS ativo na tabela

---

💡 **Após executar a migration 035, o erro 403 será resolvido!**
