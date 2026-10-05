-- Reconstructed Phase 1 schema for a fresh Supabase project.
-- The original Phase 1 SQL was not found in the repository. This baseline is
-- reconstructed from database.types.ts, the Phase 2/2.5 RPCs, and the Laravel
-- model/migration relationships. It is not a dump of the live project.
-- Existing tables are left untouched by CREATE TABLE IF NOT EXISTS; inspect
-- the live catalog before using this against a project with existing data.

create schema if not exists private;

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
revoke all on function private.is_admin() from public, anon, authenticated;

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
