create table public.helpdesk_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 160 and char_length(btrim(name)) > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index helpdesk_clients_name_lower_uidx
  on public.helpdesk_clients (lower(btrim(name)));

alter table public.helpdesk_clients enable row level security;
revoke all on table public.helpdesk_clients from anon, authenticated;
grant select on table public.helpdesk_clients to authenticated;
grant insert (name, created_by), update (name) on table public.helpdesk_clients to authenticated;

create policy "Authenticated users can view client names"
  on public.helpdesk_clients
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Designated staff can add client names"
  on public.helpdesk_clients
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );

create policy "Designated staff can rename clients"
  on public.helpdesk_clients
  for update
  to authenticated
  using (
    exists (
      select 1 from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );

insert into public.helpdesk_clients (name)
values ('Unspecified'), ('Fatiin Multimedia (Internal)')
on conflict do nothing;

insert into public.helpdesk_clients (name)
select min(btrim(client_names.name))
from (
  select mosque as name from public.tickets
  union all
  select mosque as name from public.assets
) as client_names
where btrim(client_names.name) <> ''
  and lower(btrim(client_names.name)) <> 'unspecified'
group by lower(btrim(client_names.name))
on conflict do nothing;

alter table public.tickets
  add constraint tickets_mosque_helpdesk_clients_name_fkey
  foreign key (mosque) references public.helpdesk_clients (name)
  on update cascade on delete restrict;

alter table public.assets
  add constraint assets_mosque_helpdesk_clients_name_fkey
  foreign key (mosque) references public.helpdesk_clients (name)
  on update cascade on delete restrict;
