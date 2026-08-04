import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';

// Remplace l'écran « Unmatched Route » interne d'expo-router, qui n'offre aucune
// sortie. Ici on redirige vers (tabs) : AuthGate renverra vers (auth) si la
// session est absente.
export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.emoji}>💧</Text>
      <Text style={styles.title}>Page introuvable</Text>
      <Text style={styles.subtitle}>Cette page n'existe pas ou n'existe plus.</Text>
      {__DEV__ && <Text style={styles.path}>{pathname}</Text>}

      <TouchableOpacity
        onPress={() => router.replace('/(tabs)')}
        style={styles.primaryBtn}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Retour à l'accueil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: {
    color: Colors.text,
    fontSize: Typography.size['3xl'],
    fontFamily: Typography.fontFamily.bodyBold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    textAlign: 'center',
  },
  path: {
    color: Colors.textTertiary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fontFamily.body,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: Colors.brand,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: Typography.size.lg,
    fontFamily: Typography.fontFamily.bodySemibold,
  },
});
