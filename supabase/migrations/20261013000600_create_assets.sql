create table public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique check (char_length(asset_tag) between 1 and 64),
  name text not null check (char_length(name) between 2 and 120),
  category text not null check (
    category in ('audio_visual', 'network_wifi', 'computer_device', 'account_access', 'other')
  ),
  location text check (location is null or char_length(location) <= 160),
  status text not null default 'available' check (
    status in ('available', 'in_use', 'in_repair', 'retired')
  ),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index assets_created_at_idx on public.assets (created_at desc);
create index assets_name_idx on public.assets (name);

alter table public.assets enable row level security;
revoke all on table public.assets from anon, authenticated;
grant select, insert, update (status) on table public.assets to authenticated;

create policy "Designated staff can view assets"
  on public.assets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );

create policy "Designated staff can register assets"
  on public.assets
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );

create policy "Designated staff can update asset status"
  on public.assets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );
