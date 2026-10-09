import { supabase } from '../supabase';
import type { ItemRow, ProfileRow, RatingRow, TransactionRow } from '../database.types';
import { checked, currentAuthUser, profilesById, toUMUser, type UMUser } from './common';
import type { Item } from './items';

export type Rating = RatingRow;
export type Transaction = TransactionRow & {
  item?: Item;
  buyer?: UMUser;
  seller?: UMUser;
  ratings?: Rating[];
  payment_proof: string | null;
};

async function enrich(rows: TransactionRow[]): Promise<Transaction[]> {
  if (!rows.length) return [];
  const itemIds = [...new Set(rows.map((row) => row.item_id))];
  const { data: itemsData, error: itemsError } = await supabase.from('items').select('*').in('id', itemIds);
  if (itemsError) throw new Error(itemsError.message);
  const items = (itemsData ?? []) as ItemRow[];
  const people = await profilesById(rows.flatMap((row) => [row.buyer_id, row.seller_id, ...items.map((item) => item.seller_id)]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const { data: ratingsData, error: ratingsError } = await supabase.from('ratings').select('*').in('transaction_id', rows.map((row) => row.id));
  if (ratingsError) throw new Error(ratingsError.message);
  const ratingsByTransaction = new Map<string, Rating[]>();
  for (const rating of (ratingsData ?? []) as RatingRow[]) {
    const existing = ratingsByTransaction.get(rating.transaction_id) ?? [];
    existing.push(rating);
    ratingsByTransaction.set(rating.transaction_id, existing);
  }
  const user = (profile: ProfileRow | undefined): UMUser | undefined => profile ? toUMUser(profile) : undefined;
  return rows.map((row) => {
    const itemRow = itemById.get(row.item_id);
    const seller = itemRow ? people.get(itemRow.seller_id) : undefined;
    const imageUrl = itemRow?.image_path
      ? (itemRow.image_path.startsWith('http') ? itemRow.image_path : supabase.storage.from('items').getPublicUrl(itemRow.image_path).data.publicUrl)
      : null;
    const item: Item | undefined = itemRow ? {
      ...itemRow,
      user_id: itemRow.seller_id,
      image: imageUrl,
      user: user(seller),
    } : undefined;
    return {
      ...row,
      payment_proof: row.payment_proof_path,
      item,
      buyer: user(people.get(row.buyer_id)),
      seller: user(people.get(row.seller_id)),
      ratings: ratingsByTransaction.get(row.id) ?? [],
    };
  });
}

async function one(id: string): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').select('*').eq('id', id).maybeSingle();
  const row = checked(data as TransactionRow | null, error, 'Transaction not found or you are not a participant.');
  return (await enrich([row]))[0];
}

export const transactions = {
  async list(): Promise<Transaction[]> {
    const user = await currentAuthUser();
    const all: TransactionRow[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('transactions').select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as TransactionRow[];
      all.push(...page);
      if (page.length < pageSize) break;
    }
    return enrich(all);
  },
  get: one,
  async request(itemId: string, values: { payment_method: string; other_payment_method?: string; rental_duration_days?: number }): Promise<Transaction> {
    if (!values.payment_method) throw new Error('Choose an accepted payment method.');
    const { data, error } = await supabase.rpc('request_item', {
      p_item_id: itemId,
      p_payment_method: values.payment_method,
      p_other_payment_method: values.other_payment_method?.trim() || null,
      p_rental_duration_days: values.rental_duration_days ?? null,
    });
    return one(checked(data, error, 'The transaction request was not created.'));
  },
  async approve(id: string, meetup_location: string, meetup_time: string): Promise<Transaction> {
    if (!meetup_location.trim()) throw new Error('Enter a meetup location.');
    const date = new Date(meetup_time.includes('T') ? meetup_time : meetup_time.replace(' ', 'T'));
    if (Number.isNaN(date.getTime()) || date <= new Date()) throw new Error('Choose a valid meetup time in the future.');
    const { error } = await supabase.rpc('approve_transaction', {
      p_transaction_id: id,
      p_meetup_location: meetup_location.trim(),
      p_meetup_time: date.toISOString(),
    });
    if (error) throw new Error(error.message);
    return one(id);
  },
  async reject(id: string): Promise<Transaction> {
    const { error } = await supabase.rpc('reject_transaction', { p_transaction_id: id });
    if (error) throw new Error(error.message);
    return one(id);
  },
  async complete(id: string): Promise<Transaction> {
    const { error } = await supabase.rpc('complete_transaction', { p_transaction_id: id });
    if (error) throw new Error(error.message);
    return one(id);
  },
  async rate(id: string, rating: number, comment: string): Promise<Rating> {
    const { data, error } = await supabase.rpc('rate_transaction', {
      p_transaction_id: id,
      p_rating: rating,
      p_comment: comment.trim() || null,
    });
    const ratingId = checked(data, error, 'Rating was not saved.');
    const { data: saved, error: fetchError } = await supabase.from('ratings').select('*').eq('id', ratingId).single();
    return checked(saved as RatingRow | null, fetchError, 'Rating was saved but could not be loaded.');
  },
};

export const adminTransactions = {
  async list(): Promise<Transaction[]> {
    const { data, error } = await supabase.rpc('admin_list_transactions' as any);
    if (!error && data) {
      return enrich(data as unknown as TransactionRow[]);
    }
    const rows: TransactionRow[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data: pageData, error: pageError } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
      if (pageError) throw new Error(pageError.message);
      const page = (pageData ?? []) as TransactionRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return enrich(rows);
  },
};
