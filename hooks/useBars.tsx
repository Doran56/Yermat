import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bar } from '@/types/database';

export function useBars() {
  return useQuery({
    queryKey: ['bars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as Bar[];
    },
  });
}

export function useBar(id: string) {
  return useQuery({
    queryKey: ['bar', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bars')
        .select('*, bar_rewards(id, is_active)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const { bar_rewards, ...bar } = data as any;
      return {
        ...bar,
        has_rewards: Array.isArray(bar_rewards) && bar_rewards.some((r: any) => r.is_active),
      } as Bar;
    },
    enabled: !!id,
  });
}



export function useBarsInBounds(bounds: { north: number; south: number; east: number; west: number } | null) {
  return useQuery({
    queryKey: ['bars', 'bounds', bounds],
    queryFn: async () => {
      if (!bounds) return [];

      const { data, error } = await supabase
        .from('bars')
        .select('*, bar_rewards(id, is_active)')
        .eq('is_active', true)
        .gte('lat', bounds.south)
        .lte('lat', bounds.north)
        .gte('lng', bounds.west)
        .lte('lng', bounds.east)
        .limit(30);

      if (error) throw error;
      return (data as any[]).map(({ bar_rewards, ...bar }) => ({
        ...bar,
        has_rewards: Array.isArray(bar_rewards) && bar_rewards.some((r: any) => r.is_active),
      })) as Bar[];
    },
    enabled: !!bounds,
    staleTime: 30_000,
    gcTime: 60_000,
  });
}

interface UpsertBarParams {
  google_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export function useUpsertBar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpsertBarParams) => {
      // Extract city from address (last part before country or last comma-separated segment)
      const parts = params.address.split(',').map(s => s.trim());
      const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

      const { data, error } = await supabase
        .from('bars')
        .upsert(
          {
            google_place_id: params.google_place_id,
            name: params.name,
            address: params.address,
            lat: params.lat,
            lng: params.lng,
            city,
            is_active: true,
          },
          { onConflict: 'google_place_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as Bar;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
    onError: (error) => {
      console.error('Failed to upsert bar:', error);
      console.error("Erreur lors de l'enregistrement du bar");
    },
  });
}
