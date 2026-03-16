-- 2026-03-15: Remove duplicatas em distribuicao_pedidos e cria constraint UNIQUE
-- ATENÇÃO: Faça backup antes de executar em produção.

-- 1) Remove duplicatas mantendo apenas o registro com maior id (mais recente)
DELETE FROM public.distribuicao_pedidos a
USING public.distribuicao_pedidos b
WHERE a.id < b.id
  AND a.ordem_producao_id = b.ordem_producao_id
  AND a.local_destino_id = b.local_destino_id;

-- 2) Recria a constraint UNIQUE para permitir uso seguro de on_conflict
ALTER TABLE public.distribuicao_pedidos
DROP CONSTRAINT IF EXISTS unique_ordem_destino;

ALTER TABLE public.distribuicao_pedidos
ADD CONSTRAINT unique_ordem_destino UNIQUE (ordem_producao_id, local_destino_id);

-- 3) Opcional: atualiza updated_at para registros afetados (se necessário)
-- UPDATE public.distribuicao_pedidos SET updated_at = now();
