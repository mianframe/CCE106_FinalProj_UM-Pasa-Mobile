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
