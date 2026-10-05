-- Security/data-integrity hardening for the Phase 2.5 Supabase client.
-- Apply after the Phase 1 schema, phase2_auth_profile_trigger.sql, and
-- phase25_mobile_api.sql. STOP: compare this migration to the recovered
-- original Phase 1 SQL before applying. That SQL is not present in this repo;
-- policy/column compatibility has not been verified against it.

-- Additive archive marker: preserve transaction/rating rows when a listing
-- with history is removed from the active marketplace.
alter table public.items add column if not exists archived_at timestamptz;
create index if not exists items_active_marketplace_idx
  on public.items (status, moderation_status, created_at desc)
  where archived_at is null;

-- Database-side role source of truth. SECURITY DEFINER avoids profile RLS
-- recursion; all object references are schema-qualified and search_path empty.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Preserve the original private.is_admin() implementation. This migration
-- tightens its ACL without replacing its body; the original helper must exist.
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- Reset all policies on the app tables so no forgotten permissive policy can
-- broaden access (Postgres combines permissive policies with OR).
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles','items','transactions','conversations','messages',
        'ratings','notifications'
      ])
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.transactions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;

-- PUBLIC grants also apply to anon/authenticated, so revoke them explicitly.
revoke all on public.profiles, public.items, public.transactions,
  public.conversations, public.messages, public.ratings, public.notifications
  from public, anon, authenticated;
grant select on public.profiles, public.items, public.transactions,
  public.conversations, public.messages, public.ratings, public.notifications
  to authenticated;
grant update (full_name, student_number, department, program)
  on public.profiles to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select on public.items to anon;

create policy profiles_read_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

create policy items_public_marketplace on public.items
  for select to anon
  using (status = 'available' and moderation_status = 'approved' and archived_at is null);
create policy items_signed_in_read on public.items
  for select to authenticated
  using (
    (status = 'available' and moderation_status = 'approved' and archived_at is null)
    or seller_id = (select auth.uid())
    or (select private.is_admin())
    or exists (
      select 1 from public.transactions t
      where t.item_id = items.id
        and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))
    )
  );

create policy transactions_participant_or_admin_read on public.transactions
  for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or (select private.is_admin()));
create policy conversations_participant_read on public.conversations
  for select to authenticated
  using (starter_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy messages_conversation_participant_read on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.starter_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
  ));
create policy ratings_related_user_or_transaction_read on public.ratings
  for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    or reviewed_user_id = (select auth.uid())
    or (select private.is_admin())
    or exists (
      select 1 from public.transactions t
      where t.id = ratings.transaction_id
        and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))
    )
  );
create policy notifications_owner_read on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_owner_mark_read on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.messages drop constraint if exists messages_proposal_status_check;
alter table public.messages add constraint messages_proposal_status_check check (
  (type = 'meetup_proposal' and proposal_status is not null and proposal_status in ('pending','accepted','declined'))
  or (type in ('text','system') and proposal_status is null)
);

-- Explicit trigger protection remains defense in depth if table grants are
-- changed later. Client column grants above still exclude profiles.role.
create or replace function private.protect_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'profiles'
     and new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'Only an administrator can change a profile role' using errcode = '42501';
  end if;
  if tg_table_name = 'items'
     and (
       new.moderation_status is distinct from old.moderation_status
       or new.rejection_reason is distinct from old.rejection_reason
     ) then
    if private.is_admin() then
      null;
    elsif coalesce(current_setting('umpasa.resubmit_listing', true), '') = 'on'
       and new.seller_id = old.seller_id
       and new.moderation_status = 'pending'
       and new.rejection_reason is null then
      null;
    else
      raise exception 'Only an administrator can change listing moderation fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.protect_privileged_fields() from public, anon, authenticated;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields before update on public.profiles
for each row execute function private.protect_privileged_fields();
drop trigger if exists items_protect_privileged_fields on public.items;
create trigger items_protect_privileged_fields before update on public.items
for each row execute function private.protect_privileged_fields();

create or replace function private.protect_archived_item_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.archived_at is not null and (
    new.seller_id is distinct from old.seller_id
    or new.title is distinct from old.title
    or new.category is distinct from old.category
    or new.description is distinct from old.description
    or new.department is distinct from old.department
    or new.program is distinct from old.program
    or new.course_code is distinct from old.course_code
    or new.listing_type is distinct from old.listing_type
    or new.accepted_payment_methods is distinct from old.accepted_payment_methods
    or new.minimum_rental_days is distinct from old.minimum_rental_days
    or new.maximum_rental_days is distinct from old.maximum_rental_days
    or new.daily_rental_rate is distinct from old.daily_rental_rate
    or new.rental_duration_days is distinct from old.rental_duration_days
    or new.condition is distinct from old.condition
    or new.price is distinct from old.price
    or new.image_path is distinct from old.image_path
    or new.moderation_status is distinct from old.moderation_status
    or new.rejection_reason is distinct from old.rejection_reason
  ) then
    raise exception 'Archived listing details are retained for transaction history' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_archived_item_details() from public, anon, authenticated;

