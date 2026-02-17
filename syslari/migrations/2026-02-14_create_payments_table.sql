-- Migration: criar tabela payments (compatível com backfill)
-- Autor: gerado automaticamente
-- Data: 2026-02-14

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id UUID NOT NULL,
  metodo TEXT,
  method TEXT,
  amount numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tenta criar foreign key se a tabela vendas existir e a coluna id for UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vendas') THEN
    BEGIN
      ALTER TABLE public.payments
      ADD CONSTRAINT payments_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;

-- Habilita RLS e adiciona política permissiva para usuários autenticados
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.payments;
CREATE POLICY "Allow all for authenticated users" ON public.payments
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.payments IS 'Registros de pagamentos (alias payments) associados às vendas (criada para backfill)';
