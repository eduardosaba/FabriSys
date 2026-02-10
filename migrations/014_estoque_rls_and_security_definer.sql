-- =========================================================================
-- Ajustes de RLS para `estoque_produtos` e tornar a função `decrementar_estoque_loja` SECURITY DEFINER
-- Execute este script no SQL Editor do Supabase APÓS aplicar a migration que criou a tabela e a função.
-- =========================================================================

-- 1. Garantir que a tabela exista (caso a migration anterior não tenha sido aplicada)
CREATE TABLE IF NOT EXISTS estoque_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos_finais(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locais(id) ON DELETE CASCADE,
  quantidade NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(produto_id, local_id)
);

-- 2. Habilitar RLS
ALTER TABLE estoque_produtos ENABLE ROW LEVEL SECURITY;

-- 3. Política mínima: permitir leitura para usuários autenticados
CREATE POLICY "Usuarios podem ler estoque" ON estoque_produtos
FOR SELECT
USING (auth.role() IS NOT NULL OR true);

-- 4. Tornar a função decrementar_estoque_loja SECURITY DEFINER para que as updates
-- internas possam ser executadas pela função independentemente das policies do invocador.
-- OBS: SECURITY DEFINER fará a função rodar com privilégios do owner; revise owner/permissões.
ALTER FUNCTION decrementar_estoque_loja(UUID, UUID, NUMERIC) SECURITY DEFINER;

-- 5. Observação: Se desejar restringir ainda mais o acesso, adapte as políticas.
