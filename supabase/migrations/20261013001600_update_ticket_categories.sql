-- Preserve existing tickets and move their old categories to the closest new category.
alter table public.tickets
  drop constraint if exists tickets_category_check;

update public.tickets
set category = case category
  when 'audio_visual' then 'hardware'
  when 'computer_device' then 'hardware'
  when 'network_wifi' then 'network'
  when 'account_access' then 'ms365'
  when 'other' then 'software'
  else category
end
where category in ('audio_visual', 'computer_device', 'network_wifi', 'account_access', 'other');

alter table public.tickets
  add constraint tickets_category_check check (
    category in (
      'hardware',
      'software',
      'printer',
      'network',
      'email',
      'ms365'
    )
  );
