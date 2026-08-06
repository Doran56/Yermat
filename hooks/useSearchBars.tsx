import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchBar {
  id: string;
  name: string;
  city: string;
}

export function useSearchBars(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['search-bars', trimmed],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('id, name, city')
        .eq('is_active', true)
        .ilike('name', `%${trimmed}%`)
        .order('name', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as SearchBar[];
    },
    enabled: trimmed.length >= 2,
  });
}
