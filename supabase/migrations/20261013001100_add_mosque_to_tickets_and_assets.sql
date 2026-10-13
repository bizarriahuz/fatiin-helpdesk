alter table public.tickets
  add column mosque text not null default 'Unspecified'
  check (char_length(mosque) between 2 and 160 and char_length(btrim(mosque)) > 0);

alter table public.assets
  add column mosque text not null default 'Unspecified'
  check (char_length(mosque) between 2 and 160 and char_length(btrim(mosque)) > 0);

create index tickets_mosque_created_at_idx
  on public.tickets (mosque, created_at desc);

create index assets_mosque_idx
  on public.assets (mosque);

grant update (mosque)
  on table public.tickets to authenticated;

grant update (asset_tag, name, category, location, notes, mosque)
  on table public.assets to authenticated;
