-- Ensure all demo and registered users have an active email identity and confirmed email
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
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'full_name', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now());
