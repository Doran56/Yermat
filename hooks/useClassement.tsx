import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceWithDetails } from '@/types/database';
import { startOfMonth, endOfMonth } from 'date-fns';

export type SearchSort = 'time_asc' | 'date_desc' | 'username_asc' | 'barname_asc';

interface SearchFilters {
  challengeTypeId: string | null;
  barId: string | null;
  username: string | null;
  gender: string | null;
  month: Date | null;
  sort: SearchSort;
}

// Recherche de Yermats avec filtres (volume, bar, utilisateur, période) et tri
// libre (temps, date, alphabétique) — écran de recherche/parcours, pas un
// classement compétitif : aucune notification ni récompense n'y est attachée.
export function useClassement(filters: SearchFilters) {
  return useQuery({
    queryKey: [
      'yermat-search',
      filters.challengeTypeId, filters.barId, filters.username, filters.gender,
      filters.month?.toISOString() ?? 'all', filters.sort,
    ],
    queryFn: async () => {
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
        .limit(300);

      if (filters.month) {
        query = query
          .gte('created_at', startOfMonth(filters.month).toISOString())
          .lte('created_at', endOfMonth(filters.month).toISOString());
      }
      if (filters.challengeTypeId) query = query.eq('challenge_type_id', filters.challengeTypeId);
      if (filters.barId) query = query.eq('bar_id', filters.barId);

      query = filters.sort === 'time_asc'
        ? query.order('time_ms', { ascending: true })
        : query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let results = data as unknown as PerformanceWithDetails[];

      if (filters.username) {
        const search = filters.username.toLowerCase();
        results = results.filter(p => p.profiles?.username?.toLowerCase().includes(search));
      }

      if (filters.gender) {
        results = results.filter(p => (p.profiles as any)?.gender === filters.gender);
      }

      switch (filters.sort) {
        case 'username_asc':
          results = [...results].sort((a, b) =>
            (a.profiles?.username ?? '').localeCompare(b.profiles?.username ?? ''));
          break;
        case 'barname_asc':
          results = [...results].sort((a, b) =>
            ((a as any).bars?.name ?? '').localeCompare((b as any).bars?.name ?? ''));
          break;
        // 'time_asc' et 'date_desc' sont déjà triés côté serveur.
      }

      return results;
    },
    staleTime: 2 * 60 * 1000,
  });
}
