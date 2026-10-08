import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import type { ConversationRow, ItemRow, MessageRow, ProfileRow } from '../database.types';
import { checked, currentAuthUser, profilesById, toUMUser, type UMUser } from './common';
import type { Item } from './items';

const DELETED_CONVERSATIONS_KEY_PREFIX = '@umpasa_deleted_conversations_';

async function getDeletedConversationIds(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(`${DELETED_CONVERSATIONS_KEY_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

async function markConversationDeletedLocally(userId: string, conversationId: string): Promise<void> {
  try {
    const ids = await getDeletedConversationIds(userId);
    ids.add(conversationId);
    await AsyncStorage.setItem(
      `${DELETED_CONVERSATIONS_KEY_PREFIX}${userId}`,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // ignore
  }
}

export type Message = MessageRow & { user_id: string; user?: UMUser };
export type Conversation = ConversationRow & {
  item?: Item;
  starter?: UMUser;
  recipient?: UMUser;
  latest_message?: Message;
  messages?: Message[];
};

function mapItem(row: ItemRow | undefined, people: Map<string, ProfileRow>): Item | undefined {
  if (!row) return undefined;
  const seller = people.get(row.seller_id);
  const imageUrl = row.image_path
    ? (row.image_path.startsWith('http') ? row.image_path : supabase.storage.from('items').getPublicUrl(row.image_path).data.publicUrl)
    : null;
  return { ...row, user_id: row.seller_id, image: imageUrl, user: seller ? toUMUser(seller) : undefined };
}

function mapMessage(row: MessageRow, people: Map<string, ProfileRow>): Message {
  const profile = people.get(row.sender_id);
  return {
    ...row,
    user_id: row.sender_id,
    user: profile ? toUMUser(profile) : undefined,
  };
}

export const messaging = {
  async list(): Promise<Conversation[]> {
    const user = await currentAuthUser();
    const deletedIds = await getDeletedConversationIds(user.id);
    const { data: conversationsData, error } = await supabase.from('conversations').select('*')
      .or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    const rawRows = (conversationsData ?? []) as ConversationRow[];
    const rows = rawRows.filter((r) => !deletedIds.has(r.id));
    if (!rows.length) return [];
    const [itemsResult, people] = await Promise.all([
      supabase.from('items').select('*').in('id', rows.flatMap((row) => row.item_id ? [row.item_id] : [])),
      profilesById(rows.flatMap((row) => [row.starter_id, row.recipient_id])),
    ]);
    if (itemsResult.error) throw new Error(itemsResult.error.message);
    const items = new Map(((itemsResult.data ?? []) as ItemRow[]).map((row) => [row.id, row]));
    const latestRows = await Promise.all(rows.map(async (row) => {
      const { data, error: messageError } = await supabase.from('messages').select('*')
        .eq('conversation_id', row.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (messageError) throw new Error(messageError.message);
      return data as MessageRow | null;
    }));
    const senderProfiles = await profilesById(latestRows.flatMap((row) => row ? [row.sender_id] : []));
    const allPeople = new Map([...people, ...senderProfiles]);
    return rows.map((row, index) => ({
      ...row,
      item: mapItem(row.item_id ? items.get(row.item_id) : undefined, allPeople),
      starter: people.get(row.starter_id) ? toUMUser(people.get(row.starter_id) as ProfileRow) : undefined,
      recipient: people.get(row.recipient_id) ? toUMUser(people.get(row.recipient_id) as ProfileRow) : undefined,
      latest_message: latestRows[index] ? mapMessage(latestRows[index] as MessageRow, allPeople) : undefined,
    }));
  },
  async get(id: string): Promise<Conversation> {
    const { data, error } = await supabase.from('conversations').select('*').eq('id', id).maybeSingle();
    const conversation = checked(data as ConversationRow | null, error, 'Conversation not found or access denied.');
    const [messagesResult, itemResult, people] = await Promise.all([
      supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }),
      conversation.item_id
        ? supabase.from('items').select('*').eq('id', conversation.item_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      profilesById([conversation.starter_id, conversation.recipient_id]),
    ]);
    if (messagesResult.error) throw new Error(messagesResult.error.message);
    if (itemResult.error) throw new Error(itemResult.error.message);
    const messages = (messagesResult.data ?? []) as MessageRow[];
    const senderProfiles = await profilesById(messages.map((message) => message.sender_id));
    const allPeople = new Map([...people, ...senderProfiles]);
    return {
      ...conversation,
      item: mapItem(itemResult.data as ItemRow | null ?? undefined, allPeople),
      starter: people.get(conversation.starter_id) ? toUMUser(people.get(conversation.starter_id) as ProfileRow) : undefined,
      recipient: people.get(conversation.recipient_id) ? toUMUser(people.get(conversation.recipient_id) as ProfileRow) : undefined,
      messages: messages.map((message) => mapMessage(message, allPeople)),
    };
  },
  async send(values: {
    conversation_id?: string;
    recipient_id?: string;
    item_id?: string;
    body?: string;
    type?: 'text' | 'meetup_proposal';
    meetup_location?: string;
    meetup_time?: string;
  }): Promise<Message & { conversation_id: string }> {
    const type = values.type ?? 'text';
    const body = values.body?.trim() || (type === 'meetup_proposal' ? 'Meetup proposal sent.' : '');
    if (type === 'text' && (!body || body.length > 1000)) throw new Error('Message must be between 1 and 1,000 characters.');
    if (type === 'meetup_proposal') {
      if (!values.meetup_location?.trim() || values.meetup_location.trim().length > 255) throw new Error('Enter a meetup location of up to 255 characters.');
      const proposed = values.meetup_time ? new Date(values.meetup_time.includes('T') ? values.meetup_time : values.meetup_time.replace(' ', 'T')) : null;
      if (!proposed || Number.isNaN(proposed.getTime()) || proposed <= new Date()) throw new Error('Choose a valid meetup time in the future.');
    }
    const { data: messageId, error } = await supabase.rpc('send_message', {
      p_conversation_id: values.conversation_id ?? null,
      p_recipient_id: values.recipient_id ?? null,
      p_item_id: values.item_id ?? null,
      p_body: body || null,
      p_type: type,
      p_meetup_location: values.meetup_location?.trim() || null,
      p_meetup_time: values.meetup_time
        ? new Date(values.meetup_time.includes('T') ? values.meetup_time : values.meetup_time.replace(' ', 'T')).toISOString()
        : null,
    });
    const savedId = checked(messageId, error, 'Message was not sent.');
    const { data: saved, error: fetchError } = await supabase.from('messages').select('*').eq('id', savedId).single();
    const row = checked(saved as MessageRow | null, fetchError, 'Message was sent but could not be loaded.');
    const current = await currentAuthUser();
    const profiles = await profilesById([current.id]);
    return { ...mapMessage(row, profiles), conversation_id: row.conversation_id };
  },
  async respond(id: string, accept: boolean): Promise<Message> {
    const { error } = await supabase.rpc('respond_to_meetup_proposal', { p_message_id: id, p_accept: accept });
    if (error) throw new Error(error.message);
    const { data, error: fetchError } = await supabase.from('messages').select('*').eq('id', id).single();
    const row = checked(data as MessageRow | null, fetchError, 'Meetup response could not be loaded.');
    const people = await profilesById([row.sender_id]);
    return mapMessage(row, people);
  },
  async markRead(id: string): Promise<void> {
    const user = await currentAuthUser();
    try {
      await (supabase.rpc as any)('mark_conversation_read', { p_conversation_id: id });
    } catch {
      // ignore
    }
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', id)
        .neq('sender_id', user.id)
        .is('read_at', null);
    } catch {
      // ignore
    }
  },
  async delete(id: string): Promise<void> {
    const user = await currentAuthUser();
    // 1. Immediately store in local storage so it vanishes forever from this device
    await markConversationDeletedLocally(user.id, id);

    // 2. Perform remote Supabase deletion
    const { error: rpcError } = await supabase.rpc('delete_conversation', { p_conversation_id: id });
    if (rpcError) {
      // 3. Fallback direct delete
      try {
        await supabase.from('messages').delete().eq('conversation_id', id);
        await supabase.from('conversations').delete().eq('id', id);
      } catch {
        // proceed
      }
    }
  },
};
