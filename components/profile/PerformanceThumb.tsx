import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Colors } from '@/constants/colors';

// Affiche la miniature générée à la publication (voir app/perform/[barId].tsx) :
// évite de retélécharger la vidéo complète juste pour en extraire une image.

export function PerformanceThumb({
  performance,
  thumbSize,
  onPress,
}: {
  performance: any;
  thumbSize: number;
  onPress: () => void;
}) {
  const thumbUri: string | null = performance.thumbnail_url ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: thumbSize, height: thumbSize, backgroundColor: Colors.bgElevated }}
    >
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name="water-outline" size={22} color={Colors.textSecondary} />
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 5 }]}
      >
        <TimeBadge timeMs={performance.time_ms} size="sm" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
