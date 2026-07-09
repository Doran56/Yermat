import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Colors } from '@/constants/colors';

// Extrait le premier frame en image statique (pas de player → page légère)

export function PerformanceThumb({
  performance,
  thumbSize,
  onPress,
}: {
  performance: any;
  thumbSize: number;
  onPress: () => void;
}) {
  const hasVideo = !!performance.video_url;
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  useEffect(() => {
    if (!hasVideo) return;
    let cancelled = false;
    getThumbnailAsync(performance.video_url, { time: 0 })
      .then(({ uri }) => { if (!cancelled) setThumbUri(uri); })
      .catch(() => { if (!cancelled) setThumbError(true); });
    return () => { cancelled = true; };
  }, [performance.video_url]);

  const showFallback = !hasVideo || thumbError;
  const showLoader = hasVideo && !thumbUri && !thumbError;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: thumbSize, height: thumbSize, backgroundColor: Colors.bgElevated }}
    >
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : showLoader ? (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        </View>
      ) : showFallback ? (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name="water-outline" size={22} color={Colors.textSecondary} />
        </View>
      ) : null}
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
