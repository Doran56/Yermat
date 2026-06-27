import { View, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Colors } from '@/constants/colors';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', onPress, style }: CardProps) {
  const cardStyle = [styles.base, variantStyles[variant], style].filter(Boolean) as ViewStyle[];

  if (variant === 'glass') {
    return (
      <GlassCard cardStyle={cardStyle} onPress={onPress}>
        {children}
      </GlassCard>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

function GlassCard({ children, cardStyle, onPress }: {
  children: React.ReactNode;
  cardStyle: ViewStyle[];
  onPress?: () => void;
}) {
  const supportsBlur = Platform.OS === 'ios' || (Platform.OS === 'android' && parseInt(String(Platform.Version), 10) >= 31);

  if (supportsBlur) {
    // Dynamic import to avoid crash when BlurView not available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BlurView } = require('expo-blur');
    const Inner = onPress ? TouchableOpacity : View;
    return (
      <BlurView intensity={20} tint="extraLight" style={cardStyle}>
        <Inner {...(onPress ? { onPress, activeOpacity: 0.75 } : {})} style={{ flex: 1 }}>
          {children}
        </Inner>
      </BlurView>
    );
  }

  // Fallback for older Android
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[cardStyle, styles.glassFallback]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyle, styles.glassFallback]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  glassFallback: {
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: Colors.bgElevated,
  },
  elevated: {
    backgroundColor: Colors.bgElevated,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  outlined: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  glass: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
};
