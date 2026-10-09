import { supabase } from '../supabase';
import type { ItemRow, ProfileRow } from '../database.types';
import { checked, currentAuthUser, profilesById, toUMUser, type UMUser } from './common';

export type Item = ItemRow & {
  user_id: string;
  image: string | null;
  user?: UMUser;
};

export type ItemFilters = {
  q?: string;
  sort?: string;
  category?: string;
  listing_type?: string;
  department?: string;
  program?: string;
  condition?: string;
  course_code?: string;
  min_price?: number | string;
  max_price?: number | string;
};

function mapItem(row: ItemRow, profiles: Map<string, ProfileRow>): Item {
  const seller = profiles.get(row.seller_id);
  const imageUrl = row.image_path
    ? (row.image_path.startsWith('http') ? row.image_path : supabase.storage.from('items').getPublicUrl(row.image_path).data.publicUrl)
    : null;
  return {
    ...row,
    user_id: row.seller_id,
    image: imageUrl,
    user: seller ? toUMUser(seller) : undefined,
  };
}

async function mapItems(rows: ItemRow[]): Promise<Item[]> {
  const profiles = await profilesById(rows.map((row) => row.seller_id));
  return rows.map((row) => mapItem(row, profiles));
}

function buildListing(values: Record<string, unknown>): Omit<ItemRow, 'id' | 'seller_id' | 'status' | 'moderation_status' | 'rejection_reason' | 'archived_at' | 'created_at' | 'updated_at'> {
  const rawCategory = values.category === '__custom' ? values.custom_category : values.category;
  const title = String(values.title ?? '').trim();
  const category = String(rawCategory ?? '').trim();
  const description = String(values.description ?? '').trim();
  const courseCode = String(values.course_code ?? '').trim().toUpperCase();
  const listingType = values.listing_type;
  const methods = Array.isArray(values.accepted_payment_methods)
    ? [...new Set(values.accepted_payment_methods.filter((value): value is string => typeof value === 'string'))]
    : [];
  const allowedMethods = ['gcash', 'maya', 'bank_transfer', 'cash_on_pickup', 'other'];
  if (!title || title.length > 255) throw new Error('Enter a title of 1–255 characters.');
  if (!category || category.length > 100) throw new Error('Enter a category of 1–100 characters.');
  if (description.length < 10 || description.length > 5000) throw new Error('Description must be between 10 and 5,000 characters.');
  if (!courseCode || courseCode.length > 20) throw new Error('Enter a course code of 1–20 characters.');
  if (listingType !== 'sell' && listingType !== 'rent') throw new Error('Choose sale or rental.');
  if (!methods.length || methods.some((method) => !allowedMethods.includes(method))) throw new Error('Select at least one valid payment method.');
  if (!['new', 'like_new', 'good', 'fair', 'poor'].includes(String(values.condition))) throw new Error('Choose a valid item condition.');
  if (!String(values.department ?? '').trim()) throw new Error('Choose a department.');

  const numberOrNull = (value: unknown): number | null => value === '' || value === null || value === undefined ? null : Number(value);
  const price = numberOrNull(values.price);
  const minimumDays = numberOrNull(values.minimum_rental_days);
  const maximumDays = numberOrNull(values.maximum_rental_days);
  const dailyRate = numberOrNull(values.daily_rental_rate);
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Enter a valid non-negative price.');
  if (listingType === 'rent') {
    if (!minimumDays || minimumDays < 1 || minimumDays > 365) throw new Error('Minimum rental days must be between 1 and 365.');
    if (!maximumDays || maximumDays < minimumDays || maximumDays > 365) throw new Error('Maximum rental days must be between the minimum and 365.');
    if (dailyRate === null || !Number.isFinite(dailyRate) || dailyRate < 0) throw new Error('Enter a valid daily rental rate.');
  }

  return {
    title,
    category,
    description,
    department: String(values.department).trim(),
    program: String(values.program ?? '').trim() || null,
    course_code: courseCode,
    listing_type: listingType,
    accepted_payment_methods: methods,
    minimum_rental_days: listingType === 'rent' ? minimumDays : null,
    maximum_rental_days: listingType === 'rent' ? maximumDays : null,
    daily_rental_rate: listingType === 'rent' ? dailyRate : null,
    rental_duration_days: listingType === 'rent' ? maximumDays : null,
    condition: String(values.condition) as ItemRow['condition'],
    price: listingType === 'rent' ? dailyRate : price,
    image_path: values.image_path ? String(values.image_path).trim() : null,
  };
}

