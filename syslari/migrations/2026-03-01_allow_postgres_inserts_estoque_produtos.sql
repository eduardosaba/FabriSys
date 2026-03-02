-- Permite INSERTs em public.estoque_produtos pela role proprietária das funções (postgres)
-- Idempotente: cria a policy apenas se não existir

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos' AND policyname='allow_owner_inserts_postgres'
  ) THEN
    CREATE POLICY allow_owner_inserts_postgres
      ON public.estoque_produtos
      FOR INSERT
      TO postgres
      WITH CHECK (true);
  END IF;
END $$;

-- Recomenda-se aplicar esta migration no Supabase SQL Editor com usuário com privilégios.
