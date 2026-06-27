import { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Share, Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence, withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui/Avatar';
import { TimeBadge } from '@/components/ui/TimeBadge';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { PerformanceWithDetails } from '@/types/database';
import { formatRelativeDate } from '@/lib/utils';
import { usePerformanceYermats } from '@/hooks/useYermats';
import { useAuth } from '@/hooks/useAuth';
import { ReportActionSheet } from '@/components/moderation/ReportActionSheet';

interface FeedCardProps {
  performance: PerformanceWithDetails;
  isVisible: boolean;
  cardHeight: number;
  onAuthRequired: () => void;
  onPressDetail: (p: PerformanceWithDetails) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Certifiée ✓', color: Colors.emerald[500] },
  pending: { label: 'En attente', color: Colors.zinc[400] },
  unverified: { label: 'Non certifiée', color: Colors.zinc[400] },
};

export function FeedCard({ performance, isVisible, cardHeight, onAuthRequired, onPressDetail }: FeedCardProps) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { yermats, hasYermat, toggleYermat } = usePerformanceYermats(performance.id);
  const lastTapRef = useRef(0);
  const [reportVisible, setReportVisible] = useState(false);

  // Heart double-tap animation
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const player = useVideoPlayer(
    performance.video_url ? { uri: performance.video_url } : null,
    (p) => {
      p.loop = true;
    }
  );

  useEffect(() => {
    if (!player) return;
    if (isVisible && performance.video_url) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, player, performance.video_url]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!user) { onAuthRequired(); return; }
      toggleYermat();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      heartScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 180 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(500, withTiming(0, { duration: 200 }))
      );
    }
    lastTapRef.current = now;
  }, [user, toggleYermat, onAuthRequired]);

  const profile = performance.profiles;
  const bar = performance.bars;
  const challenge = performance.challenge_types;
  const status = STATUS_LABELS[performance.status] ?? STATUS_LABELS.pending;

  const handleShare = useCallback(async () => {
    const deepLink = `yermat://performance/${performance.id}`;
    const who = profile?.username ?? 'quelqu\'un';
    const what = challenge ? ` - ${challenge.name}` : '';
    const time = performance.time_ms > 0 ? ` en ${(performance.time_ms / 1000).toFixed(2)}s` : '';
    const text = `Regarde la performance de ${who}${what}${time} sur Yermat 💧`;
    await Share.share(
      Platform.OS === 'ios'
        ? { message: text, url: deepLink }
        : { message: `${text}\n${deepLink}` }
    );
  }, [performance.id, profile, challenge, performance.time_ms]);

  const handleYermat = () => {
    if (!user) { onAuthRequired(); return; }
    toggleYermat();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleDoubleTap}
      style={[styles.container, { width, height: cardHeight }]}
    >
      {/* Video background */}
      {performance.video_url ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.zinc[900], alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="water-outline" size={48} color={Colors.zinc[600]} />
        </View>
      )}

      {/* Gradient overlay bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Double-tap heart animation */}
      <Animated.View style={[styles.heartOverlay, heartAnimStyle]} pointerEvents="none">
        <Ionicons name="heart" size={80} color={Colors.red[500]} />
      </Animated.View>

      {/* Right action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleYermat} style={styles.actionBtn} activeOpacity={0.8}>
          <Ionicons name={hasYermat ? 'water' : 'water-outline'} size={28} color={Colors.white} />
          <Text style={styles.actionLabel}>{yermats}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onPressDetail(performance)}
          style={styles.actionBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={26} color={Colors.white} />
          <Text style={styles.actionLabel}>{performance.comments_count ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.actionBtn} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={26} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (!user) { onAuthRequired(); return; } setReportVisible(true); }}
          style={styles.actionBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="ellipsis-horizontal" size={26} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ReportActionSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        contentType="performance"
        contentId={performance.id}
        reportedUserId={performance.user_id}
        reportedUsername={profile?.username}
      />

      {/* Bottom info */}
      <View style={styles.info}>
        <TouchableOpacity
          onPress={() => onPressDetail(performance)}
          activeOpacity={0.9}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}
        >
          <Avatar uri={profile?.avatar_url} name={profile?.username ?? '?'} size={38} />
          <View>
            <Text style={styles.username}>{profile?.username ?? 'Anonyme'}</Text>
            {bar && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <Ionicons name="location-outline" size={12} color={Colors.zinc[400]} />
                <Text style={styles.barName}>{bar.name}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Badges row */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {challenge && <Badge label={challenge.name} variant="amber" />}
          {performance.time_ms > 0 && <TimeBadge timeMs={performance.time_ms} size="sm" />}
          <Badge label={status.label} variant="muted" />
          <Text style={styles.date}>{formatRelativeDate(performance.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.zinc[950],
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: 'transparent',
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    gap: 20,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  info: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 80,
  },
  username: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  barName: {
    color: Colors.zinc[400],
    fontSize: 12,
    marginTop: 1,
  },
  date: {
    color: Colors.zinc[400],
    fontSize: 11,
    marginLeft: 4,
  },
});
