import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsAdmin, useAllPerformances, useModeratePerformance } from '@/hooks/useAdmin';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Badge } from '@/components/ui/Badge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';
import { PerformanceWithDetails } from '@/types/database';

type StatusFilter = 'pending' | 'all' | 'approved' | 'rejected' | 'unverified';
type ModerateStatus = 'approved' | 'rejected' | 'unverified';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pending',    label: 'En attente' },
  { key: 'all',        label: 'Tous' },
  { key: 'approved',   label: 'Certifiées' },
  { key: 'rejected',   label: 'Censurées' },
  { key: 'unverified', label: 'Non cert.' },
];

const STATUS_CONFIG = {
  pending:    { label: 'En attente',    color: Colors.zinc[400] },
  approved:   { label: 'Certifiée ✓',  color: Colors.emerald[500] },
  rejected:   { label: 'Censurée',     color: Colors.red[500] },
  unverified: { label: 'Non certifiée', color: Colors.zinc[400] },
} as const;

// Available re-moderation actions per current status
const ACTIONS: Record<ModerateStatus, {
  status: ModerateStatus; label: string; color: string; needsForm: boolean;
}> = {
  approved:   { status: 'approved',   label: '✅ Certifier',     color: Colors.emerald[500], needsForm: true  },
  unverified: { status: 'unverified', label: '📋 Non certifier', color: Colors.zinc[400],    needsForm: false },
  rejected:   { status: 'rejected',   label: '❌ Censurer',      color: Colors.red[500],     needsForm: false },
};

