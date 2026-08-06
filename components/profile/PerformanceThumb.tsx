import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
        <Image
          source={{ uri: thumbUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={performance.id}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name="water-outline" size={22} color={Colors.textSecondary} />
        </View>
      )}
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
