create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_email text not null,
  body text not null check (char_length(body) between 1 and 4000 and char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket_created_idx
  on public.ticket_messages (ticket_id, created_at);

alter table public.ticket_messages enable row level security;
revoke all on table public.ticket_messages from anon, authenticated;
grant select, insert on table public.ticket_messages to authenticated;

create policy "Requesters and staff can read ticket messages"
  on public.ticket_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tickets as ticket
      where ticket.id = ticket_id
        and (
          ticket.requester_id = (select auth.uid())
          or exists (
            select 1
            from public.helpdesk_staff as staff
            where staff.user_id = (select auth.uid())
          )
        )
    )
  );

create policy "Requesters and staff can add messages to their tickets"
  on public.ticket_messages
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and author_email = (select auth.jwt() ->> 'email')
    and exists (
      select 1
      from public.tickets as ticket
      where ticket.id = ticket_id
        and (
          ticket.requester_id = (select auth.uid())
          or exists (
            select 1
            from public.helpdesk_staff as staff
            where staff.user_id = (select auth.uid())
          )
        )
    )
  );
