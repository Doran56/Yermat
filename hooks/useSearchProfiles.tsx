import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SearchProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
}

export function useSearchProfiles(query: string) {
  const { user } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['search-profiles', trimmed],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, avatar_url, xp')
        .ilike('username', `%${trimmed}%`)
        .neq('user_id', user?.id ?? '')
        .order('username', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as SearchProfile[];
    },
    enabled: trimmed.length >= 2,
  });
}
