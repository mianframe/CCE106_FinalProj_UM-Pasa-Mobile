-- Migration: 20261010040000_safety_and_cancellation.sql
-- Description: Locks listing edit/delete during active transactions, enables
-- buyer/seller/admin transaction cancellation/no-show handling with automatic
-- listing availability release, and protects double request concurrency.

-- 1. Upgraded save_listing: prevents edits while item has active pending/approved transactions
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
      daily_rental_rate, rental_duration_days, condition, price, status,
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
      'available', case when v_admin then 'approved' else 'pending' end, null
    ) returning id into v_id;
  else
    perform 1 from public.items i
    where i.id = p_item_id and (i.seller_id = v_uid or v_admin)
    for update;
    if not found then raise exception 'Listing not found or permission denied' using errcode = '42501'; end if;

    -- Safety lock: disallow modifying listing while active transactions exist
    if exists (
      select 1 from public.transactions
      where item_id = p_item_id and status in ('pending', 'approved')
    ) then
      raise exception 'Cannot modify listing while an exchange is currently pending or approved';
    end if;

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
      moderation_status = case when v_admin then 'approved' else 'pending' end,
      rejection_reason = null
    where id = p_item_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_listing(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_listing(uuid, jsonb) to authenticated;

-- 2. Upgraded delete_listing: locks against deleting items with active transactions
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
  select * into v_item from public.items i
    where i.id = p_item_id and (i.seller_id = v_uid or private.is_admin())
    for update;
  if not found then raise exception 'Listing not found or permission denied' using errcode = '42501'; end if;

  if exists (
    select 1 from public.transactions
    where item_id = v_item.id and status in ('pending', 'approved')
  ) then
    raise exception 'Cannot delete or archive listing while an active exchange is pending or approved';
  end if;

  if exists (select 1 from public.transactions where item_id = v_item.id) then
    update public.items set archived_at = coalesce(archived_at, now()) where id = v_item.id;
    return true;
  end if;
  delete from public.items where id = v_item.id;
  return true;
end;
$$;

revoke all on function public.delete_listing(uuid) from public, anon, authenticated;
grant execute on function public.delete_listing(uuid) to authenticated;

-- 3. Upgraded reject_transaction: handles rejection and cancellation for buyer, seller, and admin
create or replace function public.reject_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tx public.transactions%rowtype;
  v_item public.items%rowtype;
  v_reason_title text;
begin
  if v_uid is null then raise exception 'Sign in to cancel or reject a transaction' using errcode = '42501'; end if;
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.seller_id <> v_uid and v_tx.buyer_id <> v_uid and not private.is_admin() then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  if v_tx.status not in ('pending', 'approved') then
    raise exception 'Only pending or approved transactions can be cancelled or rejected';
  end if;

  update public.transactions set status = 'rejected' where id = v_tx.id;
  select * into v_item from public.items where id = v_tx.item_id;

  -- Release item back to available if no other active transactions exist
  if not exists (
    select 1 from public.transactions
    where item_id = v_item.id and id <> v_tx.id and status in ('pending', 'approved')
  ) then
    perform set_config('umpasa.transaction_workflow', 'on', true);
    update public.items set status = 'available' where id = v_item.id;
  end if;

  -- Notify the corresponding party
  if v_uid = v_tx.seller_id then
    insert into public.notifications (user_id, message, type, related_type, related_id)
    values (v_tx.buyer_id, 'Your transaction request for ' || v_item.title || ' was rejected/cancelled by the seller.', 'rejection', 'transaction', v_tx.id);
  elsif v_uid = v_tx.buyer_id then
    insert into public.notifications (user_id, message, type, related_type, related_id)
    values (v_tx.seller_id, 'The buyer cancelled their request for ' || v_item.title || '.', 'rejection', 'transaction', v_tx.id);
  else
    insert into public.notifications (user_id, message, type, related_type, related_id)
    values (v_tx.buyer_id, 'Transaction for ' || v_item.title || ' was cancelled by an administrator.', 'rejection', 'transaction', v_tx.id);
    insert into public.notifications (user_id, message, type, related_type, related_id)
    values (v_tx.seller_id, 'Transaction for ' || v_item.title || ' was cancelled by an administrator.', 'rejection', 'transaction', v_tx.id);
  end if;

  return v_tx.id;
end;
$$;

revoke all on function public.reject_transaction(uuid) from public, anon, authenticated;
grant execute on function public.reject_transaction(uuid) to authenticated;
