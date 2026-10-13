create table public.endpoint_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.endpoint_devices (id) on delete cascade,
  alert_type text not null check (alert_type in ('cpu_high', 'memory_high', 'disk_high')),
  current_value numeric(5,2) not null check (current_value between 0 and 100),
  threshold numeric(5,2) not null check (threshold between 0 and 100),
  first_triggered_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  resolved_at timestamptz,
  ticket_id uuid references public.tickets (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index endpoint_alerts_one_open_per_type_idx
  on public.endpoint_alerts (device_id, alert_type)
  where resolved_at is null;

create index endpoint_alerts_open_recent_idx
  on public.endpoint_alerts (first_triggered_at desc)
  where resolved_at is null;

alter table public.endpoint_alerts enable row level security;
revoke all on table public.endpoint_alerts from anon, authenticated;
grant select on table public.endpoint_alerts to authenticated;

create policy "Designated staff can view endpoint alerts"
  on public.endpoint_alerts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.helpdesk_staff as staff
      where staff.user_id = (select auth.uid())
    )
  );

create or replace function public.evaluate_endpoint_health_alerts(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sample_count integer;
  oldest_sample timestamptz;
  cpu_high_count integer;
  memory_high_count integer;
  disk_high_count integer;
  cpu_clear_count integer;
  memory_clear_count integer;
  disk_clear_count integer;
  current_cpu numeric(5,2);
  current_memory numeric(5,2);
  current_disk numeric(5,2);
begin
  select
    count(*)::integer,
    min(samples.checked_at),
    count(*) filter (where samples.cpu_percent >= 90)::integer,
    count(*) filter (where samples.memory_percent >= 90)::integer,
    count(*) filter (where samples.disk_percent >= 90)::integer,
    count(*) filter (where samples.cpu_percent < 85)::integer,
    count(*) filter (where samples.memory_percent < 85)::integer,
    count(*) filter (where samples.disk_percent < 85)::integer,
    (array_agg(samples.cpu_percent order by samples.checked_at desc))[1],
    (array_agg(samples.memory_percent order by samples.checked_at desc))[1],
    (array_agg(samples.disk_percent order by samples.checked_at desc))[1]
  into
    sample_count,
    oldest_sample,
    cpu_high_count,
    memory_high_count,
    disk_high_count,
    cpu_clear_count,
    memory_clear_count,
    disk_clear_count,
    current_cpu,
    current_memory,
    current_disk
  from (
    select checked_at, cpu_percent, memory_percent, disk_percent
    from public.endpoint_heartbeats
    where device_id = p_device_id
    order by checked_at desc
    limit 3
  ) as samples;

  if sample_count = 3 and oldest_sample <= now() - interval '10 minutes' then
    if cpu_high_count = 3 then
      insert into public.endpoint_alerts (device_id, alert_type, current_value, threshold)
      values (p_device_id, 'cpu_high', current_cpu, 90)
      on conflict (device_id, alert_type) where resolved_at is null
      do update set current_value = excluded.current_value, last_observed_at = now();
    elsif cpu_clear_count = 3 then
      update public.endpoint_alerts
      set resolved_at = now(), last_observed_at = now()
      where device_id = p_device_id and alert_type = 'cpu_high' and resolved_at is null;
    end if;

    if memory_high_count = 3 then
      insert into public.endpoint_alerts (device_id, alert_type, current_value, threshold)
      values (p_device_id, 'memory_high', current_memory, 90)
      on conflict (device_id, alert_type) where resolved_at is null
      do update set current_value = excluded.current_value, last_observed_at = now();
    elsif memory_clear_count = 3 then
      update public.endpoint_alerts
      set resolved_at = now(), last_observed_at = now()
      where device_id = p_device_id and alert_type = 'memory_high' and resolved_at is null;
    end if;

    if disk_high_count = 3 then
      insert into public.endpoint_alerts (device_id, alert_type, current_value, threshold)
      values (p_device_id, 'disk_high', current_disk, 90)
      on conflict (device_id, alert_type) where resolved_at is null
      do update set current_value = excluded.current_value, last_observed_at = now();
    elsif disk_clear_count = 3 then
      update public.endpoint_alerts
      set resolved_at = now(), last_observed_at = now()
      where device_id = p_device_id and alert_type = 'disk_high' and resolved_at is null;
    end if;
  end if;
end;
$$;

revoke all on function public.evaluate_endpoint_health_alerts(uuid) from public, anon, authenticated;
grant execute on function public.evaluate_endpoint_health_alerts(uuid) to service_role;

create or replace function public.create_ticket_from_endpoint_alert(p_alert_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester_id uuid := auth.uid();
  requester_email text := auth.jwt() ->> 'email';
  alert_row record;
  created_ticket_id uuid;
  ticket_subject text;
  ticket_description text;
begin
  if requester_id is null or not exists (
    select 1 from public.helpdesk_staff as staff where staff.user_id = requester_id
  ) then
    raise exception 'Only designated helpdesk staff can create tickets from alerts.';
  end if;

  if requester_email is null then
    raise exception 'A verified staff email is required to create a ticket.';
  end if;

  select
    alerts.id,
    alerts.device_id,
    alerts.alert_type,
    alerts.current_value,
    alerts.threshold,
    alerts.first_triggered_at,
    alerts.resolved_at,
    alerts.ticket_id,
    devices.hostname,
    devices.client_name,
    assets.asset_tag,
    assets.name as asset_name
  into alert_row
  from public.endpoint_alerts as alerts
  join public.endpoint_devices as devices on devices.id = alerts.device_id
  left join public.assets as assets on assets.id = devices.asset_id
  where alerts.id = p_alert_id
  for update of alerts;

  if not found then
    raise exception 'The endpoint alert could not be found.';
  end if;

  if alert_row.ticket_id is not null then
    return alert_row.ticket_id;
  end if;

  if alert_row.resolved_at is not null then
    raise exception 'This endpoint alert has already cleared.';
  end if;

  ticket_subject := left(
    '[Monitoring] ' || case
      when alert_row.alert_type = 'disk_high' then 'Low disk space on '
      else 'High ' || upper(replace(alert_row.alert_type, '_high', '')) || ' on '
    end || alert_row.hostname,
    120
  );
  ticket_description :=
    'The ' || case
      when alert_row.alert_type = 'disk_high' then 'disk use'
      else lower(replace(alert_row.alert_type, '_high', '')) || ' use'
    end ||
    ' stayed at or above ' || round(alert_row.threshold)::text ||
    '% across three check-ins over at least 10 minutes.' || E'\n' ||
    'Latest reading: ' || round(alert_row.current_value)::text || '%.' || E'\n' ||
    'Device: ' || alert_row.hostname || E'\n' ||
    'Client/site: ' || alert_row.client_name || E'\n' ||
    'Asset: ' || coalesce(alert_row.asset_tag || ' · ' || alert_row.asset_name, 'Details unavailable') || E'\n' ||
    'Alert started: ' || alert_row.first_triggered_at::text || '.';

  insert into public.tickets (
    requester_id,
    requester_email,
    subject,
    category,
    ticket_type,
    priority,
    mosque,
    description,
    location
  ) values (
    requester_id,
    requester_email,
    ticket_subject,
    'hardware',
    'incident',
    'high',
    alert_row.client_name,
    ticket_description,
    null
  ) returning id into created_ticket_id;

  update public.endpoint_alerts
  set ticket_id = created_ticket_id
  where id = alert_row.id;

  return created_ticket_id;
end;
$$;

revoke all on function public.create_ticket_from_endpoint_alert(uuid) from public, anon, authenticated;
grant execute on function public.create_ticket_from_endpoint_alert(uuid) to authenticated;
