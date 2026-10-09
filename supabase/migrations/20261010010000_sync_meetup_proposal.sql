-- Migration: 20261010010000_sync_meetup_proposal.sql
-- Description: Unifies chat meetup proposals with transactions.
-- When a meetup proposal is accepted in chat, the linked transaction (pending or approved)
-- has its meetup_location and meetup_time updated automatically, the rental_due_date recalculated
-- if applicable, and notifications are sent to the other party with clickable links.

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
  v_item_title text;
begin
  if v_uid is null then
    raise exception 'Sign in to respond to a meetup proposal' using errcode = '42501';
  end if;

  select * into v_message from public.messages where id = p_message_id for update;
  if not found or v_message.type <> 'meetup_proposal' or v_message.proposal_status <> 'pending' then
    raise exception 'This meetup proposal is no longer pending';
  end if;

  select * into v_conversation from public.conversations where id = v_message.conversation_id for update;
  if v_uid = v_message.sender_id or v_uid not in (v_conversation.starter_id, v_conversation.recipient_id) then
    raise exception 'Only the other conversation participant can respond' using errcode = '42501';
  end if;

  -- If accepted and conversation is tied to an item, synchronize the linked transaction
  if p_accept and v_conversation.item_id is not null then
    update public.transactions t
       set meetup_location = v_message.meetup_location,
           meetup_time = v_message.meetup_time,
           rental_due_date = case when t.rental_duration_days is not null and t.rental_duration_days > 0
             then (v_message.meetup_time::date + t.rental_duration_days)
             else t.rental_due_date end,
           updated_at = now()
     where t.id = (
       select candidate.id from public.transactions candidate
       where candidate.item_id = v_conversation.item_id
         and candidate.status in ('pending', 'approved')
         and ((candidate.buyer_id = v_conversation.starter_id and candidate.seller_id = v_conversation.recipient_id)
           or (candidate.buyer_id = v_conversation.recipient_id and candidate.seller_id = v_conversation.starter_id))
       order by candidate.created_at desc limit 1 for update
     )
     returning t.id into v_transaction_id;
  end if;

  -- Update proposal message status and transaction reference
  update public.messages
     set proposal_status = case when p_accept then 'accepted' else 'declined' end,
         meta = case when p_accept and v_transaction_id is not null
           then coalesce(meta, '{}'::jsonb) || jsonb_build_object('transaction_id', v_transaction_id)
           else meta end
   where id = v_message.id;

  -- Insert confirmation system message in the chat
  insert into public.messages (conversation_id, sender_id, type, body)
  values (
    v_conversation.id,
    v_uid,
    'system',
    case when p_accept
      then 'Meetup proposal accepted: ' || coalesce(v_message.meetup_location, 'Campus spot') || ' on ' || to_char(v_message.meetup_time at time zone 'Asia/Manila', 'Mon DD, YYYY at HH12:MI AM') || '.'
      else 'Meetup proposal declined.'
    end
  );

  update public.conversations set last_message_at = now() where id = v_conversation.id;

  -- Fetch profile name for friendly notification
  select full_name into v_name from public.profiles where id = v_uid;
  if v_conversation.item_id is not null then
    select title into v_item_title from public.items where id = v_conversation.item_id;
  end if;

  -- Send notification to the other party (the proposal sender)
  insert into public.notifications (user_id, message, type, related_type, related_id)
  values (
    v_message.sender_id,
    coalesce(v_name, 'A student') || case when p_accept
      then ' accepted your meetup proposal' || case when v_item_title is not null then ' for "' || v_item_title || '"' else '' end || '.'
      else ' declined your meetup proposal.'
    end,
    'meetup',
    case when v_transaction_id is not null then 'transaction' else 'conversation' end,
    case when v_transaction_id is not null then v_transaction_id else v_conversation.id end
  );

  return v_message.id;
end;
$$;

revoke all on function public.respond_to_meetup_proposal(uuid, boolean) from public, anon, authenticated;
grant execute on function public.respond_to_meetup_proposal(uuid, boolean) to authenticated;
