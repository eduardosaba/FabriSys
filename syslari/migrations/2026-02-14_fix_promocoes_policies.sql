-- Migration: Corrigir políticas RLS para promocoes e promocao_itens
-- Data: 2026-02-14

-- Garante que as tabelas tenham RLS ativado
ALTER TABLE IF EXISTS public.promocoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promocao_itens ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Acesso Promocoes" ON public.promocoes;
DROP POLICY IF EXISTS "Acesso Promocao Itens" ON public.promocao_itens;

-- Criar políticas com USING (para SELECT/UPDATE/DELETE) e WITH CHECK (para INSERT/UPDATE)
CREATE POLICY "Acesso Promocoes" ON public.promocoes
  FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Acesso Promocao Itens" ON public.promocao_itens
  FOR ALL
  TO authenticated
  USING (
    promocao_id IN (
      SELECT id FROM public.promocoes
      WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    promocao_id IN (
      SELECT id FROM public.promocoes
      WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Nota: Caso a API use um role de serviço para inserts (RPC), adapte as policies conforme necessário.
