-- Migration: policies based on organization_id
-- Drop existing policies (if present) and recreate using profiles.organization_id

-- VENDAS
ALTER TABLE IF EXISTS public.vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendas_select_by_local ON public.vendas;
DROP POLICY IF EXISTS vendas_insert_by_local ON public.vendas;
DROP POLICY IF EXISTS vendas_update_by_local ON public.vendas;
DROP POLICY IF EXISTS vendas_delete_by_local ON public.vendas;

CREATE POLICY vendas_select_by_org ON public.vendas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.vendas.organization_id)
    )
  );

CREATE POLICY vendas_insert_by_org ON public.vendas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.vendas.organization_id)
    )
  );

CREATE POLICY vendas_update_by_org ON public.vendas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.vendas.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.vendas.organization_id)
    )
  );

CREATE POLICY vendas_delete_by_org ON public.vendas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.vendas.organization_id)
    )
  );

-- ITENS_VENDA (verifica organização através da venda relacionada)
ALTER TABLE IF EXISTS public.itens_venda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS itens_venda_select_by_org ON public.itens_venda;
DROP POLICY IF EXISTS itens_venda_insert_by_org ON public.itens_venda;
DROP POLICY IF EXISTS itens_venda_update_by_org ON public.itens_venda;
DROP POLICY IF EXISTS itens_venda_delete_by_org ON public.itens_venda;

CREATE POLICY itens_venda_select_by_org ON public.itens_venda
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendas v ON v.id = public.itens_venda.venda_id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = v.organization_id)
    )
  );

CREATE POLICY itens_venda_insert_by_org ON public.itens_venda
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendas v ON v.id = public.itens_venda.venda_id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = v.organization_id)
    )
  );

CREATE POLICY itens_venda_update_by_org ON public.itens_venda
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendas v ON v.id = public.itens_venda.venda_id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = v.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendas v ON v.id = public.itens_venda.venda_id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = v.organization_id)
    )
  );

CREATE POLICY itens_venda_delete_by_org ON public.itens_venda
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendas v ON v.id = public.itens_venda.venda_id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = v.organization_id)
    )
  );

-- CAIXA_SESSAO
ALTER TABLE IF EXISTS public.caixa_sessao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS caixa_sessao_select_by_org ON public.caixa_sessao;
DROP POLICY IF EXISTS caixa_sessao_insert_by_org ON public.caixa_sessao;
DROP POLICY IF EXISTS caixa_sessao_update_by_org ON public.caixa_sessao;
DROP POLICY IF EXISTS caixa_sessao_delete_by_org ON public.caixa_sessao;

CREATE POLICY caixa_sessao_select_by_org ON public.caixa_sessao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_sessao.organization_id)
    )
  );

CREATE POLICY caixa_sessao_insert_by_org ON public.caixa_sessao
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_sessao.organization_id)
    )
  );

CREATE POLICY caixa_sessao_update_by_org ON public.caixa_sessao
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_sessao.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_sessao.organization_id)
    )
  );

CREATE POLICY caixa_sessao_delete_by_org ON public.caixa_sessao
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_sessao.organization_id)
    )
  );

-- CAIXA_DIARIO
ALTER TABLE IF EXISTS public.caixa_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS caixa_diario_select_by_org ON public.caixa_diario;
DROP POLICY IF EXISTS caixa_diario_insert_by_org ON public.caixa_diario;
DROP POLICY IF EXISTS caixa_diario_update_by_org ON public.caixa_diario;
DROP POLICY IF EXISTS caixa_diario_delete_by_org ON public.caixa_diario;

CREATE POLICY caixa_diario_select_by_org ON public.caixa_diario
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_diario.organization_id)
    )
  );

CREATE POLICY caixa_diario_insert_by_org ON public.caixa_diario
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_diario.organization_id)
    )
  );

CREATE POLICY caixa_diario_update_by_org ON public.caixa_diario
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_diario.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_diario.organization_id)
    )
  );

CREATE POLICY caixa_diario_delete_by_org ON public.caixa_diario
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.organization_id = public.caixa_diario.organization_id)
    )
  );

-- End of migration
