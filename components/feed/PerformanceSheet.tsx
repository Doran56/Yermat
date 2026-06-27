import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePerformanceYermats } from '@/hooks/useYermats';
import { useComments } from '@/hooks/useComments';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';
import { PerformanceWithDetails } from '@/types/database';

interface Props {
  performance: PerformanceWithDetails;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'muted' }> = {
  approved:   { label: 'Certifiée ✓', variant: 'success' },
  pending:    { label: 'En attente',  variant: 'muted' },
  unverified: { label: 'Non certifiée', variant: 'muted' },
  rejected:   { label: 'Rejetée',    variant: 'muted' },
};

export function PerformanceSheet({ performance }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const { yermats, hasYermat, toggleYermat } = usePerformanceYermats(performance.id);
  const { data: comments, isLoading: commentsLoading } = useComments(performance.id);

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('performance_comments').insert({
        performance_id: performance.id,
        user_id: user.id,
        content,
      });
      if (error) throw error;

      supabase.functions.invoke('notify-reaction', {
        body: { type: 'comment', actorUserId: user.id, performanceId: performance.id },
      }).catch(() => {});
    },
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['comments', performance.id] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const profile = performance.profiles;
  const bar = performance.bars;
  const challenge = performance.challenge_types;
  const statusCfg = STATUS_CONFIG[performance.status] ?? STATUS_CONFIG.pending;

  const submit = () => {
    if (comment.trim()) addComment.mutate(comment.trim());
  };

  return (
    <View style={styles.container}>
      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* User row */}
        <View style={styles.userRow}>
          <Avatar uri={profile?.avatar_url} name={profile?.username ?? '?'} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{profile?.username ?? 'Anonyme'}</Text>
            {bar && <Text style={styles.barName}>📍 {bar.name}, {bar.city}</Text>}
          </View>
          <Text style={styles.date}>{formatRelativeDate(performance.created_at)}</Text>
        </View>

        {/* Badges */}
        <View style={styles.badgesRow}>
          {challenge && <Badge label={challenge.name} variant="amber" />}
          {performance.time_ms > 0 && <TimeBadge timeMs={performance.time_ms} size="md" />}
          <Badge label={statusCfg.label} variant={statusCfg.variant} />
        </View>

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
          <Text style={[styles.yermatBtnText, hasYermat && styles.yermatBtnTextActive]}>
            {hasYermat ? '💧' : '💦'} Yermat · {yermats}
          </Text>
        </TouchableOpacity>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Commentaires ({comments?.length ?? 0})</Text>
          {commentsLoading ? (
            <ActivityIndicator color={Colors.amber[500]} style={{ marginTop: 8 }} />
          ) : comments?.length === 0 ? (
            <Text style={styles.noComments}>Sois le premier à commenter !</Text>
          ) : (
            comments?.map((c: any) => (
              <View key={c.id} style={styles.commentRow}>
                <Avatar uri={c.profiles?.avatar_url} name={c.profiles?.username ?? '?'} size={30} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUser}>{c.profiles?.username}</Text>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Comment input inside scroll for simplicity */}
        {user && (
          <View style={styles.inputRow}>
            <BottomSheetTextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Ajouter un commentaire…"
              placeholderTextColor={Colors.zinc[400]}
              style={styles.textInput}
              returnKeyType="send"
              onSubmitEditing={submit}
              maxLength={500}
            />
            <TouchableOpacity
              onPress={submit}
              disabled={!comment.trim() || addComment.isPending}
              style={[styles.sendBtn, !comment.trim() && { opacity: 0.4 }]}
            >
              <Text style={styles.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  username: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  barName: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  date: { color: Colors.textSecondary, fontSize: 11 },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  yermatBtn: {
    backgroundColor: Colors.bgElevated2, borderRadius: 24,
    paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16, alignSelf: 'flex-start',
  },
  yermatBtnActive: { backgroundColor: Colors.amber[500], borderColor: Colors.amber[500] },
  yermatBtnText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  yermatBtnTextActive: { color: Colors.black },
  commentsSection: { gap: 10, marginBottom: 16 },
  commentsTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  noComments: { color: Colors.textSecondary, fontSize: 13 },
  commentRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  commentBubble: {
    flex: 1, backgroundColor: Colors.bgElevated2,
    borderRadius: 12, padding: 10, gap: 2,
  },
  commentUser: { color: Colors.amber[600], fontSize: 12, fontWeight: '700' },
  commentContent: { color: Colors.text, fontSize: 13, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.bgElevated2, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.text, fontSize: 14,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.amber[500], alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: Colors.black, fontSize: 18, fontWeight: '700' },
});
