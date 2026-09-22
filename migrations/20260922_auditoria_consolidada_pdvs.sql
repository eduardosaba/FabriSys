-- ============================================================================
-- AUDITORIA CONSOLIDADA DE PDVs
-- Execute este arquivo UMA VEZ no Supabase > SQL Editor > New query > Run
-- ============================================================================

begin;

-- 1) Cabeçalho da auditoria consolidada
create table if not exists public.auditorias_pdv (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  data date not null,

  faturamento_total numeric(14,2) not null default 0,
  dinheiro_declarado numeric(14,2) not null default 0,
  pix_declarado numeric(14,2) not null default 0,
  cartao_declarado numeric(14,2) not null default 0,

  pix_real numeric(14,2) not null default 0,
  cartao_real numeric(14,2) not null default 0,
  total_recebido_real numeric(14,2) not null default 0,
  diferenca_total numeric(14,2) not null default 0,

  justificativa text null,
  qtd_pdvs integer not null default 0,
  qtd_remessas integer not null default 0,

  auditado_por uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_auditorias_pdv_org_data
  on public.auditorias_pdv (organization_id, data desc);

create index if not exists idx_auditorias_pdv_auditado_por
  on public.auditorias_pdv (auditado_por, created_at desc);


-- 2) Snapshot dos registros incluídos na auditoria
create table if not exists public.auditoria_pdv_itens (
  id uuid primary key default gen_random_uuid(),
  auditoria_id uuid not null references public.auditorias_pdv(id) on delete cascade,
  remessa_id uuid not null references public.remessas_cargas_pdv(id) on delete restrict,
  local_id uuid not null,

  faturamento_esperado numeric(14,2) not null default 0,
  dinheiro_declarado numeric(14,2) not null default 0,
  pix_declarado numeric(14,2) not null default 0,
  cartao_declarado numeric(14,2) not null default 0,

  created_at timestamptz not null default now(),

  constraint uq_auditoria_pdv_item unique (auditoria_id, remessa_id)
);

create index if not exists idx_auditoria_pdv_itens_auditoria
  on public.auditoria_pdv_itens (auditoria_id);

create index if not exists idx_auditoria_pdv_itens_remessa
  on public.auditoria_pdv_itens (remessa_id);

create index if not exists idx_auditoria_pdv_itens_local
  on public.auditoria_pdv_itens (local_id);


-- 3) RLS
alter table public.auditorias_pdv enable row level security;
alter table public.auditoria_pdv_itens enable row level security;

-- Permissões mínimas necessárias para a RPC SECURITY INVOKER.
grant select, insert on public.auditorias_pdv to authenticated;
grant select, insert on public.auditoria_pdv_itens to authenticated;

-- O usuário pode consultar as auditorias que ele próprio realizou.
drop policy if exists "auditorias_pdv_select_own" on public.auditorias_pdv;
create policy "auditorias_pdv_select_own"
on public.auditorias_pdv
for select
to authenticated
using (auditado_por = auth.uid());

drop policy if exists "auditorias_pdv_insert_own" on public.auditorias_pdv;
create policy "auditorias_pdv_insert_own"
on public.auditorias_pdv
for insert
to authenticated
with check (auditado_por = auth.uid());

-- Itens só podem ser lidos/inseridos quando pertencem a uma auditoria do usuário.
drop policy if exists "auditoria_pdv_itens_select_own" on public.auditoria_pdv_itens;
create policy "auditoria_pdv_itens_select_own"
on public.auditoria_pdv_itens
for select
to authenticated
using (
  exists (
    select 1
    from public.auditorias_pdv a
    where a.id = auditoria_id
      and a.auditado_por = auth.uid()
  )
);

drop policy if exists "auditoria_pdv_itens_insert_own" on public.auditoria_pdv_itens;
create policy "auditoria_pdv_itens_insert_own"
on public.auditoria_pdv_itens
for insert
to authenticated
with check (
  exists (
    select 1
    from public.auditorias_pdv a
    where a.id = auditoria_id
      and a.auditado_por = auth.uid()
  )
);


