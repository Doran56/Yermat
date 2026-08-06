import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { startOfMonth, subMonths, addMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useClassement, SearchSort } from '@/hooks/useClassement';
import { useChallengeTypes } from '@/hooks/useChallengeTypes';
import { useSearchProfiles } from '@/hooks/useSearchProfiles';
import { useSearchBars } from '@/hooks/useSearchBars';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
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

function FollowPill({ following, onPress }: { following: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.followPill, following && styles.followPillActive]}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.followPillText, following && styles.followPillTextActive]}>
        {following ? 'Suivi' : '+ Suivre'}
      </Text>
    </TouchableOpacity>
  );
}

export default function ClassementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []);
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  // Recherche d'entités (bars / utilisateurs) — permet de trouver et suivre
  // directement un bar ou un utilisateur, indépendamment du parcours de Yermats.
  const [entityQuery, setEntityQuery] = useState('');
  const isSearchingEntities = entityQuery.trim().length >= 2;
  const { data: userResults, isFetching: usersFetching } = useSearchProfiles(entityQuery);
  const { data: barResults, isFetching: barsFetching } = useSearchBars(entityQuery);
  const { userFollows, barFollows, toggleUserFollow, toggleBarFollow } = useFollows();

  const handleFollowUser = (userId: string) => {
    if (!user) { router.push('/(auth)'); return; }
    toggleUserFollow(userId);
  };
  const handleFollowBar = (barId: string) => {
    if (!user) { router.push('/(auth)'); return; }
    toggleBarFollow(barId);
  };

  // Parcours de Yermats — filtres + tri (bottom sheet)
  const [month, setMonth] = useState<Date | null>(() => startOfMonth(new Date()));
  const [gender, setGender] = useState<string | null>(null);
  const [challengeTypeId, setChallengeTypeId] = useState<string | null>(null);
  const [barId, setBarId] = useState<string | null>(null);
  const [barSearch, setBarSearch] = useState('');
  const [username, setUsername] = useState('');
  const [sort, setSort] = useState<SearchSort>('date_desc');

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
  const activeSortLabel = SORTS.find(s => s.key === sort)?.label ?? '';

  const resetFilters = () => {
    setGender(null);
    setChallengeTypeId(null);
    setBarId(null);
    setBarSearch('');
    setUsername('');
    setMonth(startOfMonth(new Date()));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Recherche</Text>
      </View>

      {/* Barre de recherche bars / utilisateurs */}
      <View style={styles.entitySearchRow}>
        <Ionicons name="search" size={16} color={Colors.textSecondary} />
        <TextInput
          value={entityQuery}
          onChangeText={setEntityQuery}
          placeholder="Rechercher un bar ou un utilisateur…"
          placeholderTextColor={Colors.textTertiary}
          style={styles.entitySearchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {(usersFetching || barsFetching) && <ActivityIndicator size="small" color={Colors.amber[500]} />}
      </View>

      {isSearchingEntities ? (
        /* ═══ Résultats de recherche bars/utilisateurs ═══ */
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!userResults?.length && !barResults?.length && !usersFetching && !barsFetching && (
            <View style={styles.center}>
              <Ionicons name="search-outline" size={40} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun résultat</Text>
            </View>
          )}

          {!!userResults?.length && (
            <View style={styles.entitySection}>
              <Text style={styles.entitySectionTitle}>Utilisateurs</Text>
              {userResults.map(u => (
                <TouchableOpacity
                  key={u.user_id}
                  onPress={() => router.push(`/user/${u.user_id}`)}
                  style={styles.entityRow}
                  activeOpacity={0.8}
                >
                  <Avatar uri={u.avatar_url} name={u.username} size={38} />
                  <Text style={styles.entityName} numberOfLines={1}>{u.username}</Text>
                  {user?.id !== u.user_id && (
                    <FollowPill
                      following={userFollows.some((f: any) => f.following_id === u.user_id)}
                      onPress={() => handleFollowUser(u.user_id)}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!!barResults?.length && (
            <View style={styles.entitySection}>
              <Text style={styles.entitySectionTitle}>Bars</Text>
              {barResults.map(b => (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => router.push(`/bar/${b.id}`)}
                  style={styles.entityRow}
                  activeOpacity={0.8}
                >
                  <View style={styles.entityBarIcon}>
                    <Ionicons name="location" size={18} color={Colors.amber[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entityName} numberOfLines={1}>{b.name}</Text>
                    <Text style={styles.entitySubtext} numberOfLines={1}>{b.city}</Text>
                  </View>
                  <FollowPill
                    following={barFollows.some((f: any) => f.bar_id === b.id)}
                    onPress={() => handleFollowBar(b.id)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* Déclencheur du bottom sheet filtres/tri */}
          <TouchableOpacity
            onPress={() => sheetRef.current?.snapToIndex(0)}
            style={styles.filterTrigger}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={16} color={Colors.text} />
            <Text style={styles.filterTriggerText}>Trier : {activeSortLabel}</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Liste de Yermats */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.amber[500]} />
            </View>
          ) : !displayedPerformances?.length ? (
            <View style={styles.center}>
              <Ionicons name="water-outline" size={48} color={Colors.textSecondary} />
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
        </>
      )}

      {/* Bottom sheet — Filtres & tri */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.bgElevated }}
        handleIndicatorStyle={{ backgroundColor: Colors.textTertiary }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Filtres & tri</Text>
            <TouchableOpacity onPress={resetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          {/* Tri */}
          <View style={styles.sheetSection}>
            <Text style={styles.sheetSectionLabel}>Trier par</Text>
            <View style={styles.chipWrap}>
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
            </View>
          </View>

          {/* Période */}
          <View style={[styles.sheetSection, styles.sheetSectionBorder]}>
            <Text style={styles.sheetSectionLabel}>Période</Text>
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
          <View style={[styles.sheetSection, styles.sheetSectionBorder]}>
            <Text style={styles.sheetSectionLabel}>Utilisateur</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrer par utilisateur…"
              placeholderTextColor={Colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Genre */}
          <View style={[styles.sheetSection, styles.sheetSectionBorder]}>
            <Text style={styles.sheetSectionLabel}>Genre</Text>
            <View style={styles.chipWrap}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={String(g.key)}
                  onPress={() => setGender(g.key)}
                  style={[styles.filterChip, gender === g.key && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, gender === g.key && styles.filterChipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Volume */}
          <View style={[styles.sheetSection, styles.sheetSectionBorder]}>
            <Text style={styles.sheetSectionLabel}>Volume</Text>
            <View style={styles.chipWrap}>
              <TouchableOpacity
                onPress={() => setChallengeTypeId(null)}
                style={[styles.filterChip, challengeTypeId === null && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, challengeTypeId === null && styles.filterChipTextActive]}>
                  Tous
                </Text>
              </TouchableOpacity>
              {challengeTypes?.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setChallengeTypeId(c.id)}
                  style={[styles.filterChip, challengeTypeId === c.id && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, challengeTypeId === c.id && styles.filterChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar */}
          {bars.length > 0 && (
            <View style={[styles.sheetSection, styles.sheetSectionBorder]}>
              <Text style={styles.sheetSectionLabel}>Bar</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrer par bar…"
                placeholderTextColor={Colors.textSecondary}
                value={barSearch}
                onChangeText={setBarSearch}
                clearButtonMode="while-editing"
              />
              <View style={styles.chipWrap}>
                <TouchableOpacity
                  onPress={() => setBarId(null)}
                  style={[styles.filterChip, barId === null && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, barId === null && styles.filterChipTextActive]}>
                    Tous les bars
                  </Text>
                </TouchableOpacity>
                {filteredBars.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setBarId(b.id)}
                    style={[styles.filterChip, barId === b.id && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, barId === b.id && styles.filterChipTextActive]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topBar: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },

  // Barre de recherche bars/utilisateurs
  entitySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgElevated,
  },
  entitySearchInput: { flex: 1, color: Colors.text, fontSize: 14, paddingVertical: 0 },

  // Résultats de recherche entités
  entitySection: { marginBottom: 8 },
  entitySectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  entityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  entityBarIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.bgElevated2,
    alignItems: 'center', justifyContent: 'center',
  },
  entityName: { color: Colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  entitySubtext: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  followPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.amber[500],
  },
  followPillActive: { backgroundColor: Colors.amber[500] },
  followPillText: { color: Colors.amber[500], fontSize: 12, fontWeight: '700' },
  followPillTextActive: { color: Colors.white },

  // Filter trigger
  filterTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgElevated, alignSelf: 'flex-start',
  },
  filterTriggerText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  filterBadge: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.amber[500],
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },

  // Bottom sheet
  sheetHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  resetText: { color: Colors.amber[500], fontSize: 13, fontWeight: '600' },
  sheetSection: { paddingVertical: 14 },
  sheetSectionBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  sheetSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgElevated2,
  },
  sortChipActive: { backgroundColor: Colors.amber[500], borderColor: Colors.amber[500] },
  sortChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  sortChipTextActive: { color: Colors.white },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgElevated2,
  },
  filterChipActive: { backgroundColor: Colors.amber[500], borderColor: Colors.amber[500] },
  filterChipText: { color: Colors.text, fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: Colors.white, fontWeight: '700' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
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

  // List
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  listName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  listBar: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
