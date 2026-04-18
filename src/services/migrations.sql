-- SQL Scripts for Technical Improvements
-- Please execute these in the Supabase SQL Editor

-- 1. RPC for Batch Reordering (Tasks and Projects)
-- This function allows updating 'ordem_index' for multiple rows in a single call.
create or replace function reorder_items(
  table_name text,
  items jsonb -- Array of { "id": number, "ordem_index": number }
)
returns void
language plpgsql
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    execute format('update %I set ordem_index = $1 where id = $2', table_name)
    using (item->>'ordem_index')::int, (item->>'id')::int;
  end loop;
end;
$$;

-- 2. Recommended Indices for Performance
-- Note: Replace public schema if your tables are in a different schema.

-- Indices for projectos
create index if not exists idx_projectos_user_id on public.projectos(user_id);
create index if not exists idx_projectos_arquivado on public.projectos(arquivado);
create index if not exists idx_projectos_ordem_index on public.projectos(ordem_index);

-- Indices for ordens_fabrico
create index if not exists idx_ordens_fabrico_projeto_id on public.ordens_fabrico(projeto_id);
create index if not exists idx_ordens_fabrico_numero_of on public.ordens_fabrico(numero_of);

-- Indices for tarefas
create index if not exists idx_tarefas_ordem_id on public.tarefas(ordem_id);
create index if not exists idx_tarefas_ordem_index on public.tarefas(ordem_index);
