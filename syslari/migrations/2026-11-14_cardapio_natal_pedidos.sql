-- Pedidos de Natal (enviados pelo cardápio/flipbook) — controle no admin
-- REVISAR antes de aplicar.
-- Gravação: feita pela rota de servidor /api/cardapio-natal/pedido (service role), que revalida preços.
-- Leitura/edição/exclusão: somente admin e master (RLS). Nenhum acesso público.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cardapio_natal_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,                       -- número do pedido (igual ao da mensagem/PDF)
  status text NOT NULL DEFAULT 'aberto',             -- aberto, pendente_pagamento, confirmado, em_producao, pronto, enviado, finalizado, cancelado
  cliente_nome text NOT NULL,
  cliente_telefone text,
  recebimento text NOT NULL DEFAULT 'retirada' CHECK (recebimento IN ('retirada','entrega')),
  data_entrega date,                                 -- data desejada de retirada/entrega
  endereco text,
  pagamento text,
  observacoes text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,          -- [{id, nome, qtd, unitario}] (foto do momento do pedido)
  total numeric(10,2) NOT NULL DEFAULT 0,            -- soma dos itens
  taxa_entrega numeric(10,2),                        -- definida pela Larissa após combinar com o cliente
  origem text NOT NULL DEFAULT 'site' CHECK (origem IN ('site','manual')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cardapio_natal_pedidos_criado_idx ON public.cardapio_natal_pedidos (criado_em DESC);
CREATE INDEX IF NOT EXISTS cardapio_natal_pedidos_entrega_idx ON public.cardapio_natal_pedidos (data_entrega);
CREATE INDEX IF NOT EXISTS cardapio_natal_pedidos_status_idx ON public.cardapio_natal_pedidos (status);

ALTER TABLE public.cardapio_natal_pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cardapio_natal_pedidos_admin" ON public.cardapio_natal_pedidos;
CREATE POLICY "cardapio_natal_pedidos_admin" ON public.cardapio_natal_pedidos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','master')));

COMMIT;
