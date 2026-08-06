import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceWithDetails } from '@/types/database';
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
          bars(id, name, city),
          challenge_types(id, name, volume_ml),
          performance_comments(count)
        `)
        .in('status', ['approved', 'unverified', 'pending'])
        // Filtré côté serveur : le feed n'affiche que les publiques. Le faire côté
        // client faisait télécharger ~8 % de lignes pour les jeter, et rétrécissait
        // les pages de 10, ce qui déclenchait des fetchNextPage supplémentaires.
        .eq('visibility', 'public');

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

export function usePerformance(id: string) {
  return useQuery({
    queryKey: ['performance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select(`
          *,
          profiles!performances_user_id_profiles_fkey(id, user_id, username, avatar_url, age_verified, created_at, updated_at),
          bars(id, name, city),
          challenge_types(id, name, volume_ml)
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
          bars(id, name, city),
          challenge_types(id, name, volume_ml),
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
