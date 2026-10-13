alter table public.tickets
  add column assigned_to uuid references public.helpdesk_staff (user_id) on delete set null;

grant update (status, assigned_to) on table public.tickets to authenticated;

create index tickets_assigned_created_at_idx
  on public.tickets (assigned_to, created_at desc)
  where assigned_to is not null;
