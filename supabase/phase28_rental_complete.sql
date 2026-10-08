-- Phase 28: Rental completion, seller-initiated closed/rented state, and conversation deletion.
-- Run in Supabase SQL Editor.
-- 1. When complete_transaction is invoked (both sale and rental), marks the listing 'sold' so it cleanly disappears from the active marketplace feed.
-- 2. Allows mark_listing_sold to work for both 'sell' and 'rent' listings so sellers can close active rentals.
-- 3. Enables secure deletion of conversations and cascades deletion of linked messages.

create or replace function public.complete_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tx public.transactions%rowtype;
  v_item public.items%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to complete a transaction' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.seller_id <> v_uid then raise exception 'Only the seller can complete this exchange' using errcode = '42501'; end if;
  if v_tx.status <> 'approved' then raise exception 'Only approved transactions can be completed'; end if;

  update public.transactions set status = 'completed' where id = v_tx.id;
  select * into v_item from public.items where id = v_tx.item_id;

  perform set_config('umpasa.transaction_workflow', 'on', true);
  -- Both sale and completed rental transactions mark item 'sold' to remove from active marketplace
  update public.items set status = 'sold' where id = v_item.id;

  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_tx.buyer_id, 'Transaction completed for ' || v_item.title || '.', 'completion', 'transaction', v_tx.id);

  return v_tx.id;
end;
$$;

revoke all on function public.complete_transaction(uuid) from public, anon, authenticated;
grant execute on function public.complete_transaction(uuid) to authenticated;

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

-- Conversation deletion RPC
create or replace function public.delete_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_conv public.conversations%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to delete a conversation' using errcode = '42501';
  end if;

  select * into v_conv
  from public.conversations
  where id = p_conversation_id;

  if not found then
    return true;
  end if;

  if v_conv.starter_id <> v_uid and v_conv.recipient_id <> v_uid and not exists (
    select 1 from public.profiles where id = v_uid and role = 'admin'
  ) then
    raise exception 'You do not have permission to delete this conversation' using errcode = '42501';
  end if;

  delete from public.conversations where id = p_conversation_id;
  return true;
end;
$$;

revoke all on function public.delete_conversation(uuid) from public, anon, authenticated;
grant execute on function public.delete_conversation(uuid) to authenticated;

-- RLS DELETE policy on conversations
drop policy if exists "participants and admin can delete conversations" on public.conversations;
create policy "participants and admin can delete conversations"
on public.conversations for delete to authenticated
using (
  auth.uid() = starter_id or auth.uid() = recipient_id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
