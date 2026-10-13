create policy "Requesters can reopen their resolved tickets"
  on public.tickets
  for update
  to authenticated
  using (
    requester_id = (select auth.uid())
    and status in ('resolved', 'closed')
  )
  with check (
    requester_id = (select auth.uid())
    and status = 'in_progress'
  );
