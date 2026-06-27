import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Liste des IDs d'utilisateurs bloqués par l'utilisateur courant. */
export function useBlockedUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.blocked_id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

function invalidateFeeds(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
  queryClient.invalidateQueries({ queryKey: ['infinite-performances'] });
  queryClient.invalidateQueries({ queryKey: ['user-performances'] });
  queryClient.invalidateQueries({ queryKey: ['performances'] });
}

export function useBlockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_blocks')
        .insert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => invalidateFeeds(queryClient),
  });
}

export function useUnblockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => invalidateFeeds(queryClient),
  });
}
