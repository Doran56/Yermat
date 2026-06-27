import { View, Text, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type BadgeVariant = 'default' | 'amber' | 'success' | 'muted' | 'danger';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.bgElevated2, text: Colors.text },
  amber: { bg: Colors.brand, text: Colors.black },
  success: { bg: Colors.emerald[500], text: Colors.white },
  muted: { bg: Colors.bgElevated2, text: Colors.textSecondary },
  danger: { bg: 'rgba(239,68,68,0.15)', text: Colors.red[500] },
};

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const s = variantStyles[variant];
  return (
    <View style={[{
      backgroundColor: s.bg, borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 3,
    }, style]}>
      <Text style={{ color: s.text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
