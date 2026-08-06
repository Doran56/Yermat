import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/database';

export interface YermatWithProfile {
  id: string;
  user_id: string;
  created_at: string;
  profiles: Profile | null;
}

// Liste des utilisateurs ayant laissé une Goutte sur une performance — pas de
// FK déclarée entre performance_yermats et profiles, donc fetch en 2 temps
// (même pattern que useComments.tsx).
export function useYermatUsers(performanceId: string) {
  return useQuery({
    queryKey: ['yermat-users', performanceId],
    queryFn: async () => {
      const { data: yermats, error } = await supabase
        .from('performance_yermats')
        .select('id, user_id, created_at')
        .eq('performance_id', performanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!yermats?.length) return [] as YermatWithProfile[];

      const userIds = [...new Set(yermats.map(y => y.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      return yermats.map(y => ({
        ...y,
        profiles: profiles?.find(p => p.user_id === y.user_id) ?? null,
      })) as YermatWithProfile[];
    },
    enabled: !!performanceId,
  });
}

// Compte agrégé (pas de fetch des lignes) — évite de retélécharger tous les
// Yermats d'une performance juste pour en afficher le nombre.
export function useYermatCount(performanceId: string) {
  return useQuery({
    queryKey: ['yermat-count', performanceId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('performance_yermats')
        .select('*', { count: 'exact', head: true })
        .eq('performance_id', performanceId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!performanceId,
  });
}

// Vérifie l'existence d'une seule ligne (pas besoin de charger la liste entière).
export function useHasYermated(performanceId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['has-yermated', performanceId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_yermats')
        .select('id')
        .eq('performance_id', performanceId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!performanceId && !!user,
  });
}

/** Convenience hook used in FeedCard / PerformanceDetail — combines count, hasYermat, and toggle */
export function usePerformanceYermats(performanceId: string) {
  const { data: yermats = 0 } = useYermatCount(performanceId);
  const { data: hasYermat = false } = useHasYermated(performanceId);
  const toggle = useToggleYermat();

  return {
    yermats,
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
      queryClient.invalidateQueries({ queryKey: ['yermat-count', performanceId] });
      queryClient.invalidateQueries({ queryKey: ['has-yermated', performanceId] });
    },
  });
}
