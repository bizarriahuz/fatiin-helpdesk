-- Keep a trusted, dashboard-managed allowlist for staff-wide ticket access.
create table public.helpdesk_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.helpdesk_staff enable row level security;
revoke all on table public.helpdesk_staff from anon, authenticated;
grant select on table public.helpdesk_staff to authenticated;

create policy "Staff can view their own membership"
  on public.helpdesk_staff
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Capture the submitter's verified email for the staff queue and older tickets.
alter table public.tickets add column requester_email text;

update public.tickets as tickets
set requester_email = users.email
from auth.users as users
where users.id = tickets.requester_id;

-- Scope the API privileges to the operations the app currently supports.
revoke all on table public.tickets from anon, authenticated;
grant select, insert on table public.tickets to authenticated;
grant update (status) on table public.tickets to authenticated;

drop policy "Users can view their own tickets" on public.tickets;
create policy "Requesters and staff can view tickets"
  on public.tickets
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or exists (
      select 1
      from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );

drop policy "Users can submit their own new tickets" on public.tickets;
create policy "Users can submit their own new tickets"
  on public.tickets
  for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and requester_email = (select auth.jwt() ->> 'email')
    and status = 'new'
  );

create policy "Staff can update ticket status"
  on public.tickets
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