async function allRows(filters: ItemFilters, ownOnly: boolean): Promise<Item[]> {
  const rows: ItemRow[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from('items').select('*');
    if (ownOnly) {
      const user = await currentAuthUser();
      query = query.eq('seller_id', user.id).is('archived_at', null);
    } else {
      query = query.in('status', ['available', 'pending']).eq('moderation_status', 'approved').is('archived_at', null);
    }
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.listing_type) query = query.eq('listing_type', filters.listing_type as ItemRow['listing_type']);
    if (filters.department) query = query.eq('department', filters.department);
    if (filters.program) query = query.eq('program', filters.program);
    if (filters.condition) query = query.eq('condition', filters.condition as ItemRow['condition']);
    if (filters.course_code) query = query.ilike('course_code', `%${filters.course_code.trim()}%`);
    if (filters.min_price !== undefined && filters.min_price !== '') query = query.gte('price', Number(filters.min_price));
    if (filters.max_price !== undefined && filters.max_price !== '') query = query.lte('price', Number(filters.max_price));
    if (filters.q?.trim()) {
      const term = filters.q.trim().replace(/[,%()]/g, ' ');
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,course_code.ilike.%${term}%`);
    }
    if (filters.sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (filters.sort === 'price_low') query = query.order('price', { ascending: true, nullsFirst: false });
    else if (filters.sort === 'price_high') query = query.order('price', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as ItemRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return mapItems(rows);
}

export const marketplace = {
  list: (filters?: ItemFilters) => allRows(filters ?? {}, false),
  mine: () => allRows({}, true),
  async get(id: string): Promise<Item> {
    const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle();
    const row = checked(data as ItemRow | null, error, 'This listing is unavailable or you do not have permission to view it.');
    return (await mapItems([row]))[0];
  },
  async save(values: Record<string, unknown>, id?: string): Promise<Item> {
    const payload = buildListing(values);
    const { data: itemId, error } = await supabase.rpc('save_listing', {
      p_item_id: id ?? null,
      p_data: payload,
    });
    const savedId = checked(itemId, error, 'Listing was not saved.');
    return this.get(savedId);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_listing', { p_item_id: id });
    if (error) throw new Error(error.message);
  },
  async markSold(id: string): Promise<void> {
    const { error } = await supabase.rpc('mark_listing_sold', { p_item_id: id });
    if (error) throw new Error(error.message);
  },
};

export const adminItems = {
  async list(): Promise<Item[]> {
    const { data, error } = await supabase.rpc('admin_list_items' as any);
    if (!error && data) {
      return mapItems(data as unknown as ItemRow[]);
    }
    const rows: ItemRow[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data: pageData, error: pageError } = await supabase.from('items').select('*').is('archived_at', null)
        .order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
      if (pageError) throw new Error(pageError.message);
      const page = (pageData ?? []) as ItemRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return mapItems(rows);
  },
  async moderate(id: string, status: 'approved' | 'rejected', reason?: string): Promise<Item> {
    const { data, error } = await supabase.rpc('set_item_moderation', {
      p_item_id: id,
      p_status: status,
      p_rejection_reason: reason?.trim() || null,
    });
    const itemId = checked(data, error, 'Listing could not be moderated.');
    return marketplace.get(itemId);
  },
  remove: (id: string) => marketplace.remove(id),
};
