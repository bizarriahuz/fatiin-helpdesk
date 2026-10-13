create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(subject) between 5 and 120),
  category text not null check (
    category in ('audio_visual', 'network_wifi', 'computer_device', 'account_access', 'other')
  ),
  description text not null check (char_length(description) between 10 and 4000),
  location text check (location is null or char_length(location) <= 160),
  status text not null default 'new' check (
    status in ('new', 'in_progress', 'resolved', 'closed')
  ),
  created_at timestamptz not null default now()
);

create index tickets_requester_created_at_idx
  on public.tickets (requester_id, created_at desc);

alter table public.tickets enable row level security;

grant select, insert on public.tickets to authenticated;

create policy "Users can view their own tickets"
  on public.tickets
  for select
  to authenticated
  using ((select auth.uid()) = requester_id);

create policy "Users can submit their own new tickets"
  on public.tickets
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and status = 'new'
  );
