import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Suppression définitive du compte (Apple Guideline 5.1.1). */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) {
        let serverMsg: string | undefined;
        try { serverMsg = (await (error as any).context?.json?.())?.error; } catch {}
        throw new Error(serverMsg ?? error.message ?? 'Suppression impossible');
      }
      return data;
    },
    onSuccess: async () => {
      await supabase.auth.signOut();
      queryClient.clear();
    },
  });
}
