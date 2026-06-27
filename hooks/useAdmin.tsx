import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bar, PerformanceWithDetails } from '@/types/database';

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAllPerformances(statusFilter?: string) {
  return useQuery({
    queryKey: ['admin-performances', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at),
          bars(*),
          challenge_types(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PerformanceWithDetails[];
    },
    staleTime: 60 * 1000,
  });
}

export function useModeratePerformance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      performanceId,
      newStatus,
      comment,
    }: {
      performanceId: string;
      newStatus: 'approved' | 'rejected' | 'unverified';
      comment: string;
    }) => {
      // 1. Update performance status
      const { error: updateError } = await supabase
        .from('performances')
        .update({ status: newStatus })
        .eq('id', performanceId);

      if (updateError) throw updateError;

      // 2. Post moderation comment
      if (comment.trim() && user?.id) {
        const prefix = newStatus === 'approved'
          ? '✅ Performance certifiée par un modérateur.'
          : '❌ Performance non certifiée.';
        const fullComment = `${prefix} ${comment}`.trim();

        const { error: commentError } = await supabase
          .from('performance_comments')
          .insert({
            performance_id: performanceId,
            user_id: user.id,
            content: fullComment,
          });

        if (commentError) throw commentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-performances'] });
      queryClient.invalidateQueries({ queryKey: ['performances'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export interface BarReward {
  id: string;
  bar_id: string;
  rank: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function useBarRewards(barId?: string) {
  return useQuery({
    queryKey: ['bar-rewards', barId],
    queryFn: async () => {
      let query = supabase
        .from('bar_rewards')
        .select('*')
        .order('rank', { ascending: true });

      if (barId) {
        query = query.eq('bar_id', barId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BarReward[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminBars() {
  return useQuery({
    queryKey: ['admin-bars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Bar[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useManageBarReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: 
      | { type: 'create'; barId: string; rank: number; title: string; description?: string }
      | { type: 'update'; id: string; title?: string; description?: string; is_active?: boolean }
      | { type: 'delete'; id: string }
    ) => {
      if (action.type === 'create') {
        const { error } = await supabase.from('bar_rewards').insert({
          bar_id: action.barId,
          rank: action.rank,
          title: action.title,
          description: action.description || null,
        });
        if (error) throw error;
      } else if (action.type === 'update') {
        const { id, type, ...updates } = action;
        const { error } = await supabase.from('bar_rewards').update(updates).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bar_rewards').delete().eq('id', action.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bar-rewards'] });
    },
  });
}
