import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBar } from '@/hooks/useBars';
import {
  useBarRewards, useManageBarReward, BarReward,
} from '@/hooks/useAdmin';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors } from '@/constants/colors';

const RANK_LABELS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function AdminBarEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barId } = useLocalSearchParams<{ barId: string }>();

  const { data: bar } = useBar(barId);
  const { data: rewards, isLoading: loadingRewards } = useBarRewards(barId);
  const manageReward = useManageBarReward();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRank, setNewRank] = useState<1 | 2 | 3>(1);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddReward = async () => {
    if (!newTitle.trim()) return;
    try {
      await manageReward.mutateAsync({
        type: 'create',
        barId,
        rank: newRank,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setShowAddForm(false);
      setNewTitle('');
      setNewDesc('');
      setNewRank(1);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter la récompense.');
    }
  };

  const handleDeleteReward = (reward: BarReward) => {
    Alert.alert(
      'Supprimer',
      `Supprimer la récompense "${reward.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => manageReward.mutate({ type: 'delete', id: reward.id }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={bar?.name ?? 'Point d\'eau'} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Récompenses ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Récompenses</Text>
          {!showAddForm && (
            <TouchableOpacity onPress={() => setShowAddForm(true)} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={22} color={Colors.amber[500]} />
            </TouchableOpacity>
          )}
        </View>

        {loadingRewards ? (
          <ActivityIndicator color={Colors.amber[500]} style={{ marginTop: 12 }} />
        ) : (
          <>
            {(rewards ?? []).map((r) => (
              <View key={r.id} style={styles.rewardRow}>
                <Text style={styles.rewardRank}>{RANK_LABELS[r.rank] ?? `#${r.rank}`}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardTitle}>{r.title}</Text>
                  {r.description ? (
                    <Text style={styles.rewardDesc}>{r.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteReward(r)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.zinc[500]} />
                </TouchableOpacity>
              </View>
            ))}

            {(rewards ?? []).length === 0 && !showAddForm && (
              <Text style={styles.emptyText}>Aucune récompense configurée</Text>
            )}
          </>
        )}

        {/* Formulaire ajout récompense */}
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.addFormLabel}>Rang</Text>
            <View style={styles.rankRow}>
              {([1, 2, 3] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rankBtn, newRank === r && styles.rankBtnActive]}
                  onPress={() => setNewRank(r)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rankBtnText}>{RANK_LABELS[r]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.addFormLabel}>Titre *</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="ex: Bouteille offerte"
              placeholderTextColor={Colors.zinc[600]}
              style={styles.formInput}
            />

            <Text style={styles.addFormLabel}>Description (optionnel)</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="ex: Sur présentation de l'app"
              placeholderTextColor={Colors.zinc[600]}
              style={styles.formInput}
            />

            <View style={styles.addFormActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAddForm(false); setNewTitle(''); setNewDesc(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !newTitle.trim() && { opacity: 0.4 }]}
                onPress={handleAddReward}
                activeOpacity={0.85}
                disabled={!newTitle.trim() || manageReward.isPending}
              >
                {manageReward.isPending
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.confirmBtnText}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.zinc[950] },
  scroll: { padding: 16, gap: 8 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: Colors.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.zinc[800],
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: Colors.zinc[800] },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  priceLabel: { color: Colors.text, fontSize: 14, flex: 1 },
  priceInput: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 72,
    paddingVertical: 2,
  },
  priceCurrency: { color: Colors.textSecondary, fontSize: 14, width: 16 },
  saveBtn: {
    backgroundColor: Colors.amber[500],
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnSuccess: { backgroundColor: Colors.emerald[500] },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.zinc[900],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.zinc[800],
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  rewardRank: { fontSize: 20 },
  rewardTitle: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  rewardDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  emptyText: { color: Colors.zinc[600], fontSize: 13, marginTop: 4 },
  addForm: {
    backgroundColor: Colors.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.zinc[800],
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  addFormLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  rankRow: { flexDirection: 'row', gap: 8 },
  rankBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.zinc[700],
  },
  rankBtnActive: { borderColor: Colors.amber[500], backgroundColor: Colors.amber[500] + '22' },
  rankBtnText: { fontSize: 22 },
  formInput: {
    backgroundColor: Colors.zinc[800],
    borderRadius: 8,
    padding: 10,
    color: Colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.zinc[700],
  },
  addFormActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.zinc[700],
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  confirmBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.amber[500],
  },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
