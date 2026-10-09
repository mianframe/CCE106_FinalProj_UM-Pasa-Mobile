-- Migration: 20261010020000_notify_admins_pending_listings.sql
-- Description: Automatically inserts a notification for every campus administrator
-- whenever a listing is created or updated with moderation_status = 'pending'.

create or replace function public.notify_admins_of_pending_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller_name text;
  v_admin record;
begin
  if (tg_op = 'INSERT' and new.moderation_status = 'pending')
     or (tg_op = 'UPDATE' and new.moderation_status = 'pending' and (old.moderation_status is distinct from 'pending')) then
    select full_name into v_seller_name from public.profiles where id = new.seller_id;
    for v_admin in (select id from public.profiles where role = 'admin') loop
      insert into public.notifications (user_id, message, type, related_type, related_id)
      values (
        v_admin.id,
        'New listing pending approval: "' || new.title || '" by ' || coalesce(v_seller_name, 'a student') || '.',
        'listing',
        'item',
        new.id
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_admins_of_pending_listing on public.items;
create trigger trg_notify_admins_of_pending_listing
after insert or update of moderation_status on public.items
for each row execute function public.notify_admins_of_pending_listing();
