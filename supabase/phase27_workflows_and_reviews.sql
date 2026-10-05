-- Phase 27: admin listing alerts, public-safe chat profile reviews, and meetup schedule sync.
-- Apply after phase25_mobile_api.sql / phase26_listing_sold.sql.

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
