-- =========================================================================
-- Script: Setup de Metas de Vendas e Sistema de Fidelidade
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- 1. Tabela de Clientes e Pontos de Fidelidade
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT UNIQUE, -- Chave principal para busca
  cpf TEXT,
  saldo_pontos DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Metas de Vendas (Meta por Loja e Data)
CREATE TABLE IF NOT EXISTS metas_vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  local_id UUID REFERENCES locais(id) ON DELETE CASCADE,
  data_referencia DATE DEFAULT CURRENT_DATE,
  valor_meta DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, data_referencia) -- Uma meta por loja por dia
);

-- 3. Adicionar coluna cliente_id na tabela vendas (caso não exista)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_metas_vendas_local_data ON metas_vendas(local_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);

-- 5. RPC para atualizar pontos do cliente (atomicamente)
CREATE OR REPLACE FUNCTION atualizar_pontos_cliente(
  p_cliente_id UUID,
  p_pontos_delta DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE clientes 
  SET saldo_pontos = saldo_pontos + p_pontos_delta,
      updated_at = NOW()
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC para finalizar venda completa (com fidelidade)
-- (Substitui a função anterior se existir)
CREATE OR REPLACE FUNCTION finalizar_venda_completa(
  p_local_id UUID,
  p_caixa_id UUID,
  p_total_venda DECIMAL,
  p_metodo_pagamento TEXT,
  p_itens JSONB,
  p_modo_pdv TEXT,
  p_cliente_id UUID DEFAULT NULL,
  p_pontos_usados DECIMAL DEFAULT 0,
  p_pontos_ganhos DECIMAL DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_venda_id UUID;
  item JSONB;
BEGIN
  -- 1. Inserir Venda vinculada ao Cliente (se houver)
  INSERT INTO vendas (local_id, caixa_id, total_venda, metodo_pagamento, status, cliente_id)
  VALUES (p_local_id, p_caixa_id, p_total_venda, p_metodo_pagamento, 'concluida', p_cliente_id)
  RETURNING id INTO v_venda_id;

  -- 2. Processar cada item do carrinho
  FOR item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    
    -- Inserir Item da Venda
    INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal)
    VALUES (
      v_venda_id,
      (item->>'produto_id')::UUID,
      (item->>'quantidade')::DECIMAL,
      (item->>'preco_unitario')::DECIMAL,
      (item->>'subtotal')::DECIMAL
    );

    -- 3. Baixar Estoque (Apenas se o modo for 'padrao')
    IF p_modo_pdv = 'padrao' THEN
      PERFORM decrementar_estoque_loja(
        p_local_id,
        (item->>'produto_id')::UUID,
        (item->>'quantidade')::DECIMAL
      );
    END IF;

  END LOOP;

  -- 4. LÓGICA DE FIDELIDADE
  IF p_cliente_id IS NOT NULL THEN
    -- Debitar pontos usados (se houve resgate)
    IF p_pontos_usados > 0 THEN
      UPDATE clientes 
      SET saldo_pontos = saldo_pontos - p_pontos_usados,
          updated_at = NOW()
      WHERE id = p_cliente_id;
    END IF;

    -- Creditar novos pontos (Cashback)
    IF p_pontos_ganhos > 0 THEN
      UPDATE clientes 
      SET saldo_pontos = saldo_pontos + p_pontos_ganhos,
          updated_at = NOW()
      WHERE id = p_cliente_id;
    END IF;
  END IF;

  -- Retorna sucesso e o ID da venda
  RETURN jsonb_build_object('success', true, 'venda_id', v_venda_id);

EXCEPTION WHEN OTHERS THEN
  -- Se der erro, o Postgres faz Rollback automático
  RAISE EXCEPTION 'Erro ao processar venda: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar políticas RLS para as novas tabelas (ajuste conforme sua necessidade)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_vendas ENABLE ROW LEVEL SECURITY;

-- Política para clientes (todos da organização podem ver/editar)
CREATE POLICY "Usuarios podem gerenciar clientes da organizacao"
ON clientes
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para metas (todos da organização podem ver/editar)
CREATE POLICY "Usuarios podem gerenciar metas da organizacao"
ON metas_vendas
FOR ALL
USING (true)
WITH CHECK (true);

-- =========================================================================
-- DADOS DE TESTE (Opcional - remova se não quiser)
-- =========================================================================

-- Inserir uma meta exemplo para hoje (ajuste o local_id para corresponder à sua loja)
-- INSERT INTO metas_vendas (local_id, data_referencia, valor_meta) 
-- VALUES (
--   (SELECT id FROM locais WHERE tipo = 'pdv' LIMIT 1), 
--   CURRENT_DATE, 
--   1500.00
-- )
-- ON CONFLICT (local_id, data_referencia) DO NOTHING;

-- Cliente de teste
-- INSERT INTO clientes (nome, telefone, saldo_pontos)
-- VALUES ('João da Silva', '11987654321', 150.00)
-- ON CONFLICT (telefone) DO NOTHING;
