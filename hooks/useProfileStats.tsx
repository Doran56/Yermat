import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Medal, MedalRank } from '@/lib/gamification';

interface ProfileStats {
  totalPerformances: number;
  totalBarsVisited: number;
  bestPerformance: {
    time: number;
    barName: string;
    barCity: string;
    date: string;
  } | null;
  filmedRate: number;
}

interface BarStats {
  barId: string;
  barName: string;
  barCity: string;
  performanceCount: number;
  bestTime: number;
}

export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async (): Promise<ProfileStats> => {
      if (!userId) throw new Error('No user ID');

      const { data: performances, error } = await supabase
        .from('performances')
        .select(`
          id,
          time_ms,
          video_url,
          created_at,
          bars (
            id,
            name,
            city
          )
        `)
        .eq('user_id', userId)
        .order('time_ms', { ascending: true });

      if (error) throw error;

      const total = performances?.length || 0;
      const uniqueBars = new Set(performances?.map(p => p.bars?.id).filter(Boolean));
      const withVideo = performances?.filter(p => p.video_url).length || 0;
      const best = performances?.[0];

      return {
        totalPerformances: total,
        totalBarsVisited: uniqueBars.size,
        bestPerformance: best ? {
          time: best.time_ms,
          barName: best.bars?.name || 'Bar inconnu',
          barCity: best.bars?.city || '',
          date: best.created_at,
        } : null,
        filmedRate: total > 0 ? Math.round((withVideo / total) * 100) : 0,
      };
    },
    enabled: !!userId,
  });
}

function getCategoryLabel(category: string, barName?: string, challengeName?: string): string {
  if (category === 'general') return '🌍 Général';
  if (category === 'gender_male') return '♂️ Hommes';
  if (category === 'gender_female') return '♀️ Femmes';
  if (category.startsWith('challenge_')) return challengeName ? `💧 ${challengeName}` : '💧 Défi';
  if (category.startsWith('bar_')) return barName ? `📍 ${barName}` : '📍 Bar';
  return category;
}

export function useUserMedals(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-medals', userId],
    queryFn: async (): Promise<Medal[]> => {
      if (!userId) throw new Error('No user ID');

      // Fetch monthly medals from DB
      const { data: monthlyMedals, error } = await supabase
        .from('monthly_medals')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: false });

      if (error) throw error;

      if (!monthlyMedals?.length) return [];

      // Fetch bar names for bar medals
      const barIds = monthlyMedals
        .filter(m => m.bar_id)
        .map(m => m.bar_id as string);

      const challengeIds = monthlyMedals
        .filter(m => m.challenge_type_id)
        .map(m => m.challenge_type_id as string);

      const [barsResult, challengesResult] = await Promise.all([
        barIds.length > 0
          ? supabase.from('bars').select('id, name, city').in('id', barIds)
          : { data: [] },
        challengeIds.length > 0
          ? supabase.from('challenge_types').select('id, name').in('id', challengeIds)
          : { data: [] },
      ]);

      const barMap = new Map((barsResult.data || []).map(b => [b.id, b]));
      const challengeMap = new Map((challengesResult.data || []).map(c => [c.id, c.name]));

      return monthlyMedals.map(m => {
        const bar = m.bar_id ? barMap.get(m.bar_id) : null;
        const challengeName = m.challenge_type_id ? challengeMap.get(m.challenge_type_id) : undefined;

        return {
          barId: m.bar_id || m.id,
          barName: bar?.name || '',
          barCity: bar?.city || '',
          rank: m.rank as MedalRank,
          bestTime: m.time_ms,
          month: m.month,
          category: m.category,
          categoryLabel: getCategoryLabel(m.category, bar?.name, challengeName),
        };
      });
    },
    enabled: !!userId,
  });
}

export function useUserTopBars(userId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: ['user-top-bars', userId, limit],
    queryFn: async (): Promise<BarStats[]> => {
      if (!userId) throw new Error('No user ID');

      const { data: performances, error } = await supabase
        .from('performances')
        .select(`
          id,
          time_ms,
          bar_id,
          bars (
            id,
            name,
            city
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const barMap = new Map<string, BarStats>();

      performances?.forEach(p => {
        if (!p.bars || !p.bar_id) return;

        const existing = barMap.get(p.bar_id);
        if (existing) {
          existing.performanceCount++;
          if (p.time_ms < existing.bestTime) {
            existing.bestTime = p.time_ms;
          }
        } else {
          barMap.set(p.bar_id, {
            barId: p.bar_id,
            barName: p.bars.name,
            barCity: p.bars.city,
            performanceCount: 1,
            bestTime: p.time_ms,
          });
        }
      });

      return Array.from(barMap.values())
        .sort((a, b) => b.performanceCount - a.performanceCount)
        .slice(0, limit);
    },
    enabled: !!userId,
  });
}
