import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FilterChip({ label, active = false, onPress, size = 'md', style }: FilterChipProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.93, { duration: 80 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      style={[
        styles.chip,
        size === 'sm' && styles.chipSm,
        active ? styles.chipActive : styles.chipInactive,
        animStyle,
        style,
      ]}
    >
      <Text style={[
        styles.label,
        size === 'sm' && styles.labelSm,
        active ? styles.labelActive : styles.labelInactive,
      ]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipSm: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipInactive: {
    backgroundColor: Colors.transparent,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  labelSm: {
    fontSize: 12,
  },
  labelActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  labelInactive: {
    color: Colors.textSecondary,
  },
});
