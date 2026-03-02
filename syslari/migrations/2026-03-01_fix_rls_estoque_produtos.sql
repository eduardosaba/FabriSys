-- Corrige/Cria políticas RLS para permitir INSERTs válidos em estoque_produtos
-- Observação: para INSERT só é permitida expressão WITH CHECK (não USING).

-- 1) Permitir inserts realizados pelo `service_role` (usado por funções/serviços internos)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_produtos' AND polname = 'allow_service_inserts'
  ) THEN
    CREATE POLICY allow_service_inserts
      ON public.estoque_produtos
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- 2) Política segura para usuários autenticados: só permite inserir rows com organization_id igual ao JWT claim
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_produtos' AND polname = 'allow_org_insert_authenticated'
  ) THEN
    CREATE POLICY allow_org_insert_authenticated
      ON public.estoque_produtos
      FOR INSERT
      TO authenticated
      WITH CHECK (
        organization_id IS NOT NULL
        AND organization_id = (current_setting('jwt.claims.organization_id', true))::uuid
      );
  END IF;
END $$;

-- 3) (Opcional) Caso exista uma policy incorreta que use USING para INSERT, remova-a manualmente.
-- Exemplos de verificação/remoção manual:
-- SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='estoque_produtos';
-- DROP POLICY IF EXISTS nome_da_policy ON public.estoque_produtos;

-- 4) Recomendações:
-- - Execute esta migration no Supabase SQL editor como um usuário com privilégios (p.ex. role 'postgres' ou 'service_role').
-- - Após aplicar, reteste o fluxo de finalização da OP (Kanban -> Finalizar) para garantir que o INSERT passe.
