import { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBar } from '@/hooks/useBars';
import { useBarRewards } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export default function BarDetailScreen() {
  const { barId } = useLocalSearchParams<{ barId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: bar, isLoading } = useBar(barId);
  const { data: rewards } = useBarRewards(barId);
  const { data: perfs, isLoading: perfsLoading } = useQuery({
    queryKey: ['bar-performances', barId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select('*, profiles!performances_user_id_profiles_fkey(*)')
        .eq('bar_id', barId)
        .in('status', ['approved', 'unverified'])
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!barId,
  });
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['bar-leaderboard-top', barId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performances')
        .select('*, profiles!performances_user_id_profiles_fkey(*)')
        .eq('bar_id', barId)
        .eq('status', 'approved')
        .gt('time_ms', 0)
        .order('time_ms', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!barId,
  });
  const { barFollows, toggleBarFollow } = useFollows();

  const topLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    const byUser = new Map<string, any>();
    for (const p of leaderboard) {
      const existing = byUser.get(p.user_id);
      if (!existing || p.time_ms < existing.time_ms) byUser.set(p.user_id, p);
    }
    return Array.from(byUser.values()).slice(0, 10);
  }, [leaderboard]);

  const isFollowing = barFollows?.some((f: any) => f.bar_id === barId);

  const handleFollow = () => {
    if (!user) { router.push('/(auth)'); return; }
    toggleBarFollow(barId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (isLoading || !bar) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.amber[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={bar.name} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bar info card */}
        <View style={styles.barCard}>
          <Text style={styles.barEmoji}>💧</Text>
          <Text style={styles.barName}>{bar.name}</Text>
          <Text style={styles.barAddress}>{bar.address}, {bar.city}</Text>
        </View>

        {/* Follow button */}
        <View style={styles.followSection}>
          <TouchableOpacity
            onPress={handleFollow}
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFollowing ? 'checkmark' : 'person-add-outline'}
              size={16}
              color={isFollowing ? Colors.white : Colors.amber[500]}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'Suivi' : 'Suivre ce point d\'eau'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Récompenses */}
        {rewards && rewards.filter(r => r.is_active).length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>Récompenses</Text>
            {rewards.filter(r => r.is_active).map((r) => (
              <View key={r.id} style={styles.rewardRow}>
                <Text style={styles.rewardRank}>
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardTitle}>{r.title}</Text>
                  {r.description ? (
                    <Text style={styles.rewardDesc}>{r.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            onPress={() => router.push(`/perform/${barId}`)}
            style={styles.perfBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.perfBtnText}>💧 Nouvelle session ici</Text>
          </TouchableOpacity>
        </View>

        {/* Classement */}
        {(leaderboardLoading || topLeaderboard.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Classement</Text>
            {leaderboardLoading ? (
              <ActivityIndicator color={Colors.amber[500]} />
            ) : (
              <>
                {topLeaderboard.map((p: any, i: number) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => router.push(`/performance/${p.id}`)}
                    style={styles.perfRow}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rankText}>#{i + 1}</Text>
                    <Avatar uri={p.profiles?.avatar_url} name={p.profiles?.username ?? '?'} size={36} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.perfUser}>{p.profiles?.username ?? 'Anonyme'}</Text>
                    </View>
                    <TimeBadge timeMs={p.time_ms} size="sm" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/classement')}
                  style={styles.voirPlusBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voirPlusText}>Voir plus</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.amber[500]} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Yermats récents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yermats récents</Text>
          {perfsLoading ? (
            <ActivityIndicator color={Colors.amber[500]} />
          ) : !perfs?.length ? (
            <Text style={styles.emptyText}>Aucun Yermat encore</Text>
          ) : (
            <>
              {perfs.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => router.push(`/performance/${p.id}`)}
                  style={styles.perfRow}
                  activeOpacity={0.8}
                >
                  <Avatar uri={p.profiles?.avatar_url} name={p.profiles?.username ?? '?'} size={36} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.perfUser}>{p.profiles?.username ?? 'Anonyme'}</Text>
                    <Text style={styles.perfDate}>{formatRelativeDate(p.created_at)}</Text>
                  </View>
                  {p.time_ms > 0 && <TimeBadge timeMs={p.time_ms} size="sm" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/classement')}
                style={styles.voirPlusBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.voirPlusText}>Voir plus</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.amber[500]} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  followSection: { paddingHorizontal: 16, marginBottom: 16 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.amber[500],
    paddingVertical: 12,
  },
  followBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  followBtnText: { color: Colors.amber[500], fontWeight: '700', fontSize: 15 },
  followBtnTextActive: { color: Colors.white },
  barCard: {
    margin: 16, backgroundColor: Colors.bgElevated, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 8,
  },
  barEmoji: { fontSize: 40 },
  barName: { color: Colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  barAddress: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
  rankText: {
    color: Colors.textSecondary, fontSize: 13, fontWeight: '700', width: 32,
  },
  infoSection: { paddingHorizontal: 16, marginBottom: 16 },
  infoSectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pricesRow: { flexDirection: 'row', gap: 8 },
  priceChip: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceChipLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  priceChipValue: { color: Colors.amber[500], fontSize: 16, fontWeight: '800' },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  rewardRank: { fontSize: 22 },
  rewardTitle: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  rewardDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  ctaSection: { paddingHorizontal: 16, marginBottom: 20 },
  perfBtn: {
    backgroundColor: Colors.amber[500], borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  perfBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 13 },
  perfRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  perfUser: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  perfDate: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  voirPlusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  voirPlusText: { color: Colors.amber[500], fontSize: 13, fontWeight: '600' },
});
