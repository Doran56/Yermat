import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList,
  StyleSheet, ActivityIndicator, TouchableOpacity, Platform, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, DarkTheme } from '@/constants/colors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Avatar } from '@/components/ui/Avatar';
import { useSearchProfiles, SearchProfile } from '@/hooks/useSearchProfiles';
import { computeLevel, computeTitle, getTitleEmoji } from '@/lib/gamification';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme();
  const T = scheme === 'dark' ? DarkTheme : Colors;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 300);
  }, []);

  const { data: results, isFetching } = useSearchProfiles(debouncedQuery);

  const renderItem = useCallback(({ item, index }: { item: SearchProfile; index: number }) => {
    const level = computeLevel(item.xp ?? 0);
    const title = computeTitle(level);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/user/${item.user_id}`)}
        activeOpacity={0.75}
        style={[
          styles.row,
          index < (results?.length ?? 0) - 1 && { borderBottomWidth: 1, borderBottomColor: T.border },
        ]}
      >
        <Avatar uri={item.avatar_url} name={item.username} size={40} />
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: T.text }]} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={[styles.rowSubtitle, { color: T.textSecondary }]} numberOfLines={1}>
            {getTitleEmoji(title)} {title} · Niv. {level}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={T.textTertiary} />
      </TouchableOpacity>
    );
  }, [results, router, T]);

  return (
    <View style={[styles.container, { backgroundColor: T.bg, paddingTop: insets.top }]}>
      <ScreenHeader title="Rechercher" onBack={() => router.back()} />

      <View style={[styles.searchRow, { backgroundColor: T.bgElevated, borderColor: T.border }]}>
        <Ionicons name="search" size={16} color={T.textSecondary} />
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Rechercher un pseudo…"
          placeholderTextColor={T.textTertiary}
          style={[styles.searchInput, { color: T.text }]}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {isFetching && <ActivityIndicator size="small" color={T.brand} />}
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item.user_id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        renderItem={renderItem}
        ListEmptyComponent={
          debouncedQuery.trim().length < 2 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={T.zinc[600]} />
              <Text style={[styles.emptyText, { color: T.textTertiary }]}>
                Tape au moins 2 caractères pour chercher un utilisateur
              </Text>
            </View>
          ) : !isFetching ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={T.zinc[600]} />
              <Text style={[styles.emptyText, { color: T.textTertiary }]}>Aucun résultat</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
