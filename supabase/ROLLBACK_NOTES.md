# UM-Pasa Database Migrations & Rollback Notes
**Generated:** October 6, 2026  
**Purpose:** Pre-demo security hardening, procedure synchronization, storage lockdown, and write policy removal.

---

## Pre-Flight Check (Step 0) - Completed

### 1. Terminal Client-Side Mutation Scan
Command executed:
```bash
grep -rn "\.insert(\|\.update(\|\.delete(\|\.upsert(" src App.tsx
```
Output:
- `src/auth/AuthContext.tsx:178`: `supabase.from('profiles').update(...)` (full_name, student_number, department, program)
- `src/services/profiles.ts:18`: `supabase.from('profiles').update(...)` (profile updates)
- `src/services/notifications.ts:17`: `supabase.from('notifications').update({ is_read: true })`
- `src/services/notifications.ts:23`: `supabase.from('notifications').update({ is_read: true })`
- `src/services/storage.ts:44`: `supabase.from('transactions').update({ payment_proof_path, payment_proof_uploaded_at })`

**Verdict:** Confirmed. The mobile client performs zero direct inserts or updates on `messages`, `conversations`, or `ratings`, and zero direct inserts on `notifications`. All other writes strictly use PostgreSQL RPCs (`save_listing`, `request_item`, `approve_transaction`, `complete_transaction`, `rate_transaction`, `send_message`, `respond_to_meetup_proposal`).

---

## Step 1: Procedures Synchronization (Phase 26 & Phase 27)

### Why this is run:
Fixes the live error: `"Could not find the function public.public_profile_reviews(p_user_id) in the schema cache"`, enables the "Mark as sold" feature for sellers, installs the automatic admin notification trigger for pending listings, and synchronizes accepted meetup proposals into the `public.transactions` schedule.

### Forward Migration:
Execute `supabase/phase26_listing_sold.sql`, followed by `supabase/phase27_workflows_and_reviews.sql` in the Supabase SQL Editor.

#### Combined Script:
```sql
begin;

-- Phase 26: Mark listing sold
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

-- Phase 27: Admin listing notifications trigger
create or replace function public.notify_admin_listing_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_admin record;
begin
  if new.moderation_status = 'pending'
     and (tg_op = 'INSERT' or old.moderation_status is distinct from 'pending') then
    for v_admin in select p.id from public.profiles p where p.role = 'admin' loop
      insert into public.notifications (user_id, message, type, related_type, related_id)
      values (v_admin.id, 'New listing awaiting review: ' || new.title, 'listing_review', 'item', new.id);
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_admin_listing_review() from public, anon, authenticated;
drop trigger if exists items_notify_admin_listing_review on public.items;
create trigger items_notify_admin_listing_review
after insert or update of moderation_status on public.items
for each row execute function public.notify_admin_listing_review();

-- Phase 27: Public profile reviews
create or replace function public.public_profile_reviews(p_user_id uuid)
returns table (
  review_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  reviewer_name text,
  item_title text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.comment, r.created_at, reviewer.full_name,
         (select i.title from public.transactions t join public.items i on i.id = t.item_id where t.id = r.transaction_id)
  from public.ratings r
  join public.profiles reviewer on reviewer.id = r.reviewer_id
  where r.reviewed_user_id = p_user_id
  order by r.created_at desc;
$$;
revoke all on function public.public_profile_reviews(uuid) from public, anon;
grant execute on function public.public_profile_reviews(uuid) to authenticated;

-- Phase 27: Meetup proposal acceptance with transaction schedule sync
create or replace function public.respond_to_meetup_proposal(p_message_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_message public.messages%rowtype;
  v_conversation public.conversations%rowtype;
  v_name text;
  v_transaction_id uuid;
begin
  if v_uid is null then raise exception 'Sign in to respond to a meetup proposal' using errcode = '42501'; end if;
  select * into v_message from public.messages where id = p_message_id for update;
  if not found or v_message.type <> 'meetup_proposal' or v_message.proposal_status <> 'pending' then
    raise exception 'This meetup proposal is no longer pending';
  end if;
  select * into v_conversation from public.conversations where id = v_message.conversation_id for update;
  if v_uid = v_message.sender_id or v_uid not in (v_conversation.starter_id, v_conversation.recipient_id) then
    raise exception 'Only the other conversation participant can respond' using errcode = '42501';
  end if;

  if p_accept and v_conversation.item_id is not null then
    update public.transactions t
       set meetup_location = v_message.meetup_location,
           meetup_time = v_message.meetup_time,
           rental_due_date = case when t.rental_duration_days is not null
             then (v_message.meetup_time::date + t.rental_duration_days) else t.rental_due_date end,
           updated_at = now()
     where t.id = (
       select candidate.id from public.transactions candidate
       where candidate.item_id = v_conversation.item_id
         and candidate.status in ('pending','approved')
         and ((candidate.buyer_id = v_conversation.starter_id and candidate.seller_id = v_conversation.recipient_id)
           or (candidate.buyer_id = v_conversation.recipient_id and candidate.seller_id = v_conversation.starter_id))
       order by candidate.created_at desc limit 1 for update
     )
     returning t.id into v_transaction_id;
  end if;

  update public.messages
     set proposal_status = case when p_accept then 'accepted' else 'declined' end,
         meta = case when p_accept and v_transaction_id is not null
           then coalesce(meta, '{}'::jsonb) || jsonb_build_object('transaction_id', v_transaction_id)
           else meta end
   where id = v_message.id;
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
revoke all on function public.respond_to_meetup_proposal(uuid, boolean) from public, anon, authenticated;
grant execute on function public.respond_to_meetup_proposal(uuid, boolean) to authenticated;

commit;
```

