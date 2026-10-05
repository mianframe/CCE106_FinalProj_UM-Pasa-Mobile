-- ====================================================================
-- UM-PASA EXPO MASTER REPAIR & RLS FIX SCRIPT
-- ====================================================================

-- 1. FIX AUTH.USERS TOKENS & INTERNAL GOTRUE FIELDS
update auth.users
set 
  is_super_admin = false,
  is_sso_user = false,
  is_anonymous = false,
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  email_change_token_current = coalesce(email_change_token_current, '');

-- 2. ENSURE IDENTITIES FOR ALL USERS
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'full_name', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  ),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

-- 3. PERMISSIONS ON PRIVATE SCHEMA & HELPERS
grant usage on schema private to authenticated, anon;
grant execute on function private.is_admin() to authenticated, anon;
grant select on public.profiles to authenticated, anon;
grant select on public.items to authenticated, anon;
grant all on public.transactions to authenticated;
grant all on public.conversations to authenticated;
grant all on public.messages to authenticated;
grant all on public.ratings to authenticated;
grant all on public.notifications to authenticated;

-- 4. FIX ADMIN_LIST_PROFILES RPC
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
 RETURNS TABLE(id uuid, email text, full_name text, role text, student_number text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  return query
    select 
      p.id, 
      coalesce(u.email, '')::text as email, 
      p.full_name::text as full_name, 
      p.role::text as role, 
      p.student_number::text as student_number, 
      p.created_at
    from public.profiles p left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$function$;

-- 5. COMPLETE RLS POLICIES

-- Items
drop policy if exists "public read approved marketplace listings" on public.items;
create policy "public read approved marketplace listings"
on public.items for select to anon, authenticated
using (status = 'available' and moderation_status = 'approved' and archived_at is null);

drop policy if exists "sellers can read own listings" on public.items;
create policy "sellers can read own listings"
on public.items for select to authenticated
using (seller_id = (select auth.uid()));

drop policy if exists "admins can read all listings" on public.items;
create policy "admins can read all listings"
on public.items for select to authenticated
using (private.is_admin());

drop policy if exists "transaction participants can read item details" on public.items;
create policy "transaction participants can read item details"
on public.items for select to authenticated
using (
  exists (
    select 1 from public.transactions t
    where t.item_id = items.id
      and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))
  )
);

-- Transactions
drop policy if exists "participants and admin can read transactions" on public.transactions;
create policy "participants and admin can read transactions"
on public.transactions for select to authenticated
using (
  buyer_id = (select auth.uid())
  or seller_id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "participants and admin can update transactions" on public.transactions;
create policy "participants and admin can update transactions"
on public.transactions for update to authenticated
using (
  buyer_id = (select auth.uid())
  or seller_id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "buyers can insert transactions" on public.transactions;
create policy "buyers can insert transactions"
on public.transactions for insert to authenticated
with check (
  buyer_id = (select auth.uid())
  or private.is_admin()
);

-- Conversations
drop policy if exists "participants and admin can read conversations" on public.conversations;
create policy "participants and admin can read conversations"
on public.conversations for select to authenticated
using (
  starter_id = (select auth.uid())
  or recipient_id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "participants and admin can update conversations" on public.conversations;
create policy "participants and admin can update conversations"
on public.conversations for update to authenticated
using (
  starter_id = (select auth.uid())
  or recipient_id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "users can create conversations" on public.conversations;
create policy "users can create conversations"
on public.conversations for insert to authenticated
with check (
  starter_id = (select auth.uid())
  or private.is_admin()
);

-- Messages
drop policy if exists "participants and admin can read messages" on public.messages;
create policy "participants and admin can read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.starter_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
  )
  or private.is_admin()
);

drop policy if exists "senders can insert messages" on public.messages;
create policy "senders can insert messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
);

drop policy if exists "participants can update messages" on public.messages;
create policy "participants can update messages"
on public.messages for update to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.starter_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
  )
);

-- Notifications
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "authenticated can insert notifications" on public.notifications;
create policy "authenticated can insert notifications"
on public.notifications for insert to authenticated
with check (true);

-- Ratings
drop policy if exists "ratings are readable by all" on public.ratings;
create policy "ratings are readable by all"
on public.ratings for select to anon, authenticated
using (true);

drop policy if exists "reviewers can insert ratings" on public.ratings;
create policy "reviewers can insert ratings"
on public.ratings for insert to authenticated
with check (reviewer_id = (select auth.uid()));

-- Profiles
drop policy if exists "users read own profile and admins read all" on public.profiles;
create policy "users read own profile and admins read all"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_admin());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()) or private.is_admin());

-- 6. STORAGE BUCKETS & POLICIES
insert into storage.buckets (id, name, public)
values 
  ('items', 'items', true),
  ('item-images', 'item-images', true),
  ('payment-proofs', 'payment-proofs', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read storage objects" on storage.objects;
create policy "Public can read storage objects"
on storage.objects for select to anon, authenticated
using (bucket_id in ('items', 'item-images', 'payment-proofs', 'avatars'));

drop policy if exists "Authenticated users can upload storage objects" on storage.objects;
create policy "Authenticated users can upload storage objects"
on storage.objects for insert to authenticated
with check (bucket_id in ('items', 'item-images', 'payment-proofs', 'avatars'));

drop policy if exists "Authenticated users can update storage" on storage.objects;
create policy "Authenticated users can update storage"
on storage.objects for update to authenticated
using (bucket_id in ('items', 'item-images', 'payment-proofs', 'avatars'));
