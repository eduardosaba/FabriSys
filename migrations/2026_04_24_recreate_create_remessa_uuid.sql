-- Recria a função create_remessa com `loja_id` do tipo UUID.
-- Use em staging: psql "host=... user=... dbname=..." -f migrations/2026_04_24_recreate_create_remessa_uuid.sql

-- Dropar assinaturas conhecidas para evitar conflito de nome/assinatura
DROP FUNCTION IF EXISTS public.create_remessa(integer, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_remessa(integer, jsonb);
DROP FUNCTION IF EXISTS public.create_remessa(uuid, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_remessa(uuid, jsonb);

-- Criar a versão robusta com p_loja_id uuid
CREATE OR REPLACE FUNCTION public.create_remessa(
  p_loja_id uuid,
  p_itens jsonb,
  p_created_by uuid DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remessa_id text;
  v_id_type text;
  v_seq text;
  v_has_gen_random boolean := false;
  v_has_uuid_gen boolean := false;
  v_id_expr text;
  r jsonb;
  v_op_id text;
  v_produto_id text;
  v_qtd_pedido int;
  v_extra int;
  v_estoque int;
  v_enviada int;
BEGIN
  -- Detectar tipo da coluna remessas.id
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_id_type
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  WHERE c.relname = 'remessas' AND a.attname = 'id';

  SELECT pg_get_serial_sequence('remessas','id') INTO v_seq;
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='gen_random_uuid') INTO v_has_gen_random;
  SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='uuid_generate_v4') INTO v_has_uuid_gen;

  IF v_id_type ILIKE 'uuid%' THEN
    IF v_has_gen_random THEN
      v_id_expr := 'gen_random_uuid()';
    ELSIF v_has_uuid_gen THEN
      v_id_expr := 'uuid_generate_v4()';
    ELSE
      RAISE EXCEPTION 'create_remessa: nenhum gerador de uuid disponível (gen_random_uuid/uuid_generate_v4)';
    END IF;
  ELSIF v_id_type ILIKE 'bigint%' OR v_id_type ILIKE 'integer%' THEN
    IF v_seq IS NOT NULL THEN
      v_id_expr := format('nextval(%L)', v_seq);
    ELSE
      RAISE EXCEPTION 'create_remessa: remessas.id é integer/bigint sem sequência detectada';
    END IF;
  ELSE
    IF v_has_gen_random THEN
      v_id_expr := 'gen_random_uuid()';
    ELSIF v_has_uuid_gen THEN
      v_id_expr := 'uuid_generate_v4()';
    ELSE
      RAISE EXCEPTION 'create_remessa: tipo de id de remessas não suportado e sem gerador de uuid';
    END IF;
  END IF;

  -- Inserir remessa usando id gerado explicitamente
  EXECUTE format(
    'INSERT INTO remessas (id, loja_id, created_by, status) VALUES (%s, $1, $2, $3) RETURNING id::text',
    v_id_expr
  )
  USING p_loja_id, p_created_by, 'enviada'
  INTO v_remessa_id;

  -- Processar itens de forma atômica (caller controla transação)
  FOR r IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    v_op_id := (r ->> 'op_id');
    v_produto_id := (r ->> 'produto_id');
    v_qtd_pedido := COALESCE((r ->> 'quantidade_pedido')::int, 0);
    v_extra := COALESCE((r ->> 'extra')::int, 0);

    SELECT estoque_seguranca, COALESCE(quantidade_enviada_extra,0)
      INTO v_estoque, v_enviada
    FROM ordens_producao
    WHERE id::text = v_op_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'op_not_found: %', v_op_id;
    END IF;

    IF v_extra > (v_estoque - v_enviada) THEN
      RAISE EXCEPTION 'insuficiente';
    END IF;

    UPDATE ordens_producao
      SET quantidade_enviada_extra = COALESCE(quantidade_enviada_extra,0) + v_extra
    WHERE id::text = v_op_id;

    INSERT INTO remessas_itens (remessa_id, op_id, produto_id, quantidade_pedido, quantidade_extra)
    VALUES (v_remessa_id, v_op_id, v_produto_id, v_qtd_pedido, v_extra);
  END LOOP;

  RETURN v_remessa_id;
END;
$$;
