-- Phase 26: seller-initiated sold state for approved sale listings.
-- Apply after phase25_mobile_api.sql (or the current complete_setup.sql).
-- Existing transaction workflows remain authoritative for request-based sales.

create or replace function public.mark_listing_sold(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_item public.items%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to update a listing' using errcode = '42501';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id and seller_id = v_uid
  for update;

  if not found then raise exception 'Listing not found or not owned by you'; end if;
  if v_item.archived_at is not null then raise exception 'Archived listings cannot be marked sold'; end if;
  if v_item.listing_type <> 'sell' then raise exception 'Only sale listings can be marked sold'; end if;
  if v_item.moderation_status <> 'approved' then raise exception 'Only approved listings can be marked sold'; end if;
  if v_item.status <> 'available' then raise exception 'This listing is no longer available'; end if;
  if exists (
    select 1 from public.transactions t
    where t.item_id = v_item.id and t.status in ('pending', 'approved')
  ) then raise exception 'Resolve the open transaction before marking this listing sold'; end if;

  perform set_config('umpasa.transaction_workflow', 'on', true);
  update public.items set status = 'sold' where id = v_item.id;
  return v_item.id;
end;
$$;

revoke all on function public.mark_listing_sold(uuid) from public, anon, authenticated;
grant execute on function public.mark_listing_sold(uuid) to authenticated;
