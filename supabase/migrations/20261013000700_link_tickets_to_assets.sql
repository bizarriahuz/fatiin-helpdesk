alter table public.tickets
  add column asset_id uuid references public.assets (id) on delete set null;

create index tickets_asset_created_at_idx
  on public.tickets (asset_id, created_at desc)
  where asset_id is not null;

grant update (status, assigned_to, asset_id) on table public.tickets to authenticated;
