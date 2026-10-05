import { supabase } from '../supabase';
import type { Item } from './items';
import { adminItems } from './items';
import type { Transaction } from './transactions';
import { adminTransactions } from './transactions';

export type AdminUser = { id: string; name: string; email: string; role: 'student' | 'admin'; student_number: string | null; created_at: string };

export const admin = {
  async users(): Promise<AdminUser[]> {
    const { data, error } = await supabase.rpc('admin_list_profiles');
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.full_name,
      email: row.email,
      role: row.role,
      student_number: row.student_number,
      created_at: row.created_at,
    }));
  },
  items: (): Promise<Item[]> => adminItems.list(),
  transactions: (): Promise<Transaction[]> => adminTransactions.list(),
  moderate: (id: string, action: 'approve' | 'reject', rejection_reason?: string): Promise<Item> =>
    adminItems.moderate(id, action === 'approve' ? 'approved' : 'rejected', rejection_reason),
  removeItem: (id: string): Promise<void> => adminItems.remove(id),
};
