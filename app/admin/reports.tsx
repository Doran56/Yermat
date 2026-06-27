import { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsAdmin, useModeratePerformance } from '@/hooks/useAdmin';
import { useReportsQueue, useUpdateReportStatus } from '@/hooks/useReports';
import { supabase } from '@/integrations/supabase/client';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';

const REASON_LABELS: Record<string, string> = {
  offensive: 'Offensant / haineux',
  sexual: 'Sexuel / inapproprié',
  violence: 'Violence',
  spam: 'Spam / arnaque',
  other: 'Autre',
};

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: reports, isLoading, refetch, isRefetching } = useReportsQueue();
  const moderate = useModeratePerformance();
  const updateStatus = useUpdateReportStatus();

  useEffect(() => {
    if (!checkingAdmin && isAdmin === false) router.replace('/(tabs)');
  }, [isAdmin, checkingAdmin, router]);

  const handleRemoveContent = async (report: any) => {
    try {
      if (report.content_type === 'performance') {
        await moderate.mutateAsync({ performanceId: report.content_id, newStatus: 'rejected', comment: 'Contenu signalé — retiré' });
      } else {
        await supabase.from('performance_comments').delete().eq('id', report.content_id);
      }
      await updateStatus.mutateAsync({ id: report.id, status: 'actioned' });
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible');
    }
  };

  if (checkingAdmin) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.reason}>{REASON_LABELS[item.reason] ?? item.reason}</Text>
        <Text style={styles.date}>{formatRelativeDate(item.created_at)}</Text>
      </View>
      <Text style={styles.meta}>
        {item.content_type === 'performance' ? 'Performance' : 'Commentaire'} signalé(e)
      </Text>
      {!!item.details && <Text style={styles.details}>« {item.details} »</Text>}

      <View style={styles.actionsRow}>
        {item.content_type === 'performance' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: Colors.textSecondary }]}
            onPress={() => router.push(`/performance/${item.content_id}`)}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionText, { color: Colors.text }]}>Voir</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: Colors.error }]}
          onPress={() => handleRemoveContent(item)}
          activeOpacity={0.8}
          disabled={moderate.isPending || updateStatus.isPending}
        >
          <Text style={[styles.actionText, { color: Colors.error }]}>Retirer le contenu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: Colors.textSecondary }]}
          onPress={() => updateStatus.mutate({ id: item.id, status: 'dismissed' })}
          activeOpacity={0.8}
          disabled={updateStatus.isPending}
        >
          <Text style={[styles.actionText, { color: Colors.textSecondary }]}>Ignorer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Signalements" onBack={() => router.back()} />
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.brand} /></View>
      ) : (
        <FlatList
          data={reports ?? []}
          keyExtractor={(r: any) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 48 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />}
          ListEmptyComponent={
            <View style={[styles.center, { marginTop: 80, gap: 12 }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.zinc[600]} />
              <Text style={styles.emptyText}>Aucun signalement en attente</Text>
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
  card: {
    backgroundColor: Colors.zinc[900], borderRadius: 12, padding: 12, gap: 6,
    borderWidth: 1, borderColor: Colors.zinc[800],
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reason: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  date: { color: Colors.zinc[600], fontSize: 11 },
  meta: { color: Colors.zinc[400], fontSize: 12 },
  details: { color: Colors.zinc[300], fontSize: 12, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.5 },
  actionText: { fontSize: 12, fontWeight: '700' },
  emptyText: { color: Colors.zinc[400], fontSize: 14, textAlign: 'center' },
});
