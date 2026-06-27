import { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { useReveal } from '@/context/RevealContext';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function RevealOverlay() {
  const { revealData, clearReveal } = useReveal();

  // Shared values — always at top level (Rules of Hooks)
  const r1Op = useSharedValue(0);
  const r1Y  = useSharedValue(24);
  const r2Op = useSharedValue(0);
  const r2Y  = useSharedValue(24);
  const r3Op = useSharedValue(0);
  const r3Y  = useSharedValue(24);
  const rBtnOp = useSharedValue(0);

  const animStyle1 = useAnimatedStyle(() => ({
    opacity: r1Op.value,
    transform: [{ translateY: r1Y.value }],
  }));
  const animStyle2 = useAnimatedStyle(() => ({
    opacity: r2Op.value,
    transform: [{ translateY: r2Y.value }],
  }));
  const animStyle3 = useAnimatedStyle(() => ({
    opacity: r3Op.value,
    transform: [{ translateY: r3Y.value }],
  }));
  const animStyleBtn = useAnimatedStyle(() => ({
    opacity: rBtnOp.value,
  }));

  const triggerAnimations = useCallback(() => {
    r1Op.value = 0; r1Y.value = 24;
    r2Op.value = 0; r2Y.value = 24;
    r3Op.value = 0; r3Y.value = 24;
    rBtnOp.value = 0;

    r1Op.value = withDelay(200, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    r1Y.value  = withDelay(200, withSpring(0, { damping: 18, stiffness: 180 }));

    r2Op.value = withDelay(500, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    r2Y.value  = withDelay(500, withSpring(0, { damping: 18, stiffness: 180 }));

    r3Op.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    r3Y.value  = withDelay(800, withSpring(0, { damping: 14, stiffness: 120 }));

    rBtnOp.value = withDelay(1200, withTiming(1, { duration: 400 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (revealData) triggerAnimations();
  }, [revealData, triggerAnimations]);

  if (!revealData) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>🎯 Résultats</Text>

      <Animated.View style={[styles.card, animStyle1]}>
        <Text style={styles.cardLabel}>Classement général</Text>
        <Text style={styles.cardValue}>
          #{revealData.rankGlobal ?? '?'}
          <Text style={styles.cardTotal}> / {revealData.totalGlobal ?? '?'} joueurs</Text>
        </Text>
      </Animated.View>

      {revealData.barName && (
        <Animated.View style={[styles.card, animStyle2]}>
          <Text style={styles.cardLabel}>Dans {revealData.barName}</Text>
          <Text style={styles.cardValue}>
            #{revealData.rankBar ?? '?'}
            <Text style={styles.cardTotal}> / {revealData.totalBar ?? '?'}</Text>
          </Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.card, styles.cardHighlight, animStyle3]}>
        <Text style={styles.cardLabel}>Ton temps</Text>
        <Text style={[styles.cardValue, { color: Colors.amber[500], fontSize: 36 }]}>
          {formatMs(revealData.timeMs)}
        </Text>
      </Animated.View>

      <Animated.View style={[{ width: '100%', marginTop: 8 }, animStyleBtn]}>
        <TouchableOpacity onPress={clearReveal} style={styles.btn} activeOpacity={0.85}>
          <Text style={styles.btnText}>Continuer 💧</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 90,
    borderRadius: 20,
    backgroundColor: 'rgba(9, 9, 11, 0.96)',
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    zIndex: 100,
  },
  title: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Typography.fontFamily.display,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: 4,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.zinc[900],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.zinc[800],
  },
  cardHighlight: {
    borderColor: Colors.amber[500],
  },
  cardLabel: {
    color: Colors.zinc[400],
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardValue: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cardTotal: {
    color: Colors.zinc[400],
    fontSize: 15,
    fontWeight: '500',
  },
  btn: {
    backgroundColor: Colors.amber[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
});
