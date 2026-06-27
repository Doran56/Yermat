import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useReportContent, ReportReason, ReportContentType } from '@/hooks/useReports';
import { useBlockUser } from '@/hooks/useBlocks';

interface ReportActionSheetProps {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  contentId: string;
  reportedUserId?: string | null;
  reportedUsername?: string | null;
  /** Appelé après un blocage réussi (ex: fermer un détail, rafraîchir). */
  onBlocked?: () => void;
}

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'offensive', label: 'Contenu offensant ou haineux' },
  { key: 'sexual',    label: 'Contenu sexuel ou inapproprié' },
  { key: 'violence',  label: 'Violence' },
  { key: 'spam',      label: 'Spam ou arnaque' },
  { key: 'other',     label: 'Autre' },
];

export function ReportActionSheet({
  visible, onClose, contentType, contentId, reportedUserId, reportedUsername, onBlocked,
}: ReportActionSheetProps) {
  const { user } = useAuth();
  const reportContent = useReportContent();
  const blockUser = useBlockUser();

  const handleReport = (reason: ReportReason) => {
    if (!user) { onClose(); return; }
    reportContent.mutate(
      { contentType, contentId, reportedUserId, reason },
      {
        onSuccess: () => {
          onClose();
          Alert.alert('Merci', 'Le signalement a été transmis. Notre équipe le traite sous 24h.');
        },
        onError: () => {
          onClose();
          Alert.alert('Déjà signalé', 'Tu as déjà signalé ce contenu.');
        },
      }
    );
  };

  const handleBlock = () => {
    if (!user || !reportedUserId) { onClose(); return; }
    onClose();
    Alert.alert(
      'Bloquer cet utilisateur',
      `Tu ne verras plus le contenu${reportedUsername ? ` de ${reportedUsername}` : ' de cet utilisateur'}. Le développeur en est notifié.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: () => {
            blockUser.mutate(reportedUserId);
            // Notifie aussi le développeur du contenu problématique (Apple 1.2)
            reportContent.mutate({ contentType, contentId, reportedUserId, reason: 'other', details: 'Utilisateur bloqué' });
            onBlocked?.();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Signaler</Text>
          {REASONS.map((r) => (
            <TouchableOpacity key={r.key} style={styles.row} onPress={() => handleReport(r.key)} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={18} color={Colors.text} />
              <Text style={styles.rowText}>{r.label}</Text>
            </TouchableOpacity>
          ))}

          {reportedUserId && reportedUserId !== user?.id && (
            <TouchableOpacity style={[styles.row, styles.blockRow]} onPress={handleBlock} activeOpacity={0.7}>
              <Ionicons name="ban-outline" size={18} color={Colors.error} />
              <Text style={[styles.rowText, { color: Colors.error }]}>Bloquer cet utilisateur</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingBottom: 36, gap: 4,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 8 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  rowText: { color: Colors.text, fontSize: 15, fontWeight: '500' },
  blockRow: { borderBottomWidth: 0 },
  cancelBtn: {
    marginTop: 10, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.bgElevated, alignItems: 'center',
  },
  cancelText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
});
