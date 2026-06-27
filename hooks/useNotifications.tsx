import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export type NotificationType =
  | 'user_performance'
  | 'bar_performance'
  | 'comment'
  | 'yermat'
  | 'new_follower'
  | 'rank_beaten'
  | 'personal_best'
  | 'medal_earned';

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  performance_id: string | null;
  source_user_id: string | null;
  source_bar_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationWithDetails extends Notification {
  source_user?: { username: string; avatar_url: string | null } | null;
  source_bar?: { name: string } | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch source details
      const notifications = data as Notification[];
      const userIds = [...new Set(notifications.filter(n => n.source_user_id).map(n => n.source_user_id!))];
      const barIds = [...new Set(notifications.filter(n => n.source_bar_id).map(n => n.source_bar_id!))];

      const [usersRes, barsRes] = await Promise.all([
        userIds.length > 0 
          ? supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds)
          : { data: [] },
        barIds.length > 0
          ? supabase.from('bars').select('id, name').in('id', barIds)
          : { data: [] }
      ]);

      const usersMap = new Map((usersRes.data || []).map(u => [u.user_id, u]));
      const barsMap = new Map((barsRes.data || []).map(b => [b.id, b]));

      return notifications.map(n => ({
        ...n,
        source_user: n.source_user_id ? usersMap.get(n.source_user_id) : null,
        source_bar: n.source_bar_id ? barsMap.get(n.source_bar_id) : null,
      })) as NotificationWithDetails[];
    },
    enabled: !!user,
  });

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    }, 30000);

    return () => clearInterval(interval);
  }, [user, queryClient]);

  return query;
}

export function useUnreadNotificationCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.read).length ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });
}
