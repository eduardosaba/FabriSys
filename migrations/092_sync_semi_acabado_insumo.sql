-- 092_sync_semi_acabado_insumo.sql
-- Função + Trigger para sincronizar produtos semi-acabados com a tabela de insumos
BEGIN;

-- Criar índice único para suportar upsert por (organization_id, nome) quando a coluna existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insumos' AND column_name='organization_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'uniq_insumos_org_nome') THEN
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_insumos_org_nome ON public.insumos (organization_id, nome);
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'uniq_insumos_nome') THEN
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_insumos_nome ON public.insumos (nome);
    END IF;
  END IF;
END$$;

-- Função que sincroniza Produto Semi Acabado com Insumo
CREATE OR REPLACE FUNCTION public.fn_sincronizar_semi_acabado_insumo()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atuar quando tipo/flag indicar semi-acabado
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_finais' AND column_name='tipo') THEN
      IF (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos_finais' AND column_name='tipo') THEN NEW.tipo = 'semi_acabado' ELSE FALSE END) THEN
        -- Preparar valores de colunas opcionais sem referenciar diretamente NEW.col quando ausente
        DECLARE
          v_unidade text := 'UN';
          v_custo numeric := 0;
        BEGIN
          BEGIN
            v_unidade := NEW.unidade_estoque;
          EXCEPTION WHEN OTHERS THEN
            IF SQLSTATE = '42703' THEN
              v_unidade := 'UN';
            ELSE
              RAISE;
            END IF;
          END;

          BEGIN
            v_custo := COALESCE(NEW.preco_custo, 0);
          EXCEPTION WHEN OTHERS THEN
            IF SQLSTATE = '42703' THEN
              v_custo := 0;
            ELSE
              RAISE;
            END IF;
          END;

          -- Inserir ou atualizar insumo correspondente
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insumos' AND column_name='organization_id') THEN
            EXECUTE format($q$
              INSERT INTO public.insumos (organization_id, nome, unidade_estoque, custo_por_ue, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
              VALUES (%L, %L, %L, %s, 0, %L, 'virtual', NOW())
              ON CONFLICT (organization_id, nome) DO UPDATE SET custo_por_ue = EXCLUDED.custo_por_ue, produto_final_id = EXCLUDED.produto_final_id;
            $q$, NEW.organization_id::text, NEW.nome, v_unidade, v_custo::text, NEW.id::text);
          ELSE
            EXECUTE format($q$
              INSERT INTO public.insumos (nome, unidade_estoque, custo_por_ue, estoque_minimo_alerta, produto_final_id, tipo_insumo, created_at)
              VALUES (%L, %L, %s, 0, %L, 'virtual', NOW())
              ON CONFLICT (nome) DO UPDATE SET custo_por_ue = EXCLUDED.custo_por_ue, produto_final_id = EXCLUDED.produto_final_id;
            $q$, NEW.nome, v_unidade, v_custo::text, NEW.id::text);
          END IF;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger idempotente
DROP TRIGGER IF EXISTS trg_sincronizar_semi_acabado ON public.produtos_finais;
CREATE TRIGGER trg_sincronizar_semi_acabado
AFTER INSERT OR UPDATE ON public.produtos_finais
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_semi_acabado_insumo();

COMMIT;
