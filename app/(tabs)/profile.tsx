import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
  useWindowDimensions, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useProfileStats, useUserMedals } from '@/hooks/useProfileStats';
import { useUserPerformances } from '@/hooks/usePerformances';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { EULA_URL, PRIVACY_URL } from '@/constants/legal';
import {
  getMedalEmoji,
  type MedalRank,
} from '@/lib/gamification';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { PerformanceThumb } from '@/components/profile/PerformanceThumb';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

// ─── Helpers locaux ────────────────────────────────────────────────────────────

// Grille "Mon historique" : rendue par lots pour éviter de monter toutes les
// miniatures d'un coup sur un profil avec beaucoup de Yermats.
const PERF_GRID_PAGE = 30;

type HydroPeriod = 'day' | 'week' | 'month' | 'year';
const HYDRO_PERIODS: { key: HydroPeriod; label: string }[] = [
  { key: 'day',   label: 'Jour' },
  { key: 'week',  label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year',  label: 'Année' },
];

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

const CHART_HEIGHT = 72;

function ConsumptionChart({ data }: { data: { label: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <View>
      <View style={st.chartBars}>
        {data.map((d, i) => {
          const hasValue = d.value > 0;
          const barHeight = hasValue ? Math.max(6, (d.value / maxValue) * CHART_HEIGHT) : 2;
          return (
            <View key={i} style={st.chartCol}>
              <View
                style={[
                  st.chartBar,
                  {
                    height: barHeight,
                    backgroundColor: hasValue ? Colors.brand : Colors.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={st.chartBaseline} />
      <View style={st.chartLabelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={st.chartLabel} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── ProfileScreen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const thumbSize = Math.floor((screenWidth - 32 - 4) / 3);

  const navigation = useNavigation();
  const { user, profile, signOut } = useAuth();
  const deleteAccount = useDeleteAccount();
  const { data: stats, refetch: refetchStats } = useProfileStats(user?.id);
  const { data: medals, refetch: refetchMedals } = useUserMedals(user?.id);
  const { data: myPerfs, isLoading: perfsLoading, refetch: refetchPerfs } = useUserPerformances(user?.id);
  const { data: isAdmin } = useIsAdmin();

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      Promise.all([refetchStats(), refetchMedals(), refetchPerfs()]);
    });
    return unsubscribe;
  }, [navigation, refetchStats, refetchMedals, refetchPerfs]);

  // Suivi de consommation par période — répartie en buckets pour le graphique
  const [hydroPeriod, setHydroPeriod] = useState<HydroPeriod>('day');
  const hydro = useMemo(() => {
    const perfs = myPerfs ?? [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let since: Date;
    let bucketLabels: string[];
    let getBucketIndex: (d: Date) => number;

    switch (hydroPeriod) {
      case 'week': {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi
        since = d;
        bucketLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        getBucketIndex = (dt) => (dt.getDay() + 6) % 7;
        break;
      }
      case 'month': {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
        bucketLabels = ['S1', 'S2', 'S3', 'S4', 'S5'];
        getBucketIndex = (dt) => Math.min(4, Math.floor((dt.getDate() - 1) / 7));
        break;
      }
      case 'year': {
        since = new Date(now.getFullYear(), 0, 1);
        bucketLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        getBucketIndex = (dt) => dt.getMonth();
        break;
      }
      default: {
        since = startOfDay;
        bucketLabels = ['0h', '4h', '8h', '12h', '16h', '20h'];
        getBucketIndex = (dt) => Math.min(5, Math.floor(dt.getHours() / 4));
        break;
      }
    }

    const buckets = bucketLabels.map(label => ({ label, value: 0 }));
    let totalMl = 0;
    for (const p of perfs) {
      const d = new Date(p.created_at);
      if (d < since) continue;
      // volume_ml sur la perf elle-même, sinon volume du type de défi
      const vol = p.volume_ml ?? (p.challenge_types as any)?.volume_ml ?? 0;
      if (vol <= 0) continue;
      totalMl += vol;
      const idx = getBucketIndex(d);
      if (idx >= 0 && idx < buckets.length) buckets[idx].value += vol;
    }
    return { totalMl, buckets };
  }, [myPerfs, hydroPeriod]);

  const [gridVisibleCount, setGridVisibleCount] = useState(PERF_GRID_PAGE);

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
            'Toutes tes vidéos, Yermats et données seront supprimés définitivement. Continuer ?',
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
          </View>

          {/* Infos utilisateur */}
          <View style={st.userInfo}>
            <Text style={st.username} numberOfLines={1}>
              {profile?.username ?? 'Utilisateur'}
            </Text>
            {/* Stats inline — pas de doublon avec la section Stats */}
            <Text style={st.quickStats}>
              {stats?.totalPerformances ?? '–'} Yermats · {stats?.totalBarsVisited ?? '–'} points d'eau
            </Text>
          </View>
        </View>
      </View>

      <View style={st.section}>
        {!stats && (
          <ActivityIndicator color={Colors.brand} style={{ marginVertical: 20 }} />
        )}

        {/* Consommation dans le temps */}
        <Card variant="outlined" style={st.hydroCard}>
          <Text style={st.hydroTitle}>Consommation dans le temps</Text>
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
          <ConsumptionChart data={hydro.buckets} />
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
              title="Aucun Yermat"
              description="Lance-toi ! Ton premier Yermat apparaîtra ici."
              style={{ paddingVertical: 40 }}
            />
          </View>
        ) : (
          /* Grille 3 colonnes flush (style Instagram), rendue par lots */
          <>
            <View style={[st.perfGrid, { paddingHorizontal: 16 }]}>
              {myPerfs.slice(0, gridVisibleCount).map((p: any) => (
                <PerformanceThumb
                  key={p.id}
                  performance={p}
                  thumbSize={thumbSize}
                  onPress={() => router.push(`/performance/${p.id}`)}
                />
              ))}
            </View>
            {myPerfs.length > gridVisibleCount && (
              <TouchableOpacity
                onPress={() => setGridVisibleCount(c => c + PERF_GRID_PAGE)}
                style={st.loadMoreBtn}
                activeOpacity={0.8}
              >
                <Text style={st.loadMoreBtnText}>Voir plus</Text>
              </TouchableOpacity>
            )}
          </>
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
  userInfo: { flex: 1, gap: 4 },
  username: { color: Colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  quickStats: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  countText: { color: Colors.textTertiary, fontSize: 12 },

  // Consommation dans le temps
  hydroCard: { padding: 14, marginTop: 8, gap: 14 },
  hydroTitle: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  hydroPeriodRow: { flexDirection: 'row', gap: 6 },
  hydroChip: {
    flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border,
  },
  hydroChipActive: { backgroundColor: Colors.brand + '18', borderColor: Colors.brand },
  hydroChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  hydroChipTextActive: { color: Colors.brand },

  // Graphique de consommation (barres)
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: CHART_HEIGHT, gap: 3,
  },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBar: { width: '55%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartBaseline: { height: 1, backgroundColor: Colors.border },
  chartLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: 3 },
  chartLabel: { flex: 1, color: Colors.textTertiary, fontSize: 10, textAlign: 'center' },

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
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreBtnText: { color: Colors.brand, fontWeight: '600', fontSize: 14 },

  // Paramètres
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  logoutText: { color: Colors.error, fontSize: 14, fontWeight: '600' },

  // Non connecté
  unauthText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  ctaBtn: { backgroundColor: Colors.brand, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  ctaBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
