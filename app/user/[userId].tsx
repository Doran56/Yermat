import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useProfileStats, useUserMedals } from '@/hooks/useProfileStats';
import { useUserPerformances } from '@/hooks/usePerformances';
import { useFollows } from '@/hooks/useFollows';
import {
  computeLevel, computeXpProgress, computeTitle, getTitleEmoji,
  getMedalEmoji, formatTime,
  type LevelTitle, type MedalRank,
} from '@/lib/gamification';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PerformanceThumb } from '@/components/profile/PerformanceThumb';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

// ─── Helpers locaux (repris de app/(tabs)/profile.tsx) ─────────────────────────

function getTitleColorHex(title: LevelTitle): string {
  switch (title) {
    case 'Goutte':  return Colors.textSecondary;
    case 'Gorgée':  return Colors.accent;
    case 'Torrent': return Colors.brand;
    case 'Océan':   return Colors.brandDark;
  }
}

function getMedalBorderColor(rank: MedalRank): string {
  switch (rank) {
    case 1: return '#FBBF24'; // amber-400
    case 2: return '#94A3B8'; // slate-400
    case 3: return '#D97706'; // amber-600
  }
}

function rankLabel(rank: MedalRank): string {
  switch (rank) {
    case 1: return 'Or';
    case 2: return 'Argent';
    case 3: return 'Bronze';
  }
}

