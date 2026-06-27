import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Yermat {
  id: string;
  performance_id: string;
  user_id: string;
  created_at: string;
}

export function useYermats(performanceId: string) {
  return useQuery({
    queryKey: ['yermats', performanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_yermats')
        .select('*')
        .eq('performance_id', performanceId);
      
      if (error) throw error;
      return data as Yermat[];
    },
    enabled: !!performanceId,
  });
}

export function useYermatCount(performanceId: string) {
  const { data: yermats } = useYermats(performanceId);
  return yermats?.length ?? 0;
}

export function useHasYermated(performanceId: string) {
  const { user } = useAuth();
  const { data: yermats } = useYermats(performanceId);
  
  if (!user || !yermats) return false;
  return yermats.some(y => y.user_id === user.id);
}

/** Convenience hook used in FeedCard / PerformanceDetail — combines count, hasYermat, and toggle */
export function usePerformanceYermats(performanceId: string) {
  const { user } = useAuth();
  const { data: yermats = [] } = useYermats(performanceId);
  const toggle = useToggleYermat();

  const hasYermat = !!user && yermats.some(y => y.user_id === user.id);

  return {
    yermats: yermats.length,
    hasYermat,
    toggleYermat: () => toggle.mutate({ performanceId, hasYermated: hasYermat }),
  };
}

export function useToggleYermat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ performanceId, hasYermated }: { performanceId: string; hasYermated: boolean }) => {
      if (!user) throw new Error('Must be logged in');

      if (hasYermated) {
        const { error } = await supabase
          .from('performance_yermats')
          .delete()
          .eq('performance_id', performanceId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('performance_yermats')
          .insert({ performance_id: performanceId, user_id: user.id });
        if (error) throw error;

        supabase.functions.invoke('notify-reaction', {
          body: { type: 'yermat', actorUserId: user.id, performanceId },
        }).catch(() => {});
      }
    },
    onSuccess: (_, { performanceId }) => {
      queryClient.invalidateQueries({ queryKey: ['yermats', performanceId] });
    },
  });
}
