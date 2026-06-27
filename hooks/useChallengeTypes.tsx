import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChallengeType } from '@/types/database';

export function useChallengeTypes() {
  return useQuery({
    queryKey: ['challenge-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_types')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as ChallengeType[];
    },
  });
}