function rankTextColor(rank: MedalRank): string {
  switch (rank) {
    case 1: return Colors.brand;         // amber
    case 2: return '#94A3B8';            // slate-400
    case 3: return '#D97706';            // amber-600
  }
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function SectionHeader({ icon, title, trailing }: { icon: IoniconName; title: string; trailing?: React.ReactNode }) {
  return (
    <View style={st.sectionHeaderRow}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      <Text style={[st.sectionTitle, { marginLeft: 6, flex: 1 }]}>{title}</Text>
      {trailing}
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  iconColor = Colors.textSecondary,
}: {
  icon: IoniconName;
  value: string;
  label: string;
  iconColor?: string;
}) {
  return (
    <Card variant="outlined" style={st.statCard}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </Card>
  );
}

// ─── UserProfileScreen ──────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - 32 - 4) / 3);

  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile(userId);
  const { data: stats, refetch: refetchStats } = useProfileStats(userId);
  const { data: medals, refetch: refetchMedals } = useUserMedals(userId);
  const { data: perfs, isLoading: perfsLoading, refetch: refetchPerfs } = useUserPerformances(userId);
  const { userFollows, toggleUserFollow } = useFollows();

  const isOwnProfile = !!user && user.id === userId;
  const isFollowing = userFollows.some((f: any) => f.following_id === userId);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchStats(), refetchMedals(), refetchPerfs()]);
    setRefreshing(false);
  }, [refetchProfile, refetchStats, refetchMedals, refetchPerfs]);

  const handleFollowPress = () => {
    if (!user) { router.push('/(auth)'); return; }
    toggleUserFollow(userId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (profileLoading) return <LoadingScreen />;

  const level = computeLevel(profile?.xp ?? 0);
  const xp = computeXpProgress(profile?.xp ?? 0);
  const title = computeTitle(level);
  const titleColor = getTitleColorHex(title);
  const titleEmoji = getTitleEmoji(title);

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={profile?.username ?? 'Profil'} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.brand} />
        }
      >
        {/* ══ HEADER HERO ════════════════════════════════════════════════ */}
        <View style={st.headerZone}>
          <View style={st.headerRow}>
            <View style={st.avatarRing}>
              <Avatar
                uri={profile?.avatar_url}
                name={profile?.username ?? ''}
                size={90}
              />
              <View style={st.levelBadge}>
                <Text style={st.levelBadgeText}>{level}</Text>
              </View>
            </View>

            <View style={st.userInfo}>
              <Text style={st.username} numberOfLines={1}>
                {profile?.username ?? 'Utilisateur'}
              </Text>
              <Text style={[st.titleText, { color: titleColor }]}>
                {titleEmoji} {title}
              </Text>
              <Text style={st.quickStats}>
                {stats?.totalPerformances ?? '–'} Yermats · {stats?.totalBarsVisited ?? '–'} points d'eau
              </Text>
            </View>
          </View>

          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleFollowPress}
              style={[st.followBtn, isFollowing && st.followBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[st.followBtnText, isFollowing && st.followBtnTextActive]}>
                {isFollowing ? 'Suivi' : '+ Suivre'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ══ STATS & ÉVOLUTION ══════════════════════════════════════════ */}
        <View style={st.section}>
          <SectionHeader icon="bar-chart-outline" title="Stats" />

          {stats ? (
            <Card variant="outlined" style={st.bestTimeCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={st.bestTimeLabel}>Meilleur temps</Text>
                {stats.bestPerformance ? (
                  <>
                    <View style={st.bestTimeRow}>
                      <Text style={st.bestTimeValue}>
                        {formatTime(stats.bestPerformance.time)}
                      </Text>
                      {!!stats.bestPerformance.barName && (
                        <Text style={st.bestTimeBar} numberOfLines={1}>
                          {stats.bestPerformance.barName}
                        </Text>
                      )}
                    </View>
                    {!!stats.bestPerformance.barCity && (
                      <Text style={st.bestTimeCity}>{stats.bestPerformance.barCity}</Text>
                    )}
                  </>
                ) : (
                  <Text style={st.bestTimeEmpty}>–</Text>
                )}
              </View>
              <Ionicons
                name="trophy"
                size={32}
                color={stats.bestPerformance ? Colors.brand : Colors.textTertiary}
              />
            </Card>
          ) : (
            <ActivityIndicator color={Colors.brand} style={{ marginVertical: 20 }} />
          )}

          {stats && (
            <View style={st.miniStatsRow}>
              <StatCard
                icon="camera-outline"
                value={`${stats.filmedRate}%`}
                label="Filmées"
              />
              <StatCard
                icon="medal-outline"
                value={medals ? String(medals.length) : '–'}
                label="Médailles"
                iconColor={Colors.brand}
              />
            </View>
          )}

          <Card variant="outlined" style={st.xpCard}>
            <View style={st.xpCardHeader}>
              <Ionicons name="star" size={15} color={Colors.brand} />
              <Text style={[st.statLabel, { marginLeft: 6, flex: 1 }]}>Progression XP</Text>
              <Text style={st.xpCardLevel}>Niv. {level}</Text>
            </View>
            <View style={st.xpTrack}>
              <View style={[st.xpFill, { width: `${Math.max(xp.percentage, 0)}%` }]} />
            </View>
            <View style={st.xpCardFooter}>
              <Text style={st.xpCardSub}>{xp.current} / {xp.max} XP</Text>
              <Text style={st.xpCardNext}>→ Niveau {level + 1}</Text>
            </View>
          </Card>
        </View>

        {/* ══ MÉDAILLES ══════════════════════════════════════════════════ */}
        {medals && medals.length > 0 && (
          <View style={st.section}>
            <SectionHeader
              icon="medal-outline"
              title="Médailles"
              trailing={<Text style={st.countText}>{medals.length}</Text>}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {medals.map((m, i) => {
                let monthStr = '';
                try {
                  monthStr = format(new Date((m.month ?? '') + '-01'), 'MMM yyyy', { locale: fr });
                } catch { /* ignore */ }

                const rank = m.rank as MedalRank;
                const isBarMedal = m.category?.startsWith('bar_');

                return (
                  <View
                    key={`${m.month}-${m.category}-${i}`}
                    style={[st.medalCard, { borderColor: getMedalBorderColor(rank) }]}
                  >
                    <View style={st.medalTopRow}>
                      <Text style={st.medalEmoji}>{getMedalEmoji(rank)}</Text>
                      <View style={{ gap: 2 }}>
                        <Text style={[st.medalRankLabel, { color: rankTextColor(rank) }]}>
                          {rankLabel(rank)}
                        </Text>
                        {!!monthStr && <Text style={st.medalMonth}>{monthStr}</Text>}
                      </View>
                    </View>

                    <View style={st.medalSeparator} />

                    <Text style={st.medalCategoryLabel} numberOfLines={2}>
                      {m.categoryLabel}
                    </Text>

                    {!!m.bestTime && (
                      <View style={st.medalMetaRow}>
                        <Ionicons name="stopwatch-outline" size={12} color={Colors.textTertiary} />
                        <Text style={st.medalMetaValue}>{formatTime(m.bestTime)}</Text>
                      </View>
                    )}

                    {isBarMedal && !!(m.barCity || m.barName) && (
                      <View style={st.medalMetaRow}>
                        <Ionicons name="location-outline" size={12} color={Colors.textTertiary} />
                        <Text style={[st.medalMetaValue, { color: Colors.textTertiary }]} numberOfLines={1}>
                          {m.barCity || m.barName}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ══ PERFORMANCES PUBLIQUES ═════════════════════════════════════ */}
        <View style={{ marginBottom: 28 }}>
          <View style={[st.sectionHeaderRow, { paddingHorizontal: 16, marginBottom: 12 }]}>
            <Ionicons name="film-outline" size={16} color={Colors.textSecondary} />
            <Text style={[st.sectionTitle, { marginLeft: 6, flex: 1 }]}>Yermats publics</Text>
            {perfs && (
              <Text style={st.countText}>
                {perfs.length} perf{perfs.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {perfsLoading ? (
            <ActivityIndicator color={Colors.brand} style={{ marginTop: 20 }} />
          ) : !perfs?.length ? (
            <View style={{ paddingHorizontal: 16 }}>
              <EmptyState
                icon="videocam-off-outline"
                title="Aucun Yermat public"
                description="Cet utilisateur n'a pas encore de Yermat public."
                style={{ paddingVertical: 40 }}
              />
            </View>
          ) : (
            <View style={[st.perfGrid, { paddingHorizontal: 16 }]}>
              {perfs.map((p: any) => (
                <PerformanceThumb
                  key={p.id}
                  performance={p}
                  thumbSize={thumbSize}
                  onPress={() => router.push(`/performance/${p.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingBottom: 20 },

  headerZone: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2.5, borderColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  levelBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.brand, borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  levelBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
  userInfo: { flex: 1, gap: 4 },
  username: { color: Colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  titleText: { fontSize: 13, fontWeight: '600' },
  quickStats: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  followBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.brand,
    backgroundColor: Colors.brand,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  followBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  followBtnTextActive: { color: Colors.text },

  section: { paddingHorizontal: 16, marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  countText: { color: Colors.textTertiary, fontSize: 12 },

  bestTimeCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  bestTimeLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  bestTimeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  bestTimeValue: { color: Colors.brand, fontSize: 30, fontWeight: '800', lineHeight: 34 },
  bestTimeBar: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  bestTimeCity: { color: Colors.textTertiary, fontSize: 11 },
  bestTimeEmpty: { color: Colors.textTertiary, fontSize: 28, fontWeight: '800' },

  miniStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
  statCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },

  xpCard: { padding: 16, gap: 0 },
  xpCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  xpCardLevel: { color: Colors.brand, fontSize: 12, fontWeight: '700' },
  xpTrack: { height: 8, backgroundColor: Colors.bgElevated2, borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  xpFill: { height: 8, backgroundColor: Colors.brand, borderRadius: 99 },
  xpCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpCardSub: { color: Colors.textSecondary, fontSize: 11 },
  xpCardNext: { color: Colors.textTertiary, fontSize: 11 },

  medalCard: {
    width: 140, backgroundColor: Colors.bgElevated,
    borderRadius: 14, padding: 14, gap: 6,
    alignItems: 'flex-start', borderWidth: 1,
  },
  medalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medalEmoji: { fontSize: 32 },
  medalRankLabel: { fontSize: 12, fontWeight: '700' },
  medalMonth: { color: Colors.textTertiary, fontSize: 10 },
  medalSeparator: { height: 1, backgroundColor: Colors.border, alignSelf: 'stretch', marginVertical: 2 },
  medalCategoryLabel: { color: Colors.textSecondary, fontSize: 11, textAlign: 'left' },
  medalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  medalMetaValue: { color: Colors.text, fontSize: 11, fontWeight: '600' },

  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
});
