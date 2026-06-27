import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  onPress: () => void;
  children: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variants: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: Colors.brand, borderRadius: 12 },
    text: { color: Colors.black, fontWeight: '700' },
  },
  secondary: {
    container: { backgroundColor: Colors.zinc[800], borderRadius: 12 },
    text: { color: Colors.white, fontWeight: '600' },
  },
  ghost: {
    container: { backgroundColor: Colors.transparent, borderRadius: 12 },
    text: { color: Colors.zinc[400], fontWeight: '500' },
  },
  danger: {
    container: { backgroundColor: Colors.red[500], borderRadius: 12 },
    text: { color: Colors.white, fontWeight: '700' },
  },
};

export function Button({
  onPress, children, variant = 'primary', loading = false,
  disabled = false, style, textStyle, fullWidth = false,
}: ButtonProps) {
  const v = variants[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        v.container,
        { paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
        fullWidth && { width: '100%' },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={v.text.color} />}
      <Text style={[{ fontSize: 16, letterSpacing: 0.3 }, v.text, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}
