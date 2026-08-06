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

export interface ClassementEntry {
  userId: string;
  count: number;
  lastPerformance: PerformanceWithDetails;
}

// Classement par participation (nombre de Yermats publiés ce mois-ci), jamais
// par vitesse/quantité consommée — voir Guideline 5 (Legal) d'Apple.
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
          bars(id, name),
          challenge_types(id, name)
        `)
        .eq('visibility', 'public')
        .eq('status', 'approved')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

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

      // Regrouper par utilisateur : nombre de participations + dernière perf (pour l'affichage)
      const byUser = new Map<string, ClassementEntry>();
      for (const perf of results) {
        const existing = byUser.get(perf.user_id);
        if (existing) {
          existing.count += 1;
        } else {
          byUser.set(perf.user_id, { userId: perf.user_id, count: 1, lastPerformance: perf });
        }
      }

      return Array.from(byUser.values()).sort((a, b) => b.count - a.count);
    },
    staleTime: 2 * 60 * 1000,
  });
}