function actionsFor(status: string) {
  return (['approved', 'unverified', 'rejected'] as ModerateStatus[]).filter(s => s !== status).map(s => ACTIONS[s]);
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const {
    data: performances,
    isLoading,
    refetch,
    isRefetching,
  } = useAllPerformances(statusFilter === 'all' ? undefined : statusFilter);

  const moderate = useModeratePerformance();

  useEffect(() => {
    if (!checkingAdmin && isAdmin === false) {
      router.replace('/(tabs)');
    }
  }, [isAdmin, checkingAdmin, router]);

  const handleModerate = async (perf: PerformanceWithDetails, newStatus: ModerateStatus) => {
    await moderate.mutateAsync({ performanceId: perf.id, newStatus, comment });
    setExpandedId(null);
    setComment('');
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); setComment(''); }
    else { setExpandedId(id); setComment(''); }
  };

  if (checkingAdmin || (isAdmin === undefined && !checkingAdmin)) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.amber[500]} />
      </View>
    );
  }

  const renderItem = ({ item: p }: { item: PerformanceWithDetails }) => {
    const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
    const isExpanded = expandedId === p.id;
    const actions = actionsFor(p.status);
    const isPending = p.status === 'pending';

    return (
      <View style={styles.card}>
        <View style={[styles.statusStripe, { backgroundColor: cfg.color }]} />

        <View style={styles.cardBody}>
          {/* Header row */}
          <View style={styles.userRow}>
            <Avatar uri={p.profiles?.avatar_url} name={p.profiles?.username ?? '?'} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>{p.profiles?.username ?? 'Anonyme'}</Text>
              {p.bars && <Text style={styles.barName}>{p.bars.name}</Text>}
            </View>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          {/* Info chips */}
          <View style={styles.chipsRow}>
            {p.challenge_types && <Badge label={p.challenge_types.name} variant="amber" />}
            {p.time_ms > 0 && <TimeBadge timeMs={p.time_ms} size="sm" />}
            {p.video_url ? (
              <View style={styles.chip}>
                <Ionicons name="videocam" size={11} color={Colors.emerald[500]} />
                <Text style={[styles.chipText, { color: Colors.emerald[500] }]}>Vidéo</Text>
              </View>
            ) : (
              <View style={[styles.chip, { backgroundColor: Colors.zinc[800] }]}>
                <Ionicons name="videocam-off-outline" size={11} color={Colors.zinc[600]} />
                <Text style={[styles.chipText, { color: Colors.zinc[600] }]}>Sans vidéo</Text>
              </View>
            )}
            <Text style={styles.date}>{formatRelativeDate(p.created_at)}</Text>
          </View>

          {/* Action buttons — pending: primary zone, others: re-moderation zone */}
          {actions.length > 0 && (
            <View>
              {!isPending && (
                <Text style={styles.reModLabel}>Modifier statut</Text>
              )}
              <View style={styles.actionsRow}>
                {actions.map(action => (
                  <TouchableOpacity
                    key={action.status}
                    onPress={() => action.needsForm ? toggleExpand(p.id) : handleModerate(p, action.status)}
                    style={[
                      styles.actionBtn,
                      { borderColor: action.color },
                      action.needsForm && isExpanded && { backgroundColor: action.color + '1A' },
                    ]}
                    activeOpacity={0.8}
                    disabled={moderate.isPending}
                  >
                    <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Inline certification form (shared for pending + re-moderation) */}
          {isExpanded && (
            <View style={styles.form}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Commentaire de modération (optionnel)…"
                placeholderTextColor={Colors.zinc[600]}
                style={styles.formInput}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                onPress={() => handleModerate(p, 'approved')}
                style={styles.confirmBtn}
                activeOpacity={0.85}
                disabled={moderate.isPending}
              >
                {moderate.isPending
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.confirmBtnText}>Confirmer la certification</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Espace Admin"
        onBack={() => router.back()}
        style={{ borderBottomWidth: 1, borderBottomColor: Colors.zinc[800] }}
      />

      {/* Reports shortcut (modération UGC < 24h) */}
      <TouchableOpacity
        onPress={() => router.push('/admin/reports' as never)}
        style={[styles.barMgmtBtn, { backgroundColor: Colors.zinc[800], marginBottom: 0 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="flag-outline" size={16} color={Colors.white} />
        <Text style={[styles.barMgmtText, { color: Colors.white }]}>Signalements</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.white} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* Bar management shortcut */}
      <TouchableOpacity
        onPress={() => router.push('/admin/bars')}
        style={styles.barMgmtBtn}
        activeOpacity={0.8}
      >
        <Ionicons name="water-outline" size={16} color={Colors.white} />
        <Text style={styles.barMgmtText}>Gestion des points d'eau</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.white} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* Filter tabs — scrollable horizontally to fit 5 tabs */}
      <View style={styles.tabs}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => { setStatusFilter(f.key); setExpandedId(null); setComment(''); }}
            style={[styles.tab, statusFilter === f.key && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, statusFilter === f.key && styles.tabLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.amber[500]} />
        </View>
      ) : (
        <FlatList
          data={performances}
          keyExtractor={p => p.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.amber[500]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.center, { marginTop: 80, gap: 12 }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.zinc[600]} />
              <Text style={styles.emptyText}>
                {statusFilter === 'pending'
                  ? 'Aucun Yermat en attente'
                  : 'Aucun Yermat'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.zinc[950] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Colors.zinc[800],
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', paddingHorizontal: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.amber[500] },
  tabLabel: { color: Colors.zinc[400], fontSize: 11, fontWeight: '600' },
  tabLabelActive: { color: Colors.amber[500] },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.zinc[900],
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.zinc[800],
  },
  statusStripe: { width: 4 },
  cardBody: { flex: 1, padding: 12, gap: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  barName: { color: Colors.zinc[400], fontSize: 11, marginTop: 1 },
  statusText: { fontSize: 12, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.emerald[500] + '22',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  chipText: { fontSize: 10, fontWeight: '600' },
  date: { color: Colors.zinc[600], fontSize: 11 },
  reModLabel: {
    color: Colors.zinc[600],
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  actionsRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: 'center', borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  form: { gap: 8 },
  formInput: {
    backgroundColor: Colors.zinc[800], borderRadius: 8,
    padding: 10, color: Colors.white, fontSize: 13,
    borderWidth: 1, borderColor: Colors.zinc[700],
    minHeight: 56,
  },
  confirmBtn: {
    backgroundColor: Colors.amber[500], borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  emptyText: { color: Colors.zinc[400], fontSize: 14, textAlign: 'center' },
  barMgmtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.amber[500],
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  barMgmtText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
