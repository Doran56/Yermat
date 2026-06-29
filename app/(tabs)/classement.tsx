import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { startOfMonth, subMonths, addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useClassement } from '@/hooks/useClassement';
import { useChallengeTypes } from '@/hooks/useChallengeTypes';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Colors } from '@/constants/colors';

const GENDERS = [
  { key: null, label: 'Mixte' },
  { key: 'male', label: 'Hommes' },
  { key: 'female', label: 'Femmes' },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_ORDER = [1, 0, 2]; // visual left=2nd, center=1st, right=3rd
const PODIUM_ELEVATION = [12, 28, 0]; // marginBottom per visual position

export default function ClassementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [gender, setGender] = useState<string | null>(null);
  const [challengeTypeId, setChallengeTypeId] = useState<string | null>(null);
  const [barId, setBarId] = useState<string | null>(null);
  const [barSearch, setBarSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: performances, isLoading, refetch: refetchClassement } = useClassement({ challengeTypeId, gender, username: null, month });
  const { data: challengeTypes, refetch: refetchChallengeTypes } = useChallengeTypes();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchClassement(), refetchChallengeTypes()]);
    setRefreshing(false);
  }, [refetchClassement, refetchChallengeTypes]);

  const canGoNext = addMonths(month, 1) <= startOfMonth(new Date());

  const bars = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const p of performances ?? []) {
      if ((p as any).bar_id && (p as any).bars?.name && !seen.has((p as any).bar_id)) {
        seen.add((p as any).bar_id);
        list.push({ id: (p as any).bar_id, name: (p as any).bars.name });
      }
    }
    return list;
  }, [performances]);

  const filteredBars = useMemo(
    () => !barSearch.trim()
      ? bars
      : bars.filter(b => b.name.toLowerCase().includes(barSearch.toLowerCase())),
    [bars, barSearch]
  );

  const displayedPerformances = useMemo(
    () => !barId ? (performances ?? []) : (performances ?? []).filter((p: any) => p.bar_id === barId),
    [performances, barId]
  );

  const activeFilterCount = [gender !== null, challengeTypeId !== null, barId !== null].filter(Boolean).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Text style={styles.title}>Classement</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(s => !s)}
          style={styles.filterBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={22}
            color={showFilters ? Colors.amber[500] : Colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Mois */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Mois</Text>
              <View style={styles.monthRow}>
                <TouchableOpacity onPress={() => setMonth(m => subMonths(m, 1))} style={styles.monthBtn}>
                  <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy', { locale: fr })}</Text>
                <TouchableOpacity
                  onPress={() => canGoNext && setMonth(m => addMonths(m, 1))}
                  style={[styles.monthBtn, !canGoNext && { opacity: 0.3 }]}
                  disabled={!canGoNext}
                >
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Genre */}
            <View style={[styles.filterSection, styles.filterSectionBorder]}>
              <Text style={styles.filterSectionLabel}>Genre</Text>
              <View style={styles.pickerList}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={String(g.key)}
                    onPress={() => setGender(g.key)}
                    style={[styles.pickerOption, gender === g.key && styles.pickerOptionActive]}
                  >
                    <Text style={[styles.pickerOptionText, gender === g.key && styles.pickerOptionTextActive]}>
                      {g.label}
                    </Text>
                    {gender === g.key && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Challenge */}
            <View style={[styles.filterSection, styles.filterSectionBorder]}>
              <Text style={styles.filterSectionLabel}>Challenge</Text>
              <View style={styles.pickerList}>
                <TouchableOpacity
                  onPress={() => setChallengeTypeId(null)}
                  style={[styles.pickerOption, challengeTypeId === null && styles.pickerOptionActive]}
                >
                  <Text style={[styles.pickerOptionText, challengeTypeId === null && styles.pickerOptionTextActive]}>
                    Tous
                  </Text>
                  {challengeTypeId === null && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </TouchableOpacity>
                {challengeTypes?.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setChallengeTypeId(c.id)}
                    style={[styles.pickerOption, challengeTypeId === c.id && styles.pickerOptionActive]}
                  >
                    <Text style={[styles.pickerOptionText, challengeTypeId === c.id && styles.pickerOptionTextActive]}>
                      {c.name}
                    </Text>
                    {challengeTypeId === c.id && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bar */}
            {bars.length > 0 && (
              <View style={[styles.filterSection, styles.filterSectionBorder]}>
                <Text style={styles.filterSectionLabel}>Bar</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un bar…"
                  placeholderTextColor={Colors.textSecondary}
                  value={barSearch}
                  onChangeText={setBarSearch}
                  clearButtonMode="while-editing"
                />
                <View style={styles.pickerList}>
                  <TouchableOpacity
                    onPress={() => setBarId(null)}
                    style={[styles.pickerOption, barId === null && styles.pickerOptionActive]}
                  >
                    <Text style={[styles.pickerOptionText, barId === null && styles.pickerOptionTextActive]}>
                      Tous les bars
                    </Text>
                    {barId === null && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </TouchableOpacity>
                  {filteredBars.map(b => (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setBarId(b.id)}
                      style={[styles.pickerOption, barId === b.id && styles.pickerOptionActive]}
                    >
                      <Text style={[styles.pickerOptionText, barId === b.id && styles.pickerOptionTextActive]}>
                        {b.name}
                      </Text>
                      {barId === b.id && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.amber[500]} />
        </View>
      ) : !displayedPerformances?.length ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>Aucune performance ce mois-ci</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.amber[500]}
            />
          }
        >
          {/* Podium top 3 */}
          <View style={styles.podium}>
            {PODIUM_ORDER.map((rankIdx, visualPos) => {
              const p = (displayedPerformances as any[])[rankIdx];
              if (!p) return null;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => router.push(`/performance/${p.id}`)}
                  style={[styles.podiumCard, { marginBottom: PODIUM_ELEVATION[visualPos] }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.medalEmoji}>{MEDALS[rankIdx]}</Text>
                  <Avatar uri={p.profiles?.avatar_url} name={p.profiles?.username} size={44} />
                  <Text style={styles.podiumName} numberOfLines={1}>{p.profiles?.username}</Text>
                  <TimeBadge timeMs={p.time_ms} size="sm" />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Rest of the list */}
          {(displayedPerformances as any[]).slice(3).map((p: any, i: number) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => router.push(`/performance/${p.id}`)}
              style={styles.listRow}
              activeOpacity={0.8}
            >
              <Text style={styles.rank}>#{i + 4}</Text>
              <Avatar uri={p.profiles?.avatar_url} name={p.profiles?.username} size={36} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listName}>{p.profiles?.username}</Text>
                <Text style={styles.listBar} numberOfLines={1}>{p.bars?.name ?? '—'}</Text>
              </View>
              <TimeBadge timeMs={p.time_ms} size="sm" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  filterBtn: { padding: 6, position: 'relative' },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.amber[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },

  // Filter panel
  filterPanel: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  filterSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  monthBtn: { padding: 6 },
  monthLabel: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize', textAlign: 'center' },
  searchInput: {
    backgroundColor: Colors.bgElevated2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 13,
    marginBottom: 8,
  },
  pickerList: { gap: 2 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerOptionActive: { backgroundColor: Colors.amber[500] },
  pickerOptionText: { color: Colors.text, fontSize: 14 },
  pickerOptionTextActive: { color: Colors.white, fontWeight: '700' },

  // Podium
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  podiumCard: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    alignItems: 'center',
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medalEmoji: { fontSize: 28 },
  podiumName: { color: Colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // List
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rank: { color: Colors.textSecondary, fontSize: 13, width: 32, fontWeight: '600' },
  listName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  listBar: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
