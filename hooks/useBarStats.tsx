import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';
import { LeaderboardEntry } from '@/types/database';

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

export function useMonthlyLeaderboard(barId: string, challengeTypeId: string, limit: number = 10, gender: string | null = null, month?: Date) {
  const targetMonth = month || new Date();
  return useQuery({
    queryKey: ['monthly-leaderboard', barId, challengeTypeId, limit, gender, targetMonth.toISOString()],
    queryFn: async () => {
      const mStart = formatISO(startOfMonth(targetMonth));
      const mEnd = formatISO(endOfMonth(targetMonth));

      const { data, error } = await supabase
        .from('performances')
        .select('time_ms, created_at, user_id, status')
        .eq('bar_id', barId)
        .eq('challenge_type_id', challengeTypeId)
        .in('status', ['approved', 'unverified'])
        .gte('created_at', mStart)
        .lte('created_at', mEnd)
        .order('time_ms', { ascending: true })
        .limit(gender ? limit * 3 : limit);

      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.user_id))];
      if (userIds.length === 0) return [] as LeaderboardEntry[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      let entries = (data || []).map((entry) => ({
        profile: profileMap.get(entry.user_id) as any,
        time_ms: entry.time_ms,
        created_at: entry.created_at,
        status: entry.status as LeaderboardEntry['status'],
      }));

      if (gender) {
        entries = entries.filter(e => e.profile?.gender === gender);
      }

      return entries.slice(0, limit).map((e, i) => ({
        ...e,
        rank: i + 1,
      })) as LeaderboardEntry[];
    },
    enabled: !!barId && !!challengeTypeId,
    staleTime: 5 * 60 * 1000,
  });
}
