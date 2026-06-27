import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceWithDetails } from '@/types/database';
import { startOfMonth, endOfMonth } from 'date-fns';

interface ClassementFilters {
  challengeTypeId: string | null;
  gender: string | null;
  username: string | null;
  month: Date;
}

export function useClassement(filters: ClassementFilters) {
  return useQuery({
    queryKey: ['classement', filters.challengeTypeId, filters.gender, filters.username, filters.month.toISOString()],
    queryFn: async () => {
      const monthStart = startOfMonth(filters.month);
      const monthEnd = endOfMonth(filters.month);

      let query = supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at, gender),
          bars(*),
          challenge_types(*)
        `)
        .eq('visibility', 'public')
        .eq('status', 'approved')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('time_ms', { ascending: true })
        .limit(200);

      if (filters.challengeTypeId) {
        query = query.eq('challenge_type_id', filters.challengeTypeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as unknown as PerformanceWithDetails[];

      if (filters.username) {
        const search = filters.username.toLowerCase();
        results = results.filter(p =>
          p.profiles?.username?.toLowerCase().includes(search)
        );
      }

      if (filters.gender) {
        results = results.filter(p =>
          (p.profiles as any)?.gender === filters.gender
        );
      }

      // Deduplicate: keep best time per user
      const bestByUser = new Map<string, PerformanceWithDetails>();
      for (const perf of results) {
        const existing = bestByUser.get(perf.user_id);
        if (!existing || perf.time_ms < existing.time_ms) {
          bestByUser.set(perf.user_id, perf);
        }
      }

      return Array.from(bestByUser.values()).sort((a, b) => a.time_ms - b.time_ms);
    },
    staleTime: 2 * 60 * 1000,
  });
}
