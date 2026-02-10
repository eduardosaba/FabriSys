-- 075_registro_perdas.sql
-- Cria a tabela `registro_perdas` e a função `registrar_perda_estoque`.
-- Execute no Supabase SQL Editor ou via psql.

BEGIN;

-- Tabela de perdas/quedas/queixas
CREATE TABLE IF NOT EXISTS public.registro_perdas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  local_id UUID REFERENCES public.locais(id),
  produto_id UUID REFERENCES public.produtos_finais(id),
  quantidade numeric(10,2) NOT NULL,
  motivo text NOT NULL,
  observacao text,
  responsavel_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Função para registrar perda e baixar estoque automaticamente
CREATE OR REPLACE FUNCTION public.registrar_perda_estoque(
  p_local_id UUID,
  p_produto_id UUID,
  p_quantidade numeric,
  p_motivo text,
  p_observacao text,
  p_responsavel_id UUID
) RETURNS jsonb AS $$
BEGIN
  -- 1. Inserir o registro de perda
  INSERT INTO public.registro_perdas (local_id, produto_id, quantidade, motivo, observacao, responsavel_id)
  VALUES (p_local_id, p_produto_id, p_quantidade, p_motivo, p_observacao, p_responsavel_id);

  -- 2. Baixar do estoque físico
  UPDATE public.estoque_produtos
  SET quantidade = quantidade - p_quantidade
  WHERE local_id = p_local_id AND produto_id = p_produto_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao registrar perda: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Após aplicar, reinicie o Database (Settings -> Database -> Restart) para atualizar o cache do PostgREST/Realtime.
