-- Permite exclusão de pedidos de compra sob RLS
ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pedidos_compra' AND policyname = 'Permitir exclusão de pedidos'
  ) THEN
    CREATE POLICY "Permitir exclusão de pedidos" ON pedidos_compra
      FOR DELETE USING (true);
  END IF;
END$$;
