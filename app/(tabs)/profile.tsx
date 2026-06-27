import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
  useWindowDimensions, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useProfileStats, useUserMedals } from '@/hooks/useProfileStats';
import { useUserPerformances } from '@/hooks/usePerformances';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { EULA_URL, PRIVACY_URL } from '@/constants/legal';
import {
  computeLevel, computeXpProgress, computeTitle, getTitleEmoji,
  getMedalEmoji, formatTime,
  computeSpeed, formatSpeed, formatVolume,
  type LevelTitle, type MedalRank,
} from '@/lib/gamification';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

// ─── Helpers locaux ────────────────────────────────────────────────────────────

type HydroPeriod = 'day' | 'week' | 'month' | 'year';
const HYDRO_PERIODS: { key: HydroPeriod; label: string }[] = [
  { key: 'day',   label: 'Jour' },
  { key: 'week',  label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year',  label: 'Année' },
];

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

// ─── PerformanceThumb ──────────────────────────────────────────────────────────
// Extrait le premier frame en image statique (pas de player → page légère)

function PerformanceThumb({
  performance,
  thumbSize,
  onPress,
}: {
  performance: any;
  thumbSize: number;
  onPress: () => void;
}) {
  const hasVideo = !!performance.video_url;
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    if (!hasVideo) return;
    let cancelled = false;
    getThumbnailAsync(performance.video_url, { time: 0 })
      .then(({ uri }) => { if (!cancelled) setThumbUri(uri); })
      .catch(() => { if (!cancelled) setThumbError(true); });
    return () => { cancelled = true; };
  }, [performance.video_url]);

  const showFallback = !hasVideo || thumbError;
  const showLoader = hasVideo && !thumbUri && !thumbError;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: thumbSize, height: thumbSize, backgroundColor: Colors.bgElevated }}
    >
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : showLoader ? (
        <View style={[StyleSheet.absoluteFill, thumbSt.fallback]}>
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        </View>
      ) : showFallback ? (
        <View style={[StyleSheet.absoluteFill, thumbSt.fallback]}>
          <Ionicons name="water-outline" size={22} color={Colors.textSecondary} />
        </View>
      ) : null}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 5 }]}
      >
        <TimeBadge timeMs={performance.time_ms} size="sm" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const thumbSt = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Sous-composants ───────────────────────────────────────────────────────────

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

