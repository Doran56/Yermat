import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

interface BarFollow {
  id: string;
  user_id: string;
  bar_id: string;
  created_at: string;
}

export function useUserFollows() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', user.id);

      if (error) throw error;
      return data as UserFollow[];
    },
    enabled: !!user,
  });
}

export function useBarFollows() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bar-follows', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('bar_follows')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as BarFollow[];
    },
    enabled: !!user,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (followingId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: user.id, following_id: followingId });

      if (error) throw error;

      supabase.functions.invoke('notify-reaction', {
        body: { type: 'new_follower', actorUserId: user.id, targetUserId: followingId },
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-follows'] });
    },
    onError: () => {
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (followingId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-follows'] });
    },
    onError: () => {
    },
  });
}

export function useFollowBar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (barId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('bar_follows')
        .insert({ user_id: user.id, bar_id: barId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bar-follows'] });
    },
    onError: () => {
    },
  });
}

export function useUnfollowBar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (barId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('bar_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('bar_id', barId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bar-follows'] });
    },
    onError: () => {
    },
  });
}

/** Composite hook used in Feed and Bar screens */
export function useFollows() {
  const { data: userFollows = [] } = useUserFollows();
  const { data: barFollows = [] } = useBarFollows();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const followBar = useFollowBar();
  const unfollowBar = useUnfollowBar();

  const toggleBarFollow = (barId: string) => {
    const isFollowing = barFollows.some(f => f.bar_id === barId);
    if (isFollowing) {
      unfollowBar.mutate(barId);
    } else {
      followBar.mutate(barId);
    }
  };

  const toggleUserFollow = (userId: string) => {
    const isFollowing = userFollows.some(f => f.following_id === userId);
    if (isFollowing) {
      unfollowUser.mutate(userId);
    } else {
      followUser.mutate(userId);
    }
  };

  return { userFollows, barFollows, toggleBarFollow, toggleUserFollow };
}

// Helper hook to check if user is following another user
export function useIsFollowingUser(userId: string) {
  const { data: follows } = useUserFollows();
  return follows?.some(f => f.following_id === userId) ?? false;
}

// Helper hook to check if user is following a bar
export function useIsFollowingBar(barId: string) {
  const { data: follows } = useBarFollows();
  return follows?.some(f => f.bar_id === barId) ?? false;
}
