import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/database';

export interface Comment {
  id: string;
  performance_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface CommentWithProfile extends Comment {
  profiles: Profile | null;
}

export function useComments(performanceId: string) {
  return useQuery({
    queryKey: ['comments', performanceId],
    queryFn: async () => {
      // Fetch comments
      const { data: comments, error } = await supabase
        .from('performance_comments')
        .select('*')
        .eq('performance_id', performanceId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (!comments?.length) return [] as CommentWithProfile[];
      
      // Fetch profiles separately
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      return comments.map(comment => ({
        ...comment,
        profiles: profiles?.find(p => p.user_id === comment.user_id) || null
      })) as CommentWithProfile[];
    },
    enabled: !!performanceId,
  });
}

export function useCommentCount(performanceId: string) {
  const { data: comments } = useComments(performanceId);
  return comments?.length ?? 0;
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ performanceId, content }: { performanceId: string; content: string }) => {
      if (!user) throw new Error('Must be logged in');
      if (!content.trim()) throw new Error('Comment cannot be empty');
      if (content.length > 500) throw new Error('Comment too long');

      const { error } = await supabase
        .from('performance_comments')
        .insert({ 
          performance_id: performanceId, 
          user_id: user.id,
          content: content.trim()
        });
      if (error) throw error;
    },
    onSuccess: (_, { performanceId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', performanceId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, performanceId }: { commentId: string; performanceId: string }) => {
      const { error } = await supabase
        .from('performance_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      return performanceId;
    },
    onSuccess: (performanceId) => {
      queryClient.invalidateQueries({ queryKey: ['comments', performanceId] });
    },
  });
}
