-- Migration: 20261010030000_admin_visibility_and_rls.sql
-- Description: Provides SECURITY DEFINER functions for administrative visibility
-- into all campus transactions and listings, and allows administrators to view
-- uploaded payment proof receipts from storage.

-- 1. admin_list_transactions: Returns all campus transactions for verified admins
create or replace function public.admin_list_transactions()
returns setof public.transactions
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return query
    select * from public.transactions
    order by created_at desc;
end;
$$;

revoke all on function public.admin_list_transactions() from public, anon, authenticated;
grant execute on function public.admin_list_transactions() to authenticated;

-- 2. admin_list_items: Returns all campus listings (including pending/rejected) for verified admins
create or replace function public.admin_list_items()
returns setof public.items
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return query
    select * from public.items
    where archived_at is null
    order by created_at desc;
end;
$$;

revoke all on function public.admin_list_items() from public, anon, authenticated;
grant execute on function public.admin_list_items() to authenticated;

-- 3. Update private.can_access_payment_proof to permit administrators
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

-- 4. Explicit storage policy granting administrators select access on payment-proofs
drop policy if exists payment_proofs_admin_select on storage.objects;
create policy payment_proofs_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and private.is_admin());
