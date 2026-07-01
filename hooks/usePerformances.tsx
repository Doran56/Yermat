import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceWithDetails, LeaderboardEntry } from '@/types/database';
import { useBlockedUsers } from '@/hooks/useBlocks';
import { useEffect } from 'react';

const FEED_PAGE_SIZE = 10;

export function useInfinitePerformances() {
  const queryClient = useQueryClient();
  const { data: blockedIds = [] } = useBlockedUsers();

  const query = useInfiniteQuery({
    queryKey: ['infinite-performances', blockedIds],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * FEED_PAGE_SIZE;
      const to = from + FEED_PAGE_SIZE - 1;

      let q = supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at),
          bars(*),
          challenge_types(*),
          performance_comments(count)
        `)
        .in('status', ['approved', 'unverified', 'pending']);

      if (blockedIds.length > 0) {
        q = q.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data, error } = await q
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return (data as any[]).map(p => ({
        ...p,
        comments_count: (p.performance_comments?.[0]?.count ?? 0),
      })) as PerformanceWithDetails[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === FEED_PAGE_SIZE ? allPages.length : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Realtime: invalidate on new inserts
  useEffect(() => {
    // Guard: supprimer tout canal résiduel du même nom (remount inattendu)
    const stale = supabase.getChannels()
      .find(c => c.topic === 'realtime:performances-infinite-feed');
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel('performances-infinite-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'performances' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['infinite-performances'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function usePerformances(page: number = 0) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['performances', page],
    queryFn: async () => {
      const from = page * FEED_PAGE_SIZE;
      const to = from + FEED_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at),
          bars(*),
          challenge_types(*),
          performance_comments(count)
        `)
        .in('status', ['approved', 'unverified', 'pending'])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return (data as any[]).map(p => ({
        ...p,
        comments_count: (p.performance_comments?.[0]?.count ?? 0),
      })) as PerformanceWithDetails[];
    },
    staleTime: 5 * 60 * 1000, // 5 min — don't refetch if fresh
    gcTime: 30 * 60 * 1000,   // 30 min — keep in cache
  });

  // Subscribe to realtime updates — invalidate page 0 on new inserts
  useEffect(() => {
    const channel = supabase
      .channel('performances-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'performances' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['performances', 0] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function usePerformance(id: string) {
  return useQuery({
    queryKey: ['performance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at),
          bars(*),
          challenge_types(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PerformanceWithDetails;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUserPerformances(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-performances', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at),
          bars(*),
          challenge_types(*),
          performance_comments(count)
        `)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]).map(p => ({
        ...p,
        comments_count: (p.performance_comments?.[0]?.count ?? 0),
      })) as PerformanceWithDetails[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLeaderboard(barId: string, challengeTypeId: string, limit: number = 10, gender: string | null = null) {
  return useQuery({
    queryKey: ['leaderboard', barId, challengeTypeId, limit, gender],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select('time_ms, created_at, user_id, status')
        .eq('bar_id', barId)
        .eq('challenge_type_id', challengeTypeId)
        .eq('status', 'approved')
        .order('time_ms', { ascending: true })
        .limit(gender ? limit * 3 : limit); // fetch more if filtering client-side

      if (error) throw error;

      const userIds = [...new Set((data || []).map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      let entries = (data || []).map((entry, index) => ({
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
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreatePerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      barId, challengeTypeId, timeMs, videoUrl, userId,
    }: {
      barId: string; challengeTypeId: string; timeMs: number; videoUrl: string; userId: string;
    }) => {
      const { data, error } = await supabase
        .from('performances')
        .insert({
          bar_id: barId, challenge_type_id: challengeTypeId, time_ms: timeMs,
          video_url: videoUrl, user_id: userId, status: 'approved',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performances'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useUpdatePerformanceVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      performanceId, visibility,
    }: {
      performanceId: string; visibility: 'public' | 'followers' | 'private';
    }) => {
      const { data, error } = await supabase
        .from('performances')
        .update({ visibility })
        .eq('id', performanceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['performances'] });
      queryClient.invalidateQueries({ queryKey: ['performance', variables.performanceId] });
      queryClient.invalidateQueries({ queryKey: ['user-performances'] });
    },
  });
}
