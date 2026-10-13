alter table public.tickets
  add column priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high', 'urgent'));

alter table public.tickets
  add column priority_rank integer generated always as (
    case priority
      when 'urgent' then 0
      when 'high' then 1
      when 'normal' then 2
      else 3
    end
  ) stored;

create index tickets_priority_created_at_idx
  on public.tickets (priority_rank, created_at desc);

grant update (status, assigned_to, asset_id, priority)
  on table public.tickets to authenticated;