drop trigger if exists items_protect_archived_details on public.items;
create trigger items_protect_archived_details before update on public.items
for each row execute function private.protect_archived_item_details();

create or replace function private.reject_archived_item_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.items i
    where i.id = new.item_id and i.archived_at is not null
  ) then
    raise exception 'Archived listings cannot receive new transaction requests' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_archived_item_request() from public, anon, authenticated;
drop trigger if exists transactions_reject_archived_item on public.transactions;
create trigger transactions_reject_archived_item before insert on public.transactions
for each row execute function private.reject_archived_item_request();

-- Replacing item deletion with archival when a transaction exists. With no
-- transaction history the row can still be physically removed as before.
create or replace function public.delete_listing(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_item public.items%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to manage listings' using errcode = '42501'; end if;
  select * into v_item from public.items i
    where i.id = p_item_id and (i.seller_id = v_uid or private.is_admin())
    for update;
  if not found then raise exception 'Listing not found or permission denied' using errcode = '42501'; end if;

  if exists (select 1 from public.transactions t where t.item_id = v_item.id) then
    update public.items set archived_at = coalesce(archived_at, now()) where id = v_item.id;
    return true;
  end if;

  delete from public.items where id = v_item.id;
  return true;
end;
$$;

-- Fix the existing-conversation metadata path. Context is taken from the
-- stored conversation; caller-supplied item IDs must match it exactly.
create or replace function public.send_message(
  p_conversation_id uuid default null,
  p_recipient_id uuid default null,
  p_item_id uuid default null,
  p_body text default null,
  p_type text default 'text',
  p_meetup_location text default null,
  p_meetup_time timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_conversation public.conversations%rowtype;
  v_item public.items%rowtype;
  v_id uuid;
  v_target uuid;
  v_name text;
  v_body text;
  v_context_item_id uuid;
begin
  if v_uid is null then raise exception 'Sign in to message another user' using errcode = '42501'; end if;
  if p_type not in ('text', 'meetup_proposal') then raise exception 'Unsupported message type'; end if;
  v_body := nullif(trim(p_body), '');
  if p_type = 'text' and (v_body is null or char_length(v_body) > 1000) then raise exception 'Message must be 1 to 1,000 characters'; end if;
  if p_type = 'meetup_proposal' and (
    coalesce(length(trim(p_meetup_location)), 0) not between 1 and 255
    or p_meetup_time is null or p_meetup_time <= now()
  ) then raise exception 'Meetup proposal needs a valid location and a future time'; end if;

  if p_conversation_id is not null then
    select * into v_conversation from public.conversations where id = p_conversation_id for update;
    if not found or v_uid not in (v_conversation.starter_id, v_conversation.recipient_id) then
      raise exception 'Conversation not found or access denied' using errcode = '42501';
    end if;
    if p_item_id is not null and p_item_id is distinct from v_conversation.item_id then
      raise exception 'The item does not belong to this conversation' using errcode = '42501';
    end if;
    v_context_item_id := v_conversation.item_id;
    v_target := case when v_uid = v_conversation.starter_id then v_conversation.recipient_id else v_conversation.starter_id end;
  else
    if p_recipient_id is null or p_recipient_id = v_uid then raise exception 'Choose another UM-Pasa user'; end if;
    if not exists (select 1 from public.profiles where id = p_recipient_id) then raise exception 'Recipient not found'; end if;
    if p_item_id is not null then
      select * into v_item from public.items where id = p_item_id;
      if not found then raise exception 'Listing not found'; end if;
      if not (
        v_item.seller_id = p_recipient_id
        or (v_item.seller_id = v_uid and exists (
          select 1 from public.transactions t where t.item_id = v_item.id
            and t.buyer_id = p_recipient_id and t.seller_id = v_uid
        ))
      ) then raise exception 'You cannot open a conversation for this listing' using errcode = '42501'; end if;
    end if;
    perform pg_advisory_xact_lock(hashtextextended(
      least(v_uid::text, p_recipient_id::text) || ':' || greatest(v_uid::text, p_recipient_id::text) || ':' || coalesce(p_item_id::text, ''), 0
    ));
    select * into v_conversation from public.conversations c
    where ((c.starter_id = v_uid and c.recipient_id = p_recipient_id)
      or (c.starter_id = p_recipient_id and c.recipient_id = v_uid))
      and c.item_id is not distinct from p_item_id
    limit 1 for update;
    if not found then
      insert into public.conversations (starter_id, recipient_id, item_id, last_message_at)
      values (v_uid, p_recipient_id, p_item_id, now()) returning * into v_conversation;
    end if;
    v_context_item_id := v_conversation.item_id;
    v_target := p_recipient_id;
  end if;

  insert into public.messages (conversation_id, sender_id, body, type, proposal_status, meetup_location, meetup_time, meta)
  values (
    v_conversation.id, v_uid,
    case when p_type = 'meetup_proposal' then coalesce(v_body, 'Meetup proposal sent.') else v_body end,
    p_type, case when p_type = 'meetup_proposal' then 'pending' end,
    case when p_type = 'meetup_proposal' then trim(p_meetup_location) end,
    case when p_type = 'meetup_proposal' then p_meetup_time end,
    case when v_context_item_id is not null then
      jsonb_build_object('item_title', (select title from public.items where id = v_context_item_id))
    end
  ) returning id into v_id;
  update public.conversations set last_message_at = now() where id = v_conversation.id;
  select full_name into v_name from public.profiles where id = v_uid;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (
    v_target,
    case when p_type = 'meetup_proposal' then coalesce(v_name, 'A UM-Pasa user') || ' sent a meetup proposal.' else coalesce(v_name, 'A UM-Pasa user') || ' sent you a message.' end,
    case when p_type = 'meetup_proposal' then 'meetup' else 'message' end,
    'conversation', v_conversation.id
  );
  return v_id;
end;
$$;

-- Admins can assign roles through a protected database operation. A normal
-- student cannot invoke it, and the final administrator cannot demote themself.
create or replace function public.admin_set_profile_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_role not in ('student','admin') then raise exception 'Invalid role'; end if;
  lock table public.profiles in share row exclusive mode;
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'Profile not found'; end if;
  if p_role = 'student'
     and exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'The last administrator cannot be removed';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;
revoke all on function public.admin_set_profile_role(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_profile_role(uuid, text) to authenticated;

-- Private payment proof storage. Object keys must begin with the transaction
-- UUID, e.g. <transaction-uuid>/<filename>. No public URL grants access.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;
alter table storage.objects enable row level security;

create or replace function private.can_access_payment_proof(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.transactions t
    where t.id = case
      when split_part(coalesce(p_name, ''), '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
      else null
    end
    and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_access_payment_proof(text) from public, anon, authenticated;
grant execute on function private.can_access_payment_proof(text) to authenticated;

-- Restrictive fences neutralize any broader Storage policies left for other
-- buckets, while leaving those buckets' behavior alone.
drop policy if exists payment_proofs_anon_fence_select on storage.objects;
create policy payment_proofs_anon_fence_select on storage.objects
  as restrictive for select to anon using (bucket_id <> 'payment-proofs');
drop policy if exists payment_proofs_anon_fence_insert on storage.objects;
create policy payment_proofs_anon_fence_insert on storage.objects
  as restrictive for insert to anon with check (bucket_id <> 'payment-proofs');
drop policy if exists payment_proofs_anon_fence_update on storage.objects;
create policy payment_proofs_anon_fence_update on storage.objects
  as restrictive for update to anon
  using (bucket_id <> 'payment-proofs') with check (bucket_id <> 'payment-proofs');
drop policy if exists payment_proofs_anon_fence_delete on storage.objects;
create policy payment_proofs_anon_fence_delete on storage.objects
  as restrictive for delete to anon using (bucket_id <> 'payment-proofs');

drop policy if exists payment_proofs_authenticated_fence_select on storage.objects;
create policy payment_proofs_authenticated_fence_select on storage.objects
  as restrictive for select to authenticated
  using (bucket_id <> 'payment-proofs' or private.can_access_payment_proof(name));
drop policy if exists payment_proofs_authenticated_fence_insert on storage.objects;
create policy payment_proofs_authenticated_fence_insert on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'payment-proofs' or private.can_access_payment_proof(name));
drop policy if exists payment_proofs_authenticated_fence_update on storage.objects;
create policy payment_proofs_authenticated_fence_update on storage.objects
  as restrictive for update to authenticated
  using (bucket_id <> 'payment-proofs' or private.can_access_payment_proof(name))
  with check (bucket_id <> 'payment-proofs' or private.can_access_payment_proof(name));
drop policy if exists payment_proofs_authenticated_fence_delete on storage.objects;
create policy payment_proofs_authenticated_fence_delete on storage.objects
  as restrictive for delete to authenticated
  using (bucket_id <> 'payment-proofs' or private.can_access_payment_proof(name));

drop policy if exists payment_proofs_participant_select on storage.objects;
create policy payment_proofs_participant_select on storage.objects
  for select to authenticated using (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name));
drop policy if exists payment_proofs_participant_insert on storage.objects;
create policy payment_proofs_participant_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name));
drop policy if exists payment_proofs_participant_update on storage.objects;
create policy payment_proofs_participant_update on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name))
  with check (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name));
drop policy if exists payment_proofs_participant_delete on storage.objects;
create policy payment_proofs_participant_delete on storage.objects
  for delete to authenticated using (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name));

-- All exposed functions use explicit execute grants. Existing RPC definitions
-- are retained; this file only adjusts the role assignment RPC and policies.
