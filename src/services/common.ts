import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { ProfileRow } from '../database.types';

export type UMUser = { id: string; name: string; email: string; role: 'student' | 'admin' };

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    if (lower.includes('row-level security') || lower.includes('permission denied')) return 'You do not have permission to perform this action.';
    if (lower.includes('network') || lower.includes('fetch')) return 'Could not reach Supabase. Check your internet connection and Supabase project settings.';
    if (lower.includes('duplicate key')) return 'This record already exists.';
    return message;
  }
  return fallback;
}

export function checked<T>(data: T | null, error: { message: string } | null, missing = 'The requested record is unavailable.'): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error(missing);
  return data;
}

export function toUMUser(profile: ProfileRow, email = ''): UMUser {
  return { id: profile.id, name: profile.full_name, email, role: profile.role };
}

export async function profilesById(ids: string[]): Promise<Map<string, ProfileRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await supabase.rpc('public_profile_summaries', { p_ids: unique });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((profile) => [profile.id, {
    ...profile,
    student_number: null,
    department: null,
    program: null,
    created_at: '',
    updated_at: '',
  }]));
}

export async function currentAuthUser(): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign in to continue.');
  return data.user;
}
