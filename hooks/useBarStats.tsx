import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBarStats(barId: string) {
  return useQuery({
    queryKey: ['bar-stats', barId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select('id, user_id')
        .eq('bar_id', barId)
        .in('status', ['approved', 'unverified']);

      if (error) throw error;

      const uniqueUsers = new Set((data || []).map(d => d.user_id));
      return {
        totalPerformances: data?.length || 0,
        uniqueParticipants: uniqueUsers.size,
      };
    },
    enabled: !!barId,
    staleTime: 5 * 60 * 1000,
  });
}
