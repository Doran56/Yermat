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
import { useClassement, SearchSort } from '@/hooks/useClassement';
import { useChallengeTypes } from '@/hooks/useChallengeTypes';
import { Avatar } from '@/components/ui/Avatar';
import { TimeTag } from '@/components/ui/TimeTag';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';

const GENDERS = [
  { key: null, label: 'Mixte' },
  { key: 'male', label: 'Hommes' },
  { key: 'female', label: 'Femmes' },
];

const SORTS: { key: SearchSort; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'date_desc', label: 'Plus récents', icon: 'time-outline' },
  { key: 'time_asc', label: 'Temps', icon: 'stopwatch-outline' },
  { key: 'username_asc', label: 'Utilisateur A-Z', icon: 'person-outline' },
  { key: 'barname_asc', label: 'Bar A-Z', icon: 'location-outline' },
];

export default function ClassementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [month, setMonth] = useState<Date | null>(() => startOfMonth(new Date()));
  const [gender, setGender] = useState<string | null>(null);
  const [challengeTypeId, setChallengeTypeId] = useState<string | null>(null);
  const [barId, setBarId] = useState<string | null>(null);
  const [barSearch, setBarSearch] = useState('');
  const [username, setUsername] = useState('');
  const [sort, setSort] = useState<SearchSort>('date_desc');
  const [showFilters, setShowFilters] = useState(false);

  const { data: performances, isLoading, refetch: refetchSearch } = useClassement({
    challengeTypeId, barId: null, gender, username: username.trim() || null, month, sort,
  });
  const { data: challengeTypes, refetch: refetchChallengeTypes } = useChallengeTypes();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSearch(), refetchChallengeTypes()]);
    setRefreshing(false);
  }, [refetchSearch, refetchChallengeTypes]);

  const canGoNext = !!month && addMonths(month, 1) <= startOfMonth(new Date());

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

  const activeFilterCount = [gender !== null, challengeTypeId !== null, barId !== null, !!username.trim()].filter(Boolean).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Text style={styles.title}>Recherche</Text>
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

      {/* Tri — toujours visible */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {SORTS.map(s => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSort(s.key)}
            style={[styles.sortChip, sort === s.key && styles.sortChipActive]}
            activeOpacity={0.8}
          >
            <Ionicons name={s.icon} size={13} color={sort === s.key ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.sortChipText, sort === s.key && styles.sortChipTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
              <Text style={styles.filterSectionLabel}>Période</Text>
              <View style={styles.monthRow}>
                <TouchableOpacity
                  onPress={() => setMonth(m => subMonths(m ?? new Date(), 1))}
                  style={styles.monthBtn}
                >
                  <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMonth(m => m ? null : startOfMonth(new Date()))} style={{ flex: 1 }}>
                  <Text style={styles.monthLabel}>
                    {month ? format(month, 'MMMM yyyy', { locale: fr }) : 'Toutes les périodes'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => canGoNext && setMonth(m => addMonths(m ?? new Date(), 1))}
                  style={[styles.monthBtn, !canGoNext && { opacity: 0.3 }]}
                  disabled={!canGoNext}
                >
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Utilisateur */}
            <View style={[styles.filterSection, styles.filterSectionBorder]}>
              <Text style={styles.filterSectionLabel}>Utilisateur</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un utilisateur…"
                placeholderTextColor={Colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                clearButtonMode="while-editing"
              />
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

            {/* Volume */}
            <View style={[styles.filterSection, styles.filterSectionBorder]}>
              <Text style={styles.filterSectionLabel}>Volume</Text>
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
          <Ionicons name="search-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>Aucun Yermat trouvé</Text>
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
          {(displayedPerformances as any[]).map((p: any) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => router.push(`/performance/${p.id}`)}
              style={styles.listRow}
              activeOpacity={0.8}
            >
              <Avatar uri={p.profiles?.avatar_url} name={p.profiles?.username} size={36} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listName}>{p.profiles?.username}</Text>
                <Text style={styles.listBar} numberOfLines={1}>
                  {p.bars?.name ?? '—'} · {p.challenge_types?.name ?? ''} · {formatRelativeDate(p.created_at)}
                </Text>
              </View>
              <TimeTag timeMs={p.time_ms} />
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

  // Sort row
  sortRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgElevated,
  },
  sortChipActive: { backgroundColor: Colors.amber[500], borderColor: Colors.amber[500] },
  sortChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  sortChipTextActive: { color: Colors.white },

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

  // List
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  listName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  listBar: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
