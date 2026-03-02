-- Combined migration: apply_all_migrations.sql
-- Includes: enviar_carga_loja, receber_carga_pdv, trigger to set produto_id, and add local_origem/local_destino to ordens_producao
-- Apply in Supabase SQL editor. Idempotent where possible.

-- ==========================================
-- 1. FUNÇÕES: LIMPEZA DE FUNÇÕES ANTIGAS
-- ==========================================
DROP FUNCTION IF EXISTS public.enviar_carga_loja(uuid, numeric, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.receber_carga_pdv(uuid, numeric, uuid, uuid);

-- ==========================================
-- 2. FUNÇÃO: ENVIAR CARGA (FÁBRICA -> LOJA)
-- ==========================================
CREATE OR REPLACE FUNCTION public.enviar_carga_loja(
    p_produto_id uuid,
    p_quantidade numeric,
    p_local_origem_id uuid,
    p_local_destino_id uuid,
    p_ordem_producao_id uuid DEFAULT NULL
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_atual numeric;
    v_org_id uuid;
BEGIN
    -- Busca saldo e OrgID
    SELECT quantidade, organization_id INTO v_saldo_atual, v_org_id
    FROM public.estoque_produtos
    WHERE local_id = p_local_origem_id AND produto_id = p_produto_id;

    -- Validação de Estoque
    IF v_saldo_atual IS NULL OR v_saldo_atual < p_quantidade THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Estoque insuficiente na fábrica. Disponível: ' || COALESCE(v_saldo_atual, 0)
        );
    END IF;

    -- Saída da Fábrica
    UPDATE public.estoque_produtos 
    SET quantidade = quantidade - p_quantidade, updated_at = now()
    WHERE local_id = p_local_origem_id AND produto_id = p_produto_id;

    -- Entrada no PDV (Soma ao saldo existente ou cria novo)
    INSERT INTO public.estoque_produtos (local_id, produto_id, quantidade, organization_id, updated_at)
    VALUES (p_local_destino_id, p_produto_id, p_quantidade, v_org_id, now())
    ON CONFLICT (local_id, produto_id) 
    DO UPDATE SET 
        quantidade = estoque_produtos.quantidade + EXCLUDED.quantidade,
        updated_at = now();

    -- Nota: A atualização de status_logistica foi removida para evitar conflitos de constraint.
    -- O status deve ser atualizado via Front-end ou Trigger específica.

    RETURN json_build_object('success', true, 'message', 'Carga enviada com sucesso!');
END;
$$;

-- ==========================================
-- 3. FUNÇÃO: RECEBER CARGA (CONFIRMAÇÃO NO PDV)
-- ==========================================
CREATE OR REPLACE FUNCTION public.receber_carga_pdv(
    p_distribuicao_id uuid,
    p_quantidade_recebida numeric,
    p_local_destino_id uuid,
    p_produto_id uuid
)
RETURNS json 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.locais WHERE id = p_local_destino_id;

    -- Atualiza status da distribuição
    UPDATE public.distribuicao_pedidos
    SET status = 'entregue',
        quantidade_entregue = p_quantidade_recebida,
        updated_at = now()
    WHERE id = p_distribuicao_id;

    -- O estoque já foi pré-movimentado no envio, aqui apenas confirmamos o status.
    -- Caso sua lógica exija que o estoque SÓ entre na loja aqui, 
    -- moveríamos o INSERT do enviar_carga para cá.

    RETURN json_build_object('success', true, 'message', 'Recebimento confirmado no sistema!');
END;
$$;

-- ==========================================
-- 4. TRIGGER: Preencher produto_id em distribuicao_pedidos
-- ==========================================
-- Safe drop + create so applying multiple times is idempotent
DROP TRIGGER IF EXISTS trg_set_produto_on_distribuicao ON public.distribuicao_pedidos;
DROP FUNCTION IF EXISTS public.trg_set_produto_on_distribuicao();

CREATE OR REPLACE FUNCTION public.trg_set_produto_on_distribuicao()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.produto_id IS NULL AND NEW.ordem_producao_id IS NOT NULL THEN
    SELECT produto_final_id INTO NEW.produto_id
    FROM public.ordens_producao
    WHERE id = NEW.ordem_producao_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_produto_on_distribuicao
BEFORE INSERT OR UPDATE ON public.distribuicao_pedidos
FOR EACH ROW EXECUTE FUNCTION public.trg_set_produto_on_distribuicao();

-- ==========================================
-- 5. MIGRATION: Adicionar local_origem_id/local_destino_id em ordens_producao
-- ==========================================
ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS local_origem_id uuid;

ALTER TABLE IF EXISTS public.ordens_producao
  ADD COLUMN IF NOT EXISTS local_destino_id uuid;

-- Popular local_origem_id com a fábrica da mesma organization, quando possível
UPDATE public.ordens_producao op
SET local_origem_id = (
  SELECT id FROM public.locais l WHERE l.tipo = 'fabrica' AND l.organization_id = op.organization_id LIMIT 1
)
WHERE local_origem_id IS NULL;

-- Fim do arquivo
