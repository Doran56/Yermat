import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ReportReason = 'offensive' | 'sexual' | 'violence' | 'spam' | 'other';
export type ReportContentType = 'performance' | 'comment';

export interface ReportInput {
  contentType: ReportContentType;
  contentId: string;
  reportedUserId?: string | null;
  reason: ReportReason;
  details?: string;
}

/** Signaler un contenu (vidéo ou commentaire). Apple Guideline 1.2. */
export function useReportContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReportInput) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('content_reports')
        .upsert(
          {
            reporter_id: user.id,
            content_type: input.contentType,
            content_id: input.contentId,
            reported_user_id: input.reportedUserId ?? null,
            reason: input.reason,
            details: input.details ?? null,
          },
          { onConflict: 'reporter_id,content_type,content_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
    },
  });
}

/** File de signalements en attente (admin / modération sous 24h). */
export function useReportsQueue() {
  return useQuery({
    queryKey: ['content-reports', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
}

/** Met à jour le statut d'un signalement (admin). */
export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'reviewed' | 'actioned' | 'dismissed' }) => {
      const { error } = await supabase
        .from('content_reports')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-reports'] });
    },
  });
}