-- 4) RPC TRANSACIONAL
--    Se qualquer validação/update falhar, o PostgreSQL desfaz toda a chamada.
create or replace function public.auditar_pdvs_consolidado(
  p_organization_id uuid,
  p_data date,
  p_remessa_ids uuid[],
  p_pix_real numeric,
  p_cartao_real numeric,
  p_justificativa text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();

  v_total_ids integer := coalesce(array_length(p_remessa_ids, 1), 0);
  v_total_validos integer := 0;
  v_qtd_pdvs integer := 0;

  v_faturamento numeric(14,2) := 0;
  v_dinheiro numeric(14,2) := 0;
  v_pix_declarado numeric(14,2) := 0;
  v_cartao_declarado numeric(14,2) := 0;
  v_total_real numeric(14,2) := 0;
  v_diferenca numeric(14,2) := 0;

  v_auditoria_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_organization_id is null then
    raise exception 'organization_id é obrigatório.';
  end if;

  if p_data is null then
    raise exception 'A data da auditoria é obrigatória.';
  end if;

  if v_total_ids = 0 then
    raise exception 'Selecione ao menos uma remessa para auditar.';
  end if;

  if coalesce(p_pix_real, 0) < 0 or coalesce(p_cartao_real, 0) < 0 then
    raise exception 'Pix real e cartão real não podem ser negativos.';
  end if;

  -- Remove duplicidade de IDs já na validação.
  select
    count(*),
    count(distinct r.local_id),
    coalesce(
      sum(
        coalesce(
          nullif(r.faturamento_liquido_esperado, 0),
          r.faturamento_bruto_teorico,
          0
        )
      ),
      0
    ),
    coalesce(sum(r.valor_dinheiro_gaveta), 0),
    coalesce(sum(r.valor_pix_declarado), 0),
    coalesce(sum(r.valor_cartao_declarado), 0)
  into
    v_total_validos,
    v_qtd_pdvs,
    v_faturamento,
    v_dinheiro,
    v_pix_declarado,
    v_cartao_declarado
  from public.remessas_cargas_pdv r
  where r.id = any(p_remessa_ids)
    and r.organization_id = p_organization_id
    and r.data = p_data
    and r.status = 'encerrado';

  -- Todos os IDs recebidos precisam existir, ser da organização/data e estar encerrados.
  if v_total_validos <> v_total_ids then
    raise exception
      'Auditoria cancelada: % registro(s) solicitado(s), mas apenas % estão válidos/encerrados para esta organização e data.',
      v_total_ids,
      v_total_validos;
  end if;

  v_total_real :=
    round(
      coalesce(v_dinheiro, 0) +
      coalesce(p_pix_real, 0) +
      coalesce(p_cartao_real, 0),
      2
    );

  v_diferenca := round(v_total_real - coalesce(v_faturamento, 0), 2);

  if abs(v_diferenca) > 0.05
     and nullif(btrim(coalesce(p_justificativa, '')), '') is null then
    raise exception 'Justificativa obrigatória quando houver diferença superior a R$ 0,05.';
  end if;

  -- Cria o cabeçalho da auditoria.
  insert into public.auditorias_pdv (
    organization_id,
    data,
    faturamento_total,
    dinheiro_declarado,
    pix_declarado,
    cartao_declarado,
    pix_real,
    cartao_real,
    total_recebido_real,
    diferenca_total,
    justificativa,
    qtd_pdvs,
    qtd_remessas,
    auditado_por
  )
  values (
    p_organization_id,
    p_data,
    round(v_faturamento, 2),
    round(v_dinheiro, 2),
    round(v_pix_declarado, 2),
    round(v_cartao_declarado, 2),
    round(coalesce(p_pix_real, 0), 2),
    round(coalesce(p_cartao_real, 0), 2),
    v_total_real,
    v_diferenca,
    nullif(btrim(coalesce(p_justificativa, '')), ''),
    v_qtd_pdvs,
    v_total_validos,
    v_user_id
  )
  returning id into v_auditoria_id;

  -- Guarda o snapshot de cada turno/remessa.
  insert into public.auditoria_pdv_itens (
    auditoria_id,
    remessa_id,
    local_id,
    faturamento_esperado,
    dinheiro_declarado,
    pix_declarado,
    cartao_declarado
  )
  select
    v_auditoria_id,
    r.id,
    r.local_id,
    round(
      coalesce(
        nullif(r.faturamento_liquido_esperado, 0),
        r.faturamento_bruto_teorico,
        0
      ),
      2
    ),
    round(coalesce(r.valor_dinheiro_gaveta, 0), 2),
    round(coalesce(r.valor_pix_declarado, 0), 2),
    round(coalesce(r.valor_cartao_declarado, 0), 2)
  from public.remessas_cargas_pdv r
  where r.id = any(p_remessa_ids)
    and r.organization_id = p_organization_id
    and r.data = p_data
    and r.status = 'encerrado';

  -- Marca todas as remessas como auditadas.
  -- A diferença consolidada fica em auditorias_pdv.diferenca_total;
  -- NÃO é atribuída artificialmente a um único PDV.
  update public.remessas_cargas_pdv
  set
    status = 'auditado',
    diferenca_auditoria = 0,
    updated_at = now()
  where id = any(p_remessa_ids)
    and organization_id = p_organization_id
    and data = p_data
    and status = 'encerrado';

  if not found then
    raise exception 'Nenhuma remessa foi atualizada.';
  end if;

  return jsonb_build_object(
    'success', true,
    'auditoria_id', v_auditoria_id,
    'pdvs_auditados', v_qtd_pdvs,
    'remessas_auditadas', v_total_validos,
    'faturamento_total', round(v_faturamento, 2),
    'dinheiro_declarado', round(v_dinheiro, 2),
    'pix_declarado', round(v_pix_declarado, 2),
    'cartao_declarado', round(v_cartao_declarado, 2),
    'pix_real', round(coalesce(p_pix_real, 0), 2),
    'cartao_real', round(coalesce(p_cartao_real, 0), 2),
    'total_recebido_real', v_total_real,
    'diferenca_total', v_diferenca
  );
end;
$$;

revoke all on function public.auditar_pdvs_consolidado(
  uuid, date, uuid[], numeric, numeric, text
) from public;

grant execute on function public.auditar_pdvs_consolidado(
  uuid, date, uuid[], numeric, numeric, text
) to authenticated;

commit;

-- ============================================================================
-- TESTE RÁPIDO (opcional)
-- Depois de usar a tela uma vez, consulte:
--
-- select * from public.auditorias_pdv order by created_at desc limit 10;
-- select * from public.auditoria_pdv_itens order by created_at desc limit 50;
-- ============================================================================
