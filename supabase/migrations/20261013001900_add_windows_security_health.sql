alter table public.endpoint_devices
  add column defender_real_time_protection boolean,
  add column defender_signatures_updated_at timestamptz,
  add column pending_reboot boolean;

grant select (defender_real_time_protection, defender_signatures_updated_at, pending_reboot)
  on public.endpoint_devices to authenticated;

alter table public.endpoint_heartbeats
  add column defender_real_time_protection boolean,
  add column defender_signatures_updated_at timestamptz,
  add column pending_reboot boolean;