### Rollback Script for Step 1:
```sql
begin;
-- Drop Phase 26
drop function if exists public.mark_listing_sold(uuid);

-- Drop Phase 27 trigger and reviews
drop trigger if exists items_notify_admin_listing_review on public.items;
drop function if exists public.notify_admin_listing_review();
drop function if exists public.public_profile_reviews(uuid);

-- Restore baseline version of respond_to_meetup_proposal from complete_setup.sql
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
revoke all on function public.respond_to_meetup_proposal(uuid, boolean) from public, anon, authenticated;
grant execute on function public.respond_to_meetup_proposal(uuid, boolean) to authenticated;

commit;
```

---

## Step 2: Storage Lockdown (Migration 01)

### Why this is run:
Closes the public storage leak on `payment-proofs` where any unauthenticated actor using the bundled anon key could list and download students' payment receipts. Drops wide update/upload policies that allowed arbitrary authenticated users to overwrite other users' uploaded receipts.

### Forward Migration (Migration 01):
```sql
begin;
update storage.buckets set public = false where id = 'payment-proofs';
drop policy if exists "Public can read storage objects" on storage.objects;
drop policy if exists "Authenticated users can update storage" on storage.objects;
drop policy if exists "Authenticated users can upload item images" on storage.objects;
commit;
```

### Rollback Script for Step 2:
```sql
begin;
update storage.buckets set public = true where id = 'payment-proofs';
create policy "Public can read storage objects" on storage.objects for select to anon, authenticated
  using (bucket_id = any (array['item-images','payment-proofs','avatars']));
create policy "Authenticated users can update storage" on storage.objects for update to authenticated
  using (bucket_id = any (array['item-images','payment-proofs','avatars']));
create policy "Authenticated users can upload item images" on storage.objects for insert to authenticated
  with check (bucket_id = any (array['item-images','payment-proofs','avatars']));
commit;
```

### What Buyer, Seller, and Admin See:
- **Buyer:** Uploads proof on `TransactionScreen` -> App generates a signed URL using `supabase.storage.from('payment-proofs').createSignedUrl(path, 3600)`. Because `can_access_payment_proof` checks `t.buyer_id = auth.uid()`, permission succeeds. The buyer **sees the receipt image**.
- **Seller:** Opens `TransactionScreen` -> App generates a signed URL for the receipt. Because `can_access_payment_proof` checks `t.seller_id = auth.uid()`, permission succeeds. The seller **sees the receipt image**.
- **Admin:** In `complete_setup.sql:919`, `can_access_payment_proof` explicitly includes `or private.is_admin()`. When an admin opens the transaction or inspects the receipt, permission succeeds. The admin **sees the receipt image**.
- **Anonymous / Incognito User:** Opening the raw URL in a private browser without a session or with an expired token results in a `404 / 403 Forbidden` error.

---

## Step 3: Drop Unused Direct Write Policies (Migration 02)

### Why this is run:
Removes dangerous, obsolete policies that allowed clients to bypass RPC validations to inject fake ratings, edit chat messages, create arbitrary conversations, or spoof system notifications.

### Forward Migration (Migration 02):
```sql
begin;
drop policy if exists "authenticated can insert notifications" on public.notifications;
drop policy if exists "participants can update messages" on public.messages;
drop policy if exists "senders can insert messages" on public.messages;
drop policy if exists "participants and admin can update conversations" on public.conversations;
drop policy if exists "users can create conversations" on public.conversations;
drop policy if exists "reviewers can insert ratings" on public.ratings;
commit;
```

### Rollback Script for Step 3:
```sql
begin;
create policy "authenticated can insert notifications" on public.notifications for insert to authenticated with check (true);
create policy "participants can update messages" on public.messages for update to authenticated
  using (exists (select 1 from public.conversations c where c.id = messages.conversation_id
    and (c.starter_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))));
create policy "senders can insert messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()));
create policy "participants and admin can update conversations" on public.conversations for update to authenticated
  using (starter_id = (select auth.uid()) or recipient_id = (select auth.uid()) or private.is_admin());
create policy "users can create conversations" on public.conversations for insert to authenticated
  with check (starter_id = (select auth.uid()) or private.is_admin());
create policy "reviewers can insert ratings" on public.ratings for insert to authenticated
  with check (reviewer_id = (select auth.uid()));
commit;
```

---

## Step 4: Transactions Write Lockdown (Migration 03 - Post-Task B)

> [!WARNING]
> DO NOT RUN BEFORE TASK B (`submit_payment_proof` RPC implementation). The app currently uses a direct `.from('transactions').update(...)` in `src/services/storage.ts`.

### Forward Migration (Migration 03):
```sql
begin;
drop policy if exists "buyers can insert transactions" on public.transactions;
drop policy if exists "participants and admin can update transactions" on public.transactions;
commit;
```

### Rollback Script for Step 4:
```sql
begin;
create policy "buyers can insert transactions" on public.transactions for insert to authenticated
  with check (buyer_id = (select auth.uid()) or private.is_admin());
create policy "participants and admin can update transactions" on public.transactions for update to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or private.is_admin());
commit;
```

---

## Step 5: Proof that Profiles Role Escalation is Blocked

Verification query:
```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','<STUDENT-UUID>','role','authenticated')::text, true);
update public.profiles set role = 'admin' where id = '<STUDENT-UUID>';
rollback;
```
Expected output:
`ERROR: 42501: Only an administrator can change a profile role` (or column update privilege denied).
