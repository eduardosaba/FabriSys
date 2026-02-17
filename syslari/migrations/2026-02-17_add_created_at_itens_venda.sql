-- 2026-02-17_add_created_at_itens_venda.sql
-- Adiciona `created_at` em `itens_venda` e faz backfill para registros existentes

BEGIN;

ALTER TABLE IF EXISTS public.itens_venda
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Backfill com base em outras tabelas se possível, senão NOW()
UPDATE public.itens_venda
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

COMMIT;
-- 2026-02-17_add_created_at_itens_venda.sql
-- Adiciona coluna `created_at` em `itens_venda` e backfill para compatibilidade com filtros por data

ALTER TABLE IF EXISTS public.itens_venda
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill: setar created_at para now() quando nulo (para linhas antigas)
UPDATE public.itens_venda SET created_at = now() WHERE created_at IS NULL;
pages-dev-overlay-setup.tsx:85 ./components/ui/DashboardHeader.tsx:248:11
Parsing ecmascript source code failed
  246 |           .from('vendas')
  247 |           await safeSelect(supabase, 'vendas', 'id,total_venda,created_at,local:locais(nome)', (b: any) => b.order('created_at', { ascending: false }).limit(1));
> 248 |           .gte('created_at', since)
      |           ^
  249 |           .order('created_at', { ascending: false })
  250 |           .limit(10);
  251 |

Expression expected

Import traces:
  Client Component Browser:
    ./components/ui/DashboardHeader.tsx [Client Component Browser]
    ./app/dashboard/layout.tsx [Client Component Browser]
    ./app/dashboard/layout.tsx [Server Component]

  Client Component SSR:
    ./components/ui/DashboardHeader.tsx [Client Component SSR]
    ./app/dashboard/layout.tsx [Client Component SSR]
    ./app/dashboard/layout.tsx [Server Component]
nextJsHandleConsoleError @ pages-dev-overlay-setup.tsx:85
handleErrors @ hot-reloader-pages.ts:229
processMessage @ hot-reloader-pages.ts:318
(anônimo) @ hot-reloader-pages.ts:100
handleMessage @ websocket.ts:68
