-- Cria tabela para histórico de envios e recebimentos
-- Execute no Supabase SQL Editor como owner

BEGIN;

-- Cria extensão genérica para gerar UUID se necessário (idempotente)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.envios_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distrib_id uuid,
  ordem_producao_id uuid,
  produto_id uuid,
  quantidade numeric,
  quantidade_recebida numeric,
  local_origem_id uuid,
  local_destino_id uuid,
  enviado_por uuid,
  enviado_em timestamptz,
  recebido_por uuid,
  recebido_em timestamptz,
  observacao text,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_envios_historico_distrib_id ON public.envios_historico(distrib_id);
CREATE INDEX IF NOT EXISTS idx_envios_historico_ordem_id ON public.envios_historico(ordem_producao_id);

COMMIT;
