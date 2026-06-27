import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, Modal,
  StyleSheet, ActivityIndicator, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useUpsertBar } from '@/hooks/useBars';
import { Bar } from '@/types/database';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

interface Prediction {
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddBarModalProps {
  visible: boolean;
  onClose: () => void;
  onBarAdded: (bar: Bar) => void;
}

export function AddBarModal({ visible, onClose, onBarAdded }: AddBarModalProps) {
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upsertBar = useUpsertBar();

  const searchPlaces = useCallback(async (text: string) => {
    if (!text.trim()) { setPredictions([]); return; }
    setIsSearching(true);
    setError(null);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=establishment&language=fr&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      setPredictions(data.predictions ?? []);
    } catch {
      setError('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(text), 300);
  }, [searchPlaces]);

  const handleClose = useCallback(() => {
    setQuery('');
    setPredictions([]);
    setError(null);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(async (prediction: Prediction) => {
    setAddingId(prediction.place_id);
    setError(null);
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=place_id,name,formatted_address,geometry&language=fr&key=${GOOGLE_KEY}`;
      const res = await fetch(detailsUrl);
      const data = await res.json();
      const result = data.result;

      const bar = await upsertBar.mutateAsync({
        google_place_id: result.place_id,
        name: result.name,
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      });

      setQuery('');
      setPredictions([]);
      onBarAdded(bar);
    } catch {
      setError("Impossible d'ajouter ce bar");
    } finally {
      setAddingId(null);
    }
  }, [upsertBar, onBarAdded]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={{ paddingTop: insets.top }}>
          <ScreenHeader title="Ajouter un bar" onBack={handleClose} backIcon="close" />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Chercher un bar, café, restaurant…"
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.brand} />}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          renderItem={({ item, index }) => {
            const isAdding = addingId === item.place_id;
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
                disabled={!!addingId}
                style={[styles.row, index < predictions.length - 1 && styles.rowDivider]}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="location-outline" size={18} color={Colors.brand} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
                {isAdding
                  ? <ActivityIndicator size="small" color={Colors.brand} />
                  : <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                }
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !isSearching && query.trim() ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color={Colors.zinc[600]} />
                <Text style={styles.emptyText}>Aucun résultat</Text>
              </View>
            ) : !query.trim() ? (
              <View style={styles.emptyState}>
                <Ionicons name="water-outline" size={40} color={Colors.zinc[600]} />
                <Text style={styles.emptyText}>Cherche un point d'eau pour l'ajouter à la carte</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.brand}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: Colors.textSecondary,
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
    color: Colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
