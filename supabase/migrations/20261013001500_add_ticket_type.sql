alter table public.tickets
  add column ticket_type text not null default 'incident'
  check (ticket_type in ('incident', 'problem', 'request', 'change'));

grant update (ticket_type) on table public.tickets to authenticated;