// ─── ProfileScreen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - 32 - 4) / 3);

  const { user, profile, signOut } = useAuth();
  const deleteAccount = useDeleteAccount();
  const { data: stats, refetch: refetchStats } = useProfileStats(user?.id);
  const { data: medals, refetch: refetchMedals } = useUserMedals(user?.id);
  const { data: myPerfs, isLoading: perfsLoading, refetch: refetchPerfs } = useUserPerformances(user?.id);
  const { data: isAdmin } = useIsAdmin();

  const level = computeLevel(profile?.xp ?? 0);
  const xp = computeXpProgress(profile?.xp ?? 0);
  const title = computeTitle(level);
  const titleColor = getTitleColorHex(title);
  const titleEmoji = getTitleEmoji(title);

  // Suivi d'hydratation : consommation par période + meilleure vitesse L/s
  const [hydroPeriod, setHydroPeriod] = useState<HydroPeriod>('day');
  const hydro = useMemo(() => {
    const perfs = myPerfs ?? [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let since: Date;
    switch (hydroPeriod) {
      case 'week': {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi
        since = d;
        break;
      }
      case 'month': since = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year':  since = new Date(now.getFullYear(), 0, 1); break;
      default:      since = startOfDay;
    }
    let totalMl = 0;
    let bestSpeed = 0;
    for (const p of perfs) {
      if (p.volume_ml && new Date(p.created_at) >= since) totalMl += p.volume_ml;
      const s = computeSpeed(p.volume_ml, p.time_ms);
      if (s > bestSpeed) bestSpeed = s;
    }
    return { totalMl, bestSpeed };
  }, [myPerfs, hydroPeriod]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchMedals(), refetchPerfs()]);
    setRefreshing(false);
  }, [refetchStats, refetchMedals, refetchPerfs]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est définitive et irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Confirmer la suppression',
            'Toutes tes vidéos, performances et données seront supprimées définitivement. Continuer ?',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer définitivement',
                style: 'destructive',
                onPress: () => deleteAccount.mutate(undefined, {
                  onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible'),
                }),
              },
            ]
          ),
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[st.container, st.center, { paddingTop: insets.top }]}>
        <Ionicons name="person-circle-outline" size={64} color={Colors.textSecondary} />
        <Text style={st.unauthText}>Connecte-toi pour voir ton profil</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)')} style={st.ctaBtn} activeOpacity={0.85}>
          <Text style={st.ctaBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={st.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.brand} />
      }
    >
      {/* ══ HEADER HERO ════════════════════════════════════════════════ */}
      <View style={[st.headerZone, { paddingTop: insets.top + 16 }]}>
        <View style={st.headerRow}>
          {/* Avatar avec ring amber */}
          <View style={st.avatarRing}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.username ?? user.email ?? ''}
              size={90}
            />
            <View style={st.levelBadge}>
              <Text style={st.levelBadgeText}>{level}</Text>
            </View>
          </View>

          {/* Infos utilisateur */}
          <View style={st.userInfo}>
            <Text style={st.username} numberOfLines={1}>
              {profile?.username ?? 'Utilisateur'}
            </Text>
            <Text style={[st.titleText, { color: titleColor }]}>
              {titleEmoji} {title}
            </Text>
            {/* Stats inline — pas de doublon avec la section Stats */}
            <Text style={st.quickStats}>
              {stats?.totalPerformances ?? '–'} perfs · {stats?.totalBarsVisited ?? '–'} bars
            </Text>
          </View>
        </View>
      </View>

      {/* ══ STATS & ÉVOLUTION ══════════════════════════════════════════ */}
      <View style={st.section}>
        <SectionHeader icon="bar-chart-outline" title="Stats & évolution" />

        {/* Carte meilleur temps (full width) */}
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

        {/* Suivi d'hydratation : consommation + vitesse L/s */}
        <Card variant="outlined" style={st.hydroCard}>
          <View style={st.hydroPeriodRow}>
            {HYDRO_PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setHydroPeriod(p.key)}
                style={[st.hydroChip, hydroPeriod === p.key && st.hydroChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[st.hydroChipText, hydroPeriod === p.key && st.hydroChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={st.hydroStatsRow}>
            <View style={st.hydroStat}>
              <Ionicons name="water" size={18} color={Colors.brand} />
              <Text style={st.hydroValue}>{formatVolume(hydro.totalMl)}</Text>
              <Text style={st.hydroLabel}>Consommation</Text>
            </View>
            <View style={st.hydroDivider} />
            <View style={st.hydroStat}>
              <Ionicons name="speedometer-outline" size={18} color={Colors.brand} />
              <Text style={st.hydroValue}>{formatSpeed(hydro.bestSpeed)}</Text>
              <Text style={st.hydroLabel}>Meilleure vitesse</Text>
            </View>
          </View>
        </Card>

        {/* Grille 2 stats (filmées + médailles) */}
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

        {/* Progression XP */}
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
            trailing={
              <Text style={st.countText}>{medals.length}</Text>
            }
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
                  {/* Ligne supérieure : emoji + rang/mois */}
                  <View style={st.medalTopRow}>
                    <Text style={st.medalEmoji}>{getMedalEmoji(rank)}</Text>
                    <View style={{ gap: 2 }}>
                      <Text style={[st.medalRankLabel, { color: rankTextColor(rank) }]}>
                        {rankLabel(rank)}
                      </Text>
                      {!!monthStr && <Text style={st.medalMonth}>{monthStr}</Text>}
                    </View>
                  </View>

                  {/* Séparateur */}
                  <View style={st.medalSeparator} />

                  {/* Catégorie */}
                  <Text style={st.medalCategoryLabel} numberOfLines={2}>
                    {m.categoryLabel}
                  </Text>

                  {/* Meilleur temps */}
                  {!!m.bestTime && (
                    <View style={st.medalMetaRow}>
                      <Ionicons name="stopwatch-outline" size={12} color={Colors.textTertiary} />
                      <Text style={st.medalMetaValue}>{formatTime(m.bestTime)}</Text>
                    </View>
                  )}

                  {/* Ville du bar (pour les médailles de bar seulement) */}
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

      {/* ══ HISTORIQUE ═════════════════════════════════════════════════ */}
      <View style={{ marginBottom: 28 }}>
        {/* Header avec padding */}
        <View style={[st.sectionHeaderRow, { paddingHorizontal: 16, marginBottom: 12 }]}>
          <Ionicons name="film-outline" size={16} color={Colors.textSecondary} />
          <Text style={[st.sectionTitle, { marginLeft: 6, flex: 1 }]}>Mon historique</Text>
          {myPerfs && (
            <Text style={st.countText}>
              {myPerfs.length} perf{myPerfs.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {perfsLoading ? (
          <ActivityIndicator color={Colors.brand} style={{ marginTop: 20 }} />
        ) : !myPerfs?.length ? (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="videocam-off-outline"
              title="Aucune performance"
              description="Lance-toi ! Ta première perf apparaîtra ici."
              style={{ paddingVertical: 40 }}
            />
          </View>
        ) : (
          /* Grille 3 colonnes flush (style Instagram) */
          <View style={[st.perfGrid, { paddingHorizontal: 16 }]}>
            {myPerfs.map((p: any) => (
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

      {/* ══ PARAMÈTRES (en dernier) ════════════════════════════════════ */}
      <View style={[st.section, { marginBottom: 40 }]}>
        <SectionHeader icon="settings-outline" title="Paramètres" />
        <Card variant="outlined" style={{ overflow: 'hidden' }}>
          <ListRow
            leading={<Ionicons name="person-outline" size={18} color={Colors.textSecondary} />}
            title="Modifier le profil"
            trailing={<Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />}
            onPress={() => Alert.alert('Bientôt disponible', 'La modification du profil arrive bientôt.')}
            divider
          />
          <ListRow
            leading={<Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />}
            title="Conditions d'utilisation (CGU)"
            trailing={<Ionicons name="open-outline" size={16} color={Colors.textSecondary} />}
            onPress={() => Linking.openURL(EULA_URL)}
            divider
          />
          <ListRow
            leading={<Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />}
            title="Politique de confidentialité"
            trailing={<Ionicons name="open-outline" size={16} color={Colors.textSecondary} />}
            onPress={() => Linking.openURL(PRIVACY_URL)}
            divider
          />
          {isAdmin && (
            <ListRow
              leading={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.brand} />}
              title="Espace Admin"
              trailing={<Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />}
              onPress={() => router.push('/admin')}
              divider
            />
          )}
          <TouchableOpacity onPress={signOut} activeOpacity={0.75}>
            <View style={[st.logoutRow, { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle }]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.text} />
              <Text style={[st.logoutText, { color: Colors.text }]}>Se déconnecter</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.75} disabled={deleteAccount.isPending}>
            <View style={st.logoutRow}>
              {deleteAccount.isPending ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              )}
              <Text style={st.logoutText}>Supprimer mon compte</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingBottom: 20 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },

  // Header hero
  headerZone: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
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
  levelBadgeText: { color: Colors.black, fontSize: 10, fontWeight: '800' },
  userInfo: { flex: 1, gap: 4 },
  username: { color: Colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  titleText: { fontSize: 13, fontWeight: '600' },
  quickStats: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  countText: { color: Colors.textTertiary, fontSize: 12 },

  // Best time card
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

  // Hydratation (consommation + vitesse)
  hydroCard: { padding: 14, marginTop: 8, gap: 14 },
  hydroPeriodRow: { flexDirection: 'row', gap: 6 },
  hydroChip: {
    flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border,
  },
  hydroChipActive: { backgroundColor: Colors.brand + '18', borderColor: Colors.brand },
  hydroChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  hydroChipTextActive: { color: Colors.brand },
  hydroStatsRow: { flexDirection: 'row', alignItems: 'center' },
  hydroStat: { flex: 1, alignItems: 'center', gap: 3 },
  hydroDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border, marginVertical: 4 },
  hydroValue: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  hydroLabel: { color: Colors.textSecondary, fontSize: 11 },

  // Mini stats (2 cols)
  miniStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
  statCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },

  // XP card
  xpCard: { padding: 16, gap: 0 },
  xpCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  xpCardLevel: { color: Colors.brand, fontSize: 12, fontWeight: '700' },
  xpTrack: { height: 8, backgroundColor: Colors.bgElevated2, borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  xpFill: { height: 8, backgroundColor: Colors.brand, borderRadius: 99 },
  xpCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpCardSub: { color: Colors.textSecondary, fontSize: 11 },
  xpCardNext: { color: Colors.textTertiary, fontSize: 11 },

  // Médailles
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

  // Historique grid
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },

  // Paramètres
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  logoutText: { color: Colors.error, fontSize: 14, fontWeight: '600' },

  // Non connecté
  unauthText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  ctaBtn: { backgroundColor: Colors.brand, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  ctaBtnText: { color: Colors.black, fontWeight: '700', fontSize: 15 },
});
