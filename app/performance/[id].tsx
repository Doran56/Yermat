import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePerformanceYermats } from '@/hooks/useYermats';
import { useComments } from '@/hooks/useComments';
import { useFollows } from '@/hooks/useFollows';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Badge } from '@/components/ui/Badge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReportActionSheet } from '@/components/moderation/ReportActionSheet';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

const VISIBILITY_OPTIONS: { value: 'public' | 'followers' | 'private'; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'public',    label: 'Public',    icon: 'globe-outline' },
  { value: 'followers', label: 'Abonnés',   icon: 'people-outline' },
  { value: 'private',   label: 'Privé',     icon: 'lock-closed-outline' },
];

export default function PerformanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [reportVisible, setReportVisible] = useState(false);

  const updateVisibility = useMutation({
    mutationFn: async (visibility: 'public' | 'followers' | 'private') => {
      const { error } = await supabase
        .from('performances')
        .update({ visibility })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['performance', id] });
      qc.invalidateQueries({ queryKey: ['performances'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const { data: performance, isLoading } = useQuery({
    queryKey: ['performance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select('*, profiles!performances_user_id_profiles_fkey(*), bars(*), challenge_types(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { yermats, hasYermat, toggleYermat } = usePerformanceYermats(id);
  const { data: comments, isLoading: commentsLoading } = useComments(id);
  const { userFollows, toggleUserFollow } = useFollows();

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('performance_comments').insert({
        performance_id: id,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const player = useVideoPlayer(
    performance?.video_url ? { uri: performance.video_url } : null,
    (p) => { p.loop = true; }
  );

  if (isLoading || !performance) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.amber[500]} />
      </View>
    );
  }

  const profile = performance.profiles;
  const bar = performance.bars;
  const challenge = performance.challenge_types;
  const isFollowing = userFollows.some((f: any) => f.following_id === performance.user_id);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Yermat" onBack={() => router.back()} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Video player */}
          {performance.video_url ? (
            <View style={[styles.videoContainer, { height: width * (16 / 9) }]}>
              <VideoView
                player={player}
                style={styles.video}
                contentFit="cover"
                nativeControls
              />
            </View>
          ) : (
            <View style={styles.noVideo}>
              <Text style={{ fontSize: 48 }}>💧</Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.infoSection}>
            {/* User row */}
            <View style={styles.userRow}>
              <Avatar uri={profile?.avatar_url} name={profile?.username ?? '?'} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>{profile?.username ?? 'Anonyme'}</Text>
                {bar && <Text style={styles.barName}>📍 {bar.name}, {bar.city}</Text>}
              </View>
              <Text style={styles.date}>{formatRelativeDate(performance.created_at)}</Text>
              {user && user.id !== performance.user_id && (
                <>
                  <TouchableOpacity
                    onPress={() => toggleUserFollow(performance.user_id)}
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? 'Suivi' : '+ Suivre'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setReportVisible(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ marginLeft: 6 }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Badges + visibilité sur la même ligne si owner */}
            <View style={styles.badgesRow}>
              {challenge && <Badge label={challenge.name} variant="amber" />}
              {performance.time_ms > 0 && <TimeBadge timeMs={performance.time_ms} size="md" />}
              <StatusBadge status={performance.status as any} />
            </View>

            {/* Visibility picker — owner only, juste sous les badges */}
            {user?.id === (performance as any).user_id && (
              <View style={styles.visibilityRow}>
                <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.visibilityLabel}>Visibilité</Text>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const active = (performance as any).visibility === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => !active && updateVisibility.mutate(opt.value)}
                      activeOpacity={0.75}
                      style={[styles.visibilityBtn, active && styles.visibilityBtnActive]}
                      disabled={updateVisibility.isPending}
                    >
                      <Ionicons name={opt.icon} size={12} color={active ? Colors.white : Colors.textSecondary} />
                      <Text style={[styles.visibilityBtnText, active && styles.visibilityBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Yermat button */}
            <TouchableOpacity
              onPress={() => {
                if (!user) return;
                toggleYermat();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              style={[styles.yermatBtn, hasYermat && styles.yermatBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={styles.yermatBtnText}>{hasYermat ? '💧' : '💦'} Goutte · {yermats}</Text>
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Commentaires ({comments?.length ?? 0})</Text>
            {commentsLoading ? (
              <ActivityIndicator color={Colors.amber[500]} />
            ) : comments?.length === 0 ? (
              <Text style={styles.noComments}>Sois le premier à commenter !</Text>
            ) : (
              comments?.map((c: any) => (
                <View key={c.id} style={styles.commentRow}>
                  <Avatar uri={c.profiles?.avatar_url} name={c.profiles?.username ?? '?'} size={32} />
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentUser}>{c.profiles?.username}</Text>
                    <Text style={styles.commentContent}>{c.content}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment input */}
        {user && (
          <View style={[styles.commentInput, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Ajouter un commentaire…"
              placeholderTextColor={Colors.textSecondary}
              style={styles.commentTextInput}
              returnKeyType="send"
              onSubmitEditing={() => comment.trim() && addComment.mutate(comment.trim())}
              maxLength={500}
            />
            <TouchableOpacity
              onPress={() => comment.trim() && addComment.mutate(comment.trim())}
              disabled={!comment.trim() || addComment.isPending}
              style={[styles.sendBtn, !comment.trim() && { opacity: 0.4 }]}
            >
              <Text style={styles.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ReportActionSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        contentType="performance"
        contentId={id}
        reportedUserId={performance.user_id}
        reportedUsername={profile?.username}
        onBlocked={() => router.back()}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  videoContainer: { backgroundColor: Colors.bgElevated },
  video: { width: '100%', height: '100%' },
  noVideo: {
    height: 200, backgroundColor: Colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  infoSection: { padding: 16, gap: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  barName: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  date: { color: Colors.textSecondary, fontSize: 11 },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  yermatBtn: {
    backgroundColor: Colors.bgElevated2, borderRadius: 24,
    paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  yermatBtnActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  yermatBtnText: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  commentsSection: { padding: 16, gap: 12 },
  commentsTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  noComments: { color: Colors.textSecondary, fontSize: 13 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentBubble: {
    flex: 1, backgroundColor: Colors.bgElevated,
    borderRadius: 12, padding: 10, gap: 2,
  },
  commentUser: { color: Colors.brand, fontSize: 12, fontWeight: '700' },
  commentContent: { color: Colors.text, fontSize: 13, lineHeight: 18 },
  commentInput: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  commentTextInput: {
    flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.text, fontSize: 14,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.amber[500], alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  followBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgElevated,
    marginLeft: 6,
  },
  followBtnActive: { borderColor: Colors.brand },
  followBtnText: { color: Colors.text, fontSize: 11, fontWeight: '700' },
  followBtnTextActive: { color: Colors.brand },
  visibilityLabel: { color: Colors.textSecondary, fontSize: 12, marginRight: 2 },
  visibilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
  },
  visibilityBtnActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  visibilityBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  visibilityBtnTextActive: { color: Colors.white },
});
