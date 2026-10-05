import { supabase } from '../supabase';
import type { NotificationRow } from '../database.types';
import { currentAuthUser } from './common';

export type Notice = NotificationRow;

export const notifications = {
  async list(): Promise<Notice[]> {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as Notice[];
  },
  async markAllRead(): Promise<void> {
    const user = await currentAuthUser();
    const { error } = await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
    if (error) throw new Error(error.message);
  },
  async markRead(id: string): Promise<void> {
    const user = await currentAuthUser();
    const { error } = await supabase.from('notifications').update({ is_read: true })
      .eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(error.message);
  },
};
