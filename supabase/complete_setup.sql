-- ============================================================
-- UM-PASA COMPLETE SUPABASE SETUP SCRIPT
-- Contains:
--   1. Schema Baseline (Tables, Types, Constraints, Indexes)
--   2. Auth Profile Trigger (Automatic student profile on signup)
--   3. Guarded Mobile RPCs & RLS Policies
--   4. Storage Buckets & Realtime Subscriptions
-- ============================================================

-- ============================================================
-- SECTION 1: SCHEMA BASELINE
-- ============================================================
-- Reconstructed Phase 1 schema for a fresh Supabase project.
-- The original Phase 1 SQL was not found in the repository. This baseline is
-- reconstructed from database.types.ts, the Phase 2/2.5 RPCs, and the Laravel
-- model/migration relationships. It is not a dump of the live project.
-- Existing tables are left untouched by CREATE TABLE IF NOT EXISTS; inspect
-- the live catalog before using this against a project with existing data.

create schema if not exists private;
grant usage on schema private to authenticated, anon;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_number text unique,
  full_name text not null,
  department text,
  program text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
grant execute on function private.is_admin() to authenticated, anon;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  title varchar(255) not null,
  category varchar(100) not null,
  description text not null,
  department text not null,
  program text,
  course_code varchar(20) not null,
  listing_type text not null check (listing_type in ('sell', 'rent')),
  accepted_payment_methods text[] not null,
  minimum_rental_days integer,
  maximum_rental_days integer,
  daily_rental_rate numeric(12,2),
  rental_duration_days integer,
  condition text not null check (condition in ('new', 'like_new', 'good', 'fair', 'poor')),
  price numeric(12,2),
  image_path text,
  status text not null default 'available' check (status in ('available', 'pending', 'sold')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_payment_methods_check check (
    cardinality(accepted_payment_methods) > 0
    and accepted_payment_methods <@ array['gcash','maya','bank_transfer','cash_on_pickup','other']::text[]
  ),
  constraint items_price_nonnegative_check check (price is null or price >= 0),
  constraint items_rental_days_check check (
    (listing_type = 'sell' and minimum_rental_days is null and maximum_rental_days is null and daily_rental_rate is null)
    or (listing_type = 'rent'
      and minimum_rental_days is not null and minimum_rental_days between 1 and 365
      and maximum_rental_days is not null and maximum_rental_days between minimum_rental_days and 365
      and daily_rental_rate is not null and daily_rental_rate >= 0)
  )
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  payment_method text not null check (payment_method in ('gcash','maya','bank_transfer','cash_on_pickup','other')),
  other_payment_method text,
  rental_duration_days integer,
  rental_due_date date,
  payment_proof_path text,
  payment_proof_uploaded_at timestamptz,
  meetup_location text,
  meetup_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_distinct_participants_check check (buyer_id <> seller_id),
  constraint transactions_other_payment_check check (
    (payment_method = 'other' and other_payment_method is not null and char_length(other_payment_method) between 1 and 80)
    or (payment_method <> 'other' and other_payment_method is null)
  ),
  constraint transactions_rental_duration_check check (rental_duration_days is null or rental_duration_days between 1 and 365)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  starter_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  item_id uuid references public.items(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_distinct_participants_check check (starter_id <> recipient_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text,
  type text not null default 'text',
  proposal_status text,
  meetup_location text,
  meetup_time timestamptz,
  meta jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_check check (
    (type = 'text' and body is not null and char_length(body) between 1 and 1000
      and proposal_status is null and meetup_location is null and meetup_time is null)
    or (type = 'meetup_proposal' and body is not null and char_length(body) between 1 and 1000
      and proposal_status is not null and proposal_status in ('pending','accepted','declined')
      and meetup_location is not null and char_length(meetup_location) between 1 and 255 and meetup_time is not null)
    or (type = 'system' and body is not null and char_length(body) between 1 and 1000
      and proposal_status is null and meetup_location is null and meetup_time is null)
  )
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_user_id uuid not null references public.profiles(id) on delete restrict,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_distinct_users_check check (reviewer_id <> reviewed_user_id),
  constraint ratings_one_per_user_transaction unique (reviewer_id, transaction_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  type text not null default 'info',
  related_type text check (related_type is null or related_type in ('transaction','conversation','item')),
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_seller_created_idx on public.items (seller_id, created_at desc);
create index if not exists items_marketplace_created_idx on public.items (status, moderation_status, created_at desc);
create index if not exists items_category_type_idx on public.items (category, listing_type);
create index if not exists transactions_buyer_created_idx on public.transactions (buyer_id, created_at desc);
create index if not exists transactions_seller_created_idx on public.transactions (seller_id, created_at desc);
create index if not exists transactions_item_status_idx on public.transactions (item_id, status);
create index if not exists conversations_starter_recent_idx on public.conversations (starter_id, last_message_at desc);
create index if not exists conversations_recipient_recent_idx on public.conversations (recipient_id, last_message_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists ratings_reviewed_created_idx on public.ratings (reviewed_user_id, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_related_idx on public.notifications (related_type, related_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','items','transactions','conversations','messages','ratings','notifications'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end;
$$;

-- The actual policies and role helper are applied by the security-hardening
-- migration after Phase 2.5 RPCs, which resets the full policy set and grants.


-- ============================================================
-- SECTION 2: AUTH PROFILE TRIGGER
-- ============================================================
-- Run in Supabase SQL Editor after Phase 1 tables and policies exist.
-- This trigger creates profiles atomically when an Auth user is created,
-- including projects that require email confirmation before a session exists.
create or replace function public.handle_new_um_pasa_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, student_number, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'student_number'), ''),
    'student'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_um_pasa_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_um_pasa on auth.users;
create trigger on_auth_user_created_um_pasa
  after insert on auth.users
  for each row execute function public.handle_new_um_pasa_user();

-- Backfill older Auth accounts that predate the profile trigger. Student number
-- is left blank for these accounts so existing duplicate metadata cannot block
-- login; users can add it later from their profile.
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
  'student'
from auth.users u
on conflict do nothing;


-- ============================================================
-- SECTION 3: GUARDED MOBILE RPCS & ACCESS POLICIES
-- ============================================================
-- UM-Pasa mobile data-access migration.
-- Prerequisite: run the Phase 1 schema and mobile/supabase/phase2_auth_profile_trigger.sql.
-- This script tightens write privileges and exposes only validated RPC workflows.

alter table public.items add column if not exists archived_at timestamptz;

create or replace function private.protect_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    if tg_table_name = 'profiles' and new.role is distinct from old.role then
      raise exception 'Only an admin can change a profile role' using errcode = '42501';
    end if;
    if tg_table_name = 'items'
       and (
         new.moderation_status is distinct from old.moderation_status
         or new.rejection_reason is distinct from old.rejection_reason
       )
       and not (
         coalesce(current_setting('umpasa.resubmit_listing', true), '') = 'on'
         and new.seller_id = old.seller_id
         and new.moderation_status = 'pending'
         and new.rejection_reason is null
       ) then
      raise exception 'Only an admin can change listing moderation fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.protect_item_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not private.is_admin()
     and coalesce(current_setting('umpasa.transaction_workflow', true), '') <> 'on' then
    raise exception 'Listing availability is controlled by the transaction workflow' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists items_protect_status on public.items;
create trigger items_protect_status before update on public.items
for each row execute function private.protect_item_status();

-- Give the mobile client read access through RLS, but remove direct writes to
-- business tables. Profile edits and notification read flags are narrow exceptions.
revoke all on public.profiles, public.items, public.transactions,
  public.conversations, public.messages, public.ratings, public.notifications
  from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.transactions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;

grant select on public.profiles, public.items, public.transactions,
  public.conversations, public.messages, public.ratings, public.notifications
  to authenticated;
grant update (full_name, student_number, department, program)
  on public.profiles to authenticated;
grant update (is_read) on public.notifications to authenticated;

-- The guest marketplace stays publicly browsable, but only approved and
-- available listings are visible without an Auth session.
grant select on public.items to anon, authenticated;
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

-- Related listing detail remains visible to a transaction participant even
-- after its moderation state changes.
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

-- A user's full profile is private to themselves and administrators
drop policy if exists "users read own profile and admins read all" on public.profiles;
create policy "users read own profile and admins read all"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));

create or replace function public.public_profile_summaries(p_ids uuid[])
returns table (id uuid, full_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.role
  from public.profiles p
  where p.id = any(coalesce(p_ids, array[]::uuid[]))
    and (
      p.id = (select auth.uid())
      or (select private.is_admin())
      or exists (
        select 1 from public.items i
        where i.seller_id = p.id and i.status = 'available' and i.moderation_status = 'approved'
      )
      or exists (
        select 1 from public.transactions t
        where (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()))
          and p.id in (t.buyer_id, t.seller_id)
      )
      or exists (
        select 1 from public.conversations c
        where (c.starter_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
          and p.id in (c.starter_id, c.recipient_id)
      )
    );
$$;

-- The legacy message workflow writes system response messages. Permit that
-- database-generated type while rejecting attempts to send it from the app RPC.
alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages drop constraint if exists messages_check;
alter table public.messages add constraint messages_type_check
  check (type in ('text', 'meetup_proposal', 'system'));
alter table public.messages add constraint messages_body_type_check
  check (
    (type = 'text' and body is not null and char_length(body) between 1 and 1000)
    or (type = 'meetup_proposal' and meetup_location is not null and meetup_time is not null)
    or (type = 'system' and body is not null and char_length(body) between 1 and 1000)
  );

create or replace function public.save_listing(p_item_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean := private.is_admin();
  v_id uuid;
  v_type text := p_data ->> 'listing_type';
  v_department text := p_data ->> 'department';
  v_program text := nullif(trim(p_data ->> 'program'), '');
  v_min integer := nullif(p_data ->> 'minimum_rental_days', '')::integer;
  v_max integer := nullif(p_data ->> 'maximum_rental_days', '')::integer;
  v_rate numeric := nullif(p_data ->> 'daily_rental_rate', '')::numeric;
  v_methods text[];
  v_allowed_programs text[];
begin
  if v_uid is null then raise exception 'Sign in to manage a listing' using errcode = '42501'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Invalid listing data'; end if;
  if coalesce(length(trim(p_data ->> 'title')), 0) not between 1 and 255 then raise exception 'Title must be 1 to 255 characters'; end if;
  if coalesce(length(trim(p_data ->> 'category')), 0) not between 1 and 100 then raise exception 'Category must be 1 to 100 characters'; end if;
  if coalesce(length(trim(p_data ->> 'description')), 0) not between 10 and 5000 then raise exception 'Description must be 10 to 5,000 characters'; end if;
  if coalesce(length(trim(p_data ->> 'course_code')), 0) not between 1 and 20 then raise exception 'Course code must be 1 to 20 characters'; end if;
  if v_type not in ('sell', 'rent') then raise exception 'Choose sale or rental'; end if;
  if coalesce(length(trim(v_department)), 0) = 0 then raise exception 'Department is required'; end if;
  if p_data ->> 'condition' not in ('new', 'like_new', 'good', 'fair', 'poor') then raise exception 'Choose a valid condition'; end if;
  if nullif(p_data ->> 'price', '') is not null and (p_data ->> 'price')::numeric < 0 then raise exception 'Price cannot be negative'; end if;

  if v_department not in (
    'Department of Accounting Education',
    'Department of Arts and Sciences Education',
    'Department of Computing Education',
    'Department of Business Administration Education',
    'Department of Hospitality Education',
    'Department of Criminal Justice Education',
    'Department of Engineering Education',
    'Department of Teacher Education',
    'Junior High School',
    'Senior High School',
    'Graduate School'
  ) then raise exception 'Choose a valid University of Mindanao department'; end if;

  v_allowed_programs := case v_department
    when 'Department of Accounting Education' then array['BS in Accountancy','BS in Internal Auditing','BS in Management Accounting']
    when 'Department of Arts and Sciences Education' then array['AB English','BS in Psychology']
    when 'Department of Computing Education' then array['BS in Computer Science','BS in Information Technology']
    when 'Department of Business Administration Education' then array['BS in Business Administration - Major in Financial Management','BS in Business Administration - Major in Human Resource Management','BS in Business Administration - Major in Marketing Management']
    when 'Department of Hospitality Education' then array['BS in Hotel and Restaurant Management','BS in Tourism Management']
    when 'Department of Criminal Justice Education' then array['BS in Criminology']
    when 'Department of Engineering Education' then array['Major in Computer Engineering','Major in Electrical Engineering','Major in Electronics Engineering']
    when 'Department of Teacher Education' then array['Bachelor in Elementary Education - Generalist','Bachelor in Physical Education','Bachelor in Secondary Education - Major in English','Bachelor in Secondary Education - Major in Filipino','Bachelor in Secondary Education - Major in Mathematics','Bachelor in Secondary Education - Major in Science','Bachelor in Secondary Education - Major in Social Studies']
    when 'Senior High School' then array['Science, Technology, Engineering and Mathematics (STEM)']
    when 'Graduate School' then array['Master of Arts in Education - Teaching English','Master of Arts in Education - Teaching Filipino','Master of Arts in Education - Teaching Mathematics','Master of Arts in Education - Teaching Science','Master of Arts in Education - Teaching Physical Education','Master in Business Administration','Master in Management','Master in Public Administration']
    else array[]::text[]
  end;
  if cardinality(v_allowed_programs) > 0 and (v_program is null or not (v_program = any(v_allowed_programs))) then
    raise exception 'Choose a program belonging to the selected department';
  end if;
  if cardinality(v_allowed_programs) = 0 and v_program is not null then raise exception 'The selected department does not have a program option'; end if;

  if jsonb_typeof(p_data -> 'accepted_payment_methods') <> 'array' then raise exception 'Select at least one payment method'; end if;
  select array_agg(distinct value) into v_methods from jsonb_array_elements_text(p_data -> 'accepted_payment_methods') as x(value);
  if coalesce(cardinality(v_methods), 0) = 0 or exists (
    select 1 from unnest(v_methods) method
    where method not in ('gcash', 'maya', 'bank_transfer', 'cash_on_pickup', 'other')
  ) then raise exception 'Choose one or more valid payment methods'; end if;
  if v_type = 'rent' and (
    v_min is null or v_min not between 1 and 365
    or v_max is null or v_max < v_min or v_max > 365
    or v_rate is null or v_rate < 0
  ) then raise exception 'Rental listings need valid rental days and a non-negative daily rate'; end if;

  if p_item_id is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, accepted_payment_methods, minimum_rental_days, maximum_rental_days,
      daily_rental_rate, rental_duration_days, condition, price, image_path, status,
      moderation_status, rejection_reason
    ) values (
      v_uid, trim(p_data ->> 'title'), trim(p_data ->> 'category'), trim(p_data ->> 'description'),
      v_department, v_program, upper(trim(p_data ->> 'course_code')), v_type, v_methods,
      case when v_type = 'rent' then v_min end,
      case when v_type = 'rent' then v_max end,
      case when v_type = 'rent' then v_rate end,
      case when v_type = 'rent' then v_max end,
      p_data ->> 'condition',
      case when v_type = 'rent' then v_rate else nullif(p_data ->> 'price', '')::numeric end,
      nullif(trim(p_data ->> 'image_path'), ''),
      'available', case when v_admin then 'approved' else 'pending' end, null
    ) returning id into v_id;
  else
    perform 1 from public.items i
    where i.id = p_item_id and (i.seller_id = v_uid or v_admin)
    for update;
    if not found then raise exception 'Listing not found or permission denied' using errcode = '42501'; end if;
    perform set_config('umpasa.resubmit_listing', 'on', true);
    update public.items set
      title = trim(p_data ->> 'title'),
      category = trim(p_data ->> 'category'),
      description = trim(p_data ->> 'description'),
      department = v_department,
      program = v_program,
      course_code = upper(trim(p_data ->> 'course_code')),
      listing_type = v_type,
      accepted_payment_methods = v_methods,
      minimum_rental_days = case when v_type = 'rent' then v_min end,
      maximum_rental_days = case when v_type = 'rent' then v_max end,
      daily_rental_rate = case when v_type = 'rent' then v_rate end,
      rental_duration_days = case when v_type = 'rent' then v_max end,
      condition = p_data ->> 'condition',
      price = case when v_type = 'rent' then v_rate else nullif(p_data ->> 'price', '')::numeric end,
      image_path = coalesce(nullif(trim(p_data ->> 'image_path'), ''), image_path),
      moderation_status = case when v_admin then 'approved' else 'pending' end,
      rejection_reason = null
    where id = p_item_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_listing(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_item public.items%rowtype;
begin
  select * into v_item from public.items i
    where i.id = p_item_id and (i.seller_id = v_uid or private.is_admin())
    for update;
  if not found then raise exception 'Listing not found or permission denied' using errcode = '42501'; end if;
  if exists (select 1 from public.transactions where item_id = v_item.id) then
    update public.items set archived_at = coalesce(archived_at, now()) where id = v_item.id;
    return true;
  end if;
  delete from public.items where id = v_item.id;
  return true;
end;
$$;

create or replace function public.set_item_moderation(p_item_id uuid, p_status text, p_rejection_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_item public.items%rowtype;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'Invalid moderation decision'; end if;
  if p_rejection_reason is not null and char_length(p_rejection_reason) > 500 then raise exception 'Rejection reason must be 500 characters or fewer'; end if;
  update public.items set moderation_status = p_status,
    rejection_reason = case when p_status = 'rejected' then nullif(trim(p_rejection_reason), '') end
  where id = p_item_id returning * into v_item;
  if not found then raise exception 'Listing not found'; end if;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (
    v_item.seller_id,
    case when p_status = 'approved'
      then 'Your listing ' || v_item.title || ' was approved and is now visible in the marketplace.'
      else 'Your listing ' || v_item.title || ' was rejected.' end,
    case when p_status = 'approved' then 'item_approved' else 'item_rejected' end,
    'item', v_item.id
  );
  return v_item.id;
end;
$$;

create or replace function public.request_item(
  p_item_id uuid,
  p_payment_method text,
  p_other_payment_method text default null,
  p_rental_duration_days integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_item public.items%rowtype;
  v_transaction_id uuid;
  v_payment_label text;
begin
  if v_uid is null then raise exception 'Sign in to request a listing' using errcode = '42501'; end if;
  select * into v_item from public.items where id = p_item_id for update;
  if not found or v_item.status <> 'available' or v_item.moderation_status <> 'approved' then raise exception 'This listing is no longer available'; end if;
  if v_item.seller_id = v_uid then raise exception 'You cannot request your own listing'; end if;
  if not (p_payment_method = any(v_item.accepted_payment_methods)) then raise exception 'Choose a payment method accepted by the seller'; end if;
  if p_payment_method = 'other' and coalesce(length(trim(p_other_payment_method)), 0) not between 1 and 80 then raise exception 'Describe the other payment method'; end if;
  if p_payment_method <> 'other' and p_other_payment_method is not null then raise exception 'Other payment details are only valid for the other payment option'; end if;
  if v_item.listing_type = 'rent' and (
    p_rental_duration_days is null
    or p_rental_duration_days < coalesce(v_item.minimum_rental_days, 1)
    or p_rental_duration_days > coalesce(v_item.maximum_rental_days, 365)
  ) then raise exception 'Rental days must be within the seller''s range'; end if;
  if v_item.listing_type = 'sell' and p_rental_duration_days is not null then raise exception 'Sale requests cannot include rental days'; end if;
  if exists (select 1 from public.transactions t where t.item_id = v_item.id and t.buyer_id = v_uid and t.status in ('pending', 'approved')) then
    raise exception 'You already have an active request for this listing';
  end if;

  insert into public.transactions (buyer_id, seller_id, item_id, status, payment_method, other_payment_method, rental_duration_days)
  values (v_uid, v_item.seller_id, v_item.id, 'pending', p_payment_method,
    case when p_payment_method = 'other' then trim(p_other_payment_method) end,
    case when v_item.listing_type = 'rent' then p_rental_duration_days end)
  returning id into v_transaction_id;
  perform set_config('umpasa.transaction_workflow', 'on', true);
  update public.items set status = 'pending' where id = v_item.id;
  v_payment_label := case p_payment_method
    when 'gcash' then 'GCash' when 'maya' then 'Maya' when 'bank_transfer' then 'Bank Transfer'
    when 'cash_on_pickup' then 'Cash on Pickup' else trim(p_other_payment_method) end;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_item.seller_id, 'New request received for ' || v_item.title || ' using ' || v_payment_label || '.', 'request', 'transaction', v_transaction_id);
  return v_transaction_id;
end;
$$;

create or replace function public.approve_transaction(p_transaction_id uuid, p_meetup_location text, p_meetup_time timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_tx public.transactions%rowtype; v_item public.items%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to approve a transaction' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.seller_id <> v_uid then raise exception 'Only the seller can approve this request' using errcode = '42501'; end if;
  if v_tx.status <> 'pending' then raise exception 'Only pending requests can be approved'; end if;
  if coalesce(length(trim(p_meetup_location)), 0) not between 1 and 255 then raise exception 'Meetup location is required (255 characters maximum)'; end if;
  if p_meetup_time is null or p_meetup_time <= now() then raise exception 'Meetup time must be in the future'; end if;
  select * into v_item from public.items where id = v_tx.item_id;
  update public.transactions set status = 'approved', meetup_location = trim(p_meetup_location), meetup_time = p_meetup_time,
    rental_due_date = case when v_item.listing_type = 'rent' and v_tx.rental_duration_days is not null
      then p_meetup_time::date + v_tx.rental_duration_days else null end
  where id = v_tx.id;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_tx.buyer_id, 'Your request for ' || v_item.title || ' was approved.', 'approval', 'transaction', v_tx.id);
  return v_tx.id;
end;
$$;

create or replace function public.reject_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_tx public.transactions%rowtype; v_item public.items%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to reject a transaction' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.seller_id <> v_uid then raise exception 'Only the seller can reject this request' using errcode = '42501'; end if;
  if v_tx.status <> 'pending' then raise exception 'Only pending requests can be rejected'; end if;
  update public.transactions set status = 'rejected' where id = v_tx.id;
  select * into v_item from public.items where id = v_tx.item_id;
  if not exists (select 1 from public.transactions where item_id = v_item.id and status in ('pending', 'approved')) then
    perform set_config('umpasa.transaction_workflow', 'on', true);
    update public.items set status = 'available' where id = v_item.id;
  end if;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_tx.buyer_id, 'Your request for ' || v_item.title || ' was rejected.', 'rejection', 'transaction', v_tx.id);
  return v_tx.id;
end;
$$;

create or replace function public.complete_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_tx public.transactions%rowtype; v_item public.items%rowtype;
begin
  if v_uid is null then raise exception 'Sign in to complete a transaction' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.seller_id <> v_uid then raise exception 'Only the seller can complete this exchange' using errcode = '42501'; end if;
  if v_tx.status <> 'approved' then raise exception 'Only approved transactions can be completed'; end if;
  update public.transactions set status = 'completed' where id = v_tx.id;
  select * into v_item from public.items where id = v_tx.item_id;
  perform set_config('umpasa.transaction_workflow', 'on', true);
  update public.items set status = case when v_item.listing_type = 'rent' then 'available' else 'sold' end where id = v_item.id;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_tx.buyer_id, 'Transaction completed for ' || v_item.title || '.', 'completion', 'transaction', v_tx.id);
  return v_tx.id;
end;
$$;

create or replace function public.rate_transaction(p_transaction_id uuid, p_rating integer, p_comment text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_tx public.transactions%rowtype; v_reviewed uuid; v_id uuid; v_name text;
begin
  if v_uid is null then raise exception 'Sign in to rate a transaction' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id = p_transaction_id;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status <> 'completed' or v_uid not in (v_tx.buyer_id, v_tx.seller_id) then raise exception 'Only transaction participants can rate a completed exchange' using errcode = '42501'; end if;
  if p_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if p_comment is not null and char_length(p_comment) > 500 then raise exception 'Comment must be 500 characters or fewer'; end if;
  v_reviewed := case when v_uid = v_tx.buyer_id then v_tx.seller_id else v_tx.buyer_id end;
  select full_name into v_name from public.profiles where id = v_uid;
  insert into public.ratings (reviewer_id, reviewed_user_id, transaction_id, rating, comment)
  values (v_uid, v_reviewed, v_tx.id, p_rating, nullif(trim(p_comment), '')) returning id into v_id;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_reviewed, coalesce(v_name, 'A UM-Pasa user') || ' left a new rating.', 'rating', 'transaction', v_tx.id);
  return v_id;
end;
$$;

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
    if not found or v_uid not in (v_conversation.starter_id, v_conversation.recipient_id) then raise exception 'Conversation not found or access denied' using errcode = '42501'; end if;
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
    case when v_context_item_id is not null then jsonb_build_object('item_title', (select title from public.items where id = v_context_item_id)) end
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

create or replace function public.respond_to_meetup_proposal(p_message_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_message public.messages%rowtype; v_conversation public.conversations%rowtype; v_name text;
begin
  if v_uid is null then raise exception 'Sign in to respond to a meetup proposal' using errcode = '42501'; end if;
  select * into v_message from public.messages where id = p_message_id for update;
  if not found or v_message.type <> 'meetup_proposal' or v_message.proposal_status <> 'pending' then raise exception 'This meetup proposal is no longer pending'; end if;
  select * into v_conversation from public.conversations where id = v_message.conversation_id for update;
  if v_uid = v_message.sender_id or v_uid not in (v_conversation.starter_id, v_conversation.recipient_id) then raise exception 'Only the other conversation participant can respond' using errcode = '42501'; end if;
  update public.messages set proposal_status = case when p_accept then 'accepted' else 'declined' end where id = v_message.id;
  insert into public.messages (conversation_id, sender_id, type, body)
  values (v_conversation.id, v_uid, 'system', case when p_accept then 'Meetup proposal accepted.' else 'Meetup proposal declined.' end);
  update public.conversations set last_message_at = now() where id = v_conversation.id;
  select full_name into v_name from public.profiles where id = v_uid;
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (v_message.sender_id, coalesce(v_name, 'A UM-Pasa user') || case when p_accept then ' accepted your meetup proposal.' else ' declined your meetup proposal.' end,
    'meetup', 'conversation', v_conversation.id);
  return v_message.id;
end;
$$;

create or replace function public.admin_list_profiles()
returns table (id uuid, email text, full_name text, role text, student_number text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  return query
    select p.id, coalesce(u.email, ''), p.full_name, p.role, p.student_number, p.created_at
    from public.profiles p left join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.save_listing(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.delete_listing(uuid) from public, anon, authenticated;
revoke all on function public.set_item_moderation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.request_item(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.approve_transaction(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.reject_transaction(uuid) from public, anon, authenticated;
revoke all on function public.complete_transaction(uuid) from public, anon, authenticated;
revoke all on function public.rate_transaction(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.send_message(uuid, uuid, uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.respond_to_meetup_proposal(uuid, boolean) from public, anon, authenticated;
revoke all on function public.admin_list_profiles() from public, anon, authenticated;
revoke all on function public.public_profile_summaries(uuid[]) from public, anon, authenticated;

grant execute on function public.save_listing(uuid, jsonb) to authenticated;
grant execute on function public.delete_listing(uuid) to authenticated;
grant execute on function public.set_item_moderation(uuid, text, text) to authenticated;
grant execute on function public.request_item(uuid, text, text, integer) to authenticated;
grant execute on function public.approve_transaction(uuid, text, timestamptz) to authenticated;
grant execute on function public.reject_transaction(uuid) to authenticated;
grant execute on function public.complete_transaction(uuid) to authenticated;
grant execute on function public.rate_transaction(uuid, integer, text) to authenticated;
grant execute on function public.send_message(uuid, uuid, uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.respond_to_meetup_proposal(uuid, boolean) to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.public_profile_summaries(uuid[]) to anon, authenticated;



-- ============================================================
-- SECTION 4: STORAGE BUCKETS & REALTIME SUBSCRIPTIONS
-- ============================================================

-- Create public bucket for listing images
insert into storage.buckets (id, name, public)
values ('items', 'items', true)
on conflict (id) do update set public = true;

-- Create private bucket for payment proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

-- Function to check if caller can access payment proof (buyer, seller, or admin)
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
    and (t.buyer_id = (select auth.uid()) or t.seller_id = (select auth.uid()) or private.is_admin())
  );
$$;
revoke all on function private.can_access_payment_proof(text) from public, anon, authenticated;
grant execute on function private.can_access_payment_proof(text) to authenticated;

-- Storage policies for items and payment-proofs (wrapped safely)
do $$
begin
  drop policy if exists "Public read items" on storage.objects;
  create policy "Public read items" on storage.objects
    for select to public using (bucket_id = 'items');

  drop policy if exists "Authenticated insert items" on storage.objects;
  create policy "Authenticated insert items" on storage.objects
    for insert to authenticated with check (bucket_id = 'items');

  drop policy if exists "Authenticated update items" on storage.objects;
  create policy "Authenticated update items" on storage.objects
    for update to authenticated using (bucket_id = 'items');

  drop policy if exists "Authenticated delete items" on storage.objects;
  create policy "Authenticated delete items" on storage.objects
    for delete to authenticated using (bucket_id = 'items');

  drop policy if exists "Participant read payment proof" on storage.objects;
  create policy "Participant read payment proof" on storage.objects
    for select to authenticated using (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name));

  drop policy if exists "Participant insert payment proof" on storage.objects;
  create policy "Participant insert payment proof" on storage.objects
    for insert to authenticated with check (bucket_id = 'payment-proofs');

  drop policy if exists "Participant update payment proof" on storage.objects;
  create policy "Participant update payment proof" on storage.objects
    for update to authenticated using (bucket_id = 'payment-proofs' and private.can_access_payment_proof(name));
exception when others then
  -- In hosted Supabase projects where storage.objects is owned by supabase_storage_admin,
  -- policies can be configured via the Storage UI if needed.
  raise notice 'Storage policy notice: %', sqlerrm;
end;
$$;

-- Realtime replication publications for chat and activity updates
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when others then
  null;
end;
$$;

