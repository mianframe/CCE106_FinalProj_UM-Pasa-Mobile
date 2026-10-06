-- Phase 28: Include rejection reason in seller notification
-- Safe, idempotent update to public.set_item_moderation

create or replace function public.set_item_moderation(p_item_id uuid, p_status text, p_rejection_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.items%rowtype;
  v_clean_reason text;
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid moderation decision';
  end if;

  v_clean_reason := nullif(trim(p_rejection_reason), '');

  if v_clean_reason is not null and char_length(v_clean_reason) > 500 then
    raise exception 'Rejection reason must be 500 characters or fewer';
  end if;

  update public.items
  set moderation_status = p_status,
      rejection_reason = case when p_status = 'rejected' then v_clean_reason end
  where id = p_item_id
  returning * into v_item;

  if not found then
    raise exception 'Listing not found';
  end if;

  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (
    v_item.seller_id,
    case
      when p_status = 'approved' then
        'Your listing "' || v_item.title || '" was approved and is now visible in the marketplace.'
      else
        'Your listing "' || v_item.title || '" was rejected. Reason: ' || coalesce(v_clean_reason, 'Does not meet campus guidelines.')
    end,
    case when p_status = 'approved' then 'item_approved' else 'item_rejected' end,
    'item',
    v_item.id
  );

  return v_item.id;
end;
$$;

revoke all on function public.set_item_moderation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_item_moderation(uuid, text, text) to authenticated;
