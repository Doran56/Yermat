import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminBars } from '@/hooks/useAdmin';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors } from '@/constants/colors';
import { Bar } from '@/types/database';

export default function AdminBarsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: bars, isLoading } = useAdminBars();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filteredBars = q
    ? bars?.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q)
      )
    : bars;

  const renderItem = ({ item }: { item: Bar }) => {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/admin/bar/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.barName}>{item.name}</Text>
          <Text style={styles.barCity}>{item.city}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.zinc[600]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Gestion des points d'eau" onBack={() => router.back()} />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color={Colors.zinc[500]} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un point d'eau…"
          placeholderTextColor={Colors.zinc[600]}
          style={styles.searchInput}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={Colors.zinc[500]} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.amber[500]} />
        </View>
      ) : (
        <FlatList
          data={filteredBars}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={[styles.center, { marginTop: 80, gap: 8 }]}>
              <Ionicons name="search-outline" size={36} color={Colors.zinc[700]} />
              <Text style={styles.emptyText}>
                {q ? `Aucun point d'eau pour "${query}"` : 'Aucun point d\'eau trouvé'}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.zinc[900],
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.zinc[800],
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  barName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  barCity: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  emptyText: { color: Colors.zinc[400], fontSize: 14, textAlign: 'center' },
});
