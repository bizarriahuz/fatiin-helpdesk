-- Asset categories describe equipment, so account access is not a valid asset type.
-- Keep any existing records and move that legacy value to Other.
update public.assets
set category = 'other'
where category = 'account_access';

alter table public.assets
  drop constraint if exists assets_category_check;

alter table public.assets
  add constraint assets_category_check
  check (category in ('audio_visual', 'network_wifi', 'computer_device', 'printer', 'other'));
