-- Migration: criar tabelas de remessas e função RPC para criar remessa atomicamente
-- Cria: remessas, remessas_itens e função public.create_remessa(loja_id, itens jsonb, created_by)

-- Tabelas auxiliares
CREATE TABLE IF NOT EXISTS remessas (
  id BIGSERIAL PRIMARY KEY,
  loja_id INTEGER NOT NULL,
  created_by UUID NULL,
  status TEXT NOT NULL DEFAULT 'enviada',
  observacao TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Se a tabela `remessas` já existir com outro schema (ex: id uuid), garantimos
-- que as colunas esperadas existam para manter compatibilidade com a função RPC.
ALTER TABLE remessas ADD COLUMN IF NOT EXISTS loja_id INTEGER;
ALTER TABLE remessas ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE remessas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'enviada';
ALTER TABLE remessas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS remessas_itens (
  id BIGSERIAL PRIMARY KEY,
  -- armazenamos remessa_id como TEXT para manter compatibilidade com
  -- schemas existentes que podem usar UUID ou BIGINT para remessas.id
  remessa_id TEXT NOT NULL,
  -- armazenamos op_id como TEXT para evitar problemas de tipos entre
  -- ordens_producao.id (uuid vs bigint) em diferentes clientes
  op_id TEXT,
  produto_id INTEGER NOT NULL,
  quantidade_pedido INTEGER NOT NULL DEFAULT 0,
  quantidade_extra INTEGER NOT NULL DEFAULT 0
);

-- Índices para pesquisas rápidas
CREATE INDEX IF NOT EXISTS idx_remessas_loja_id ON remessas(loja_id);
CREATE INDEX IF NOT EXISTS idx_remessas_itens_op_id ON remessas_itens(op_id);

-- Função RPC: cria remessa e atualiza ordens_producao.quantidade_enviada_extra de forma atômica
-- Parâmetros:
--  - loja_id: id da loja destino
--  - itens: jsonb array de objetos { op_id, produto_id, quantidade_pedido, extra }
--  - created_by: uuid do usuário que criou a remessa (opcional)

CREATE OR REPLACE FUNCTION public.create_remessa(loja_id INTEGER, itens JSONB, created_by UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  remessa_id TEXT;
  item JSONB;
  v_op_id TEXT;
  v_produto_id INTEGER;
  v_qtd_pedido INTEGER;
  v_extra INTEGER;
  available INTEGER;
BEGIN
  -- Inserir remessa (não referenciamos `created_at` diretamente para manter compatibilidade
  -- com versões antigas do schema; se a coluna existir com DEFAULT now(), será preenchida)
  INSERT INTO remessas (loja_id, created_by, status)
  VALUES (loja_id, created_by, 'enviada')
  RETURNING id::text INTO remessa_id;

  -- Iterar itens fornecidos
  FOR item IN SELECT * FROM jsonb_array_elements(itens) LOOP
    v_op_id := (item ->> 'op_id');
    v_produto_id := (item ->> 'produto_id')::INTEGER;
    v_qtd_pedido := COALESCE((item ->> 'quantidade_pedido')::INTEGER, 0);
    v_extra := COALESCE((item ->> 'extra')::INTEGER, 0);

    IF v_extra > 0 THEN
      -- bloquear a linha da OP para evitar races
      SELECT (estoque_seguranca - COALESCE(quantidade_enviada_extra, 0))::INTEGER
      INTO available
      FROM ordens_producao
      WHERE id::text = v_op_id
      FOR UPDATE;

      IF available IS NULL THEN
        RAISE EXCEPTION 'OP % não encontrada', v_op_id;
      END IF;

      IF v_extra > available THEN
        RAISE EXCEPTION 'Reserva insuficiente na OP %: solicitado %, disponível %', v_op_id, v_extra, available;
      END IF;

      -- atualizar quantidade enviada do extra
        UPDATE ordens_producao
        SET quantidade_enviada_extra = COALESCE(quantidade_enviada_extra, 0) + v_extra,
          updated_at = now()
        WHERE id::text = v_op_id;
    END IF;

    -- Inserir item da remessa
    INSERT INTO remessas_itens (remessa_id, op_id, produto_id, quantidade_pedido, quantidade_extra)
    VALUES (remessa_id, v_op_id, v_produto_id, v_qtd_pedido, v_extra);
  END LOOP;

  RETURN remessa_id;
EXCEPTION WHEN others THEN
  -- Propaga erro para o chamador; transação do caller controlará rollback se necessário
  RAISE;
END;
$$;

-- Observações:
-- 1) A função utiliza COALESCE para evitar valores NULL em operações aritméticas.
-- 2) Ela bloqueia cada OP individualmente (FOR UPDATE) para garantir consistência concorrente.
-- 3) É recomendável criar uma role/definer segura se for necessário que a função execute ações elevadas.

-- Exemplo de chamada SQL (psql / psql-like):
-- SELECT public.create_remessa(1, '[{"op_id": 123, "produto_id": 45, "quantidade_pedido": 100, "extra": 10}]'::jsonb, '00000000-0000-0000-0000-000000000000');

-- Exemplo de chamada via Supabase JS:
-- const { data, error } = await supabase.rpc('create_remessa', {
--   loja_id: 1,
--   itens: JSON.stringify([{ op_id: 123, produto_id: 45, quantidade_pedido: 100, extra: 10 }]),
--   created_by: '00000000-0000-0000-0000-000000000000'
-- });
