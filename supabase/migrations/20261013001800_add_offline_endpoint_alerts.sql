alter table public.endpoint_alerts
  drop constraint endpoint_alerts_alert_type_check,
  drop constraint endpoint_alerts_current_value_check,
  drop constraint endpoint_alerts_threshold_check,
  alter column current_value drop not null,
  alter column threshold drop not null,
  add constraint endpoint_alerts_alert_type_check
    check (alert_type in ('cpu_high', 'memory_high', 'disk_high', 'offline')),
  add constraint endpoint_alerts_current_value_check
    check (current_value is null or current_value between 0 and 100),
  add constraint endpoint_alerts_threshold_check
    check (threshold is null or threshold between 0 and 100),
  add constraint endpoint_alerts_offline_values_check
    check ((alert_type = 'offline' and current_value is null and threshold is null)
      or (alert_type <> 'offline' and current_value is not null and threshold is not null));

create or replace function public.evaluate_endpoint_offline_alerts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.endpoint_alerts as alerts
  set resolved_at = now(), last_observed_at = now()
  from public.endpoint_devices as devices
  where alerts.device_id = devices.id
    and alerts.alert_type = 'offline'
    and alerts.resolved_at is null
    and (not devices.is_active or devices.last_seen_at >= now() - interval '15 minutes');

  insert into public.endpoint_alerts (device_id, alert_type, current_value, threshold)
  select devices.id, 'offline', null, null
  from public.endpoint_devices as devices
  where devices.is_active
    and devices.last_seen_at < now() - interval '15 minutes'
  on conflict (device_id, alert_type) where resolved_at is null
  do update set last_observed_at = now();
end;
$$;

revoke all on function public.evaluate_endpoint_offline_alerts() from public, anon, authenticated;
grant execute on function public.evaluate_endpoint_offline_alerts() to service_role;

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
    devices.last_seen_at,
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
      when alert_row.alert_type = 'offline' then 'Device offline: '
      when alert_row.alert_type = 'disk_high' then 'Low disk space on '
      else 'High ' || upper(replace(alert_row.alert_type, '_high', '')) || ' on '
    end || alert_row.hostname,
    120
  );
  ticket_description := case
    when alert_row.alert_type = 'offline' then
      'The monitoring agent has not checked in for at least 15 minutes.' || E'\n' ||
      'Last check-in: ' || coalesce(alert_row.last_seen_at::text, 'No check-in recorded') || '.'
    else
      'The ' || case
        when alert_row.alert_type = 'disk_high' then 'disk use'
        else lower(replace(alert_row.alert_type, '_high', '')) || ' use'
      end ||
      ' stayed at or above ' || round(alert_row.threshold)::text ||
      '% across three check-ins over at least 10 minutes.' || E'\n' ||
      'Latest reading: ' || round(alert_row.current_value)::text || '%.'
  end || E'\n' ||
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
