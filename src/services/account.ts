import { supabase } from '../supabase';
import type { NotificationRow } from '../database.types';
import { currentAuthUser } from './common';
import { marketplace, type Item } from './items';
import { notifications } from './notifications';
import { transactions, type Transaction } from './transactions';

export type AccountReport = {
  items: Item[];
  transactions: Transaction[];
  stats: { listed: number; approved_listings: number; transactions: number; completed: number; earned: number };
};

export const account = {
  async report(): Promise<AccountReport> {
    const [items, txs] = await Promise.all([marketplace.mine(), transactions.list()]);
    const user = await currentAuthUser();
    return {
      items,
      transactions: txs,
      stats: {
        listed: items.length,
        approved_listings: items.filter((item) => item.moderation_status === 'approved').length,
        transactions: txs.length,
        completed: txs.filter((tx) => tx.status === 'completed').length,
        earned: txs.filter((tx) => tx.seller_id === user.id && tx.status === 'completed')
          .reduce((total, tx) => total + Number(tx.item?.price ?? 0), 0),
      },
    };
  },
  async dashboard() {
    const [report, notices, recentItems, pendingRequests, unreadResult] = await Promise.all([
      this.report(), notifications.list(), marketplace.list(),
      (async () => {
        const user = await currentAuthUser();
        const { count, error } = await supabase.from('transactions').select('id', { count: 'exact', head: true })
          .eq('seller_id', user.id).eq('status', 'pending');
        if (error) throw new Error(error.message);
        return count ?? 0;
      })(),
      (async () => {
        const user = await currentAuthUser();
        const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('is_read', false);
        if (error) throw new Error(error.message);
        return count ?? 0;
      })(),
    ]);
    const user = await currentAuthUser();
    return {
      user,
      stats: {
        total_items: report.stats.listed,
        approved_listings: report.stats.approved_listings,
        pending_listings: report.items.filter((item) => item.moderation_status === 'pending').length,
        pending_requests: pendingRequests,
        completed_transactions: report.transactions.filter((tx) => tx.status === 'completed').length,
        unread_notifications: unreadResult,
      },
      recent_items: recentItems.slice(0, 6),
      notifications: notices.slice(0, 5) as NotificationRow[],
    };
  },
  notifications: notifications.list,
  markNotificationsRead: notifications.markAllRead,
  markNotificationRead: notifications.markRead,
};
