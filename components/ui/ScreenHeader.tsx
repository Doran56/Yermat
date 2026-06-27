import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type BackIcon = 'arrow' | 'close';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  backIcon?: BackIcon;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

const ICON_NAME: Record<BackIcon, React.ComponentProps<typeof Ionicons>['name']> = {
  arrow: 'chevron-back',
  close: 'close',
};

export function ScreenHeader({
  title,
  onBack,
  backIcon = 'arrow',
  rightElement,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Back button — always reserves space for alignment */}
      <View style={styles.side}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name={ICON_NAME[backIcon]} size={20} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Title centered absolutely so it's unaffected by side element widths */}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {/* Right element — always reserves space for alignment */}
      <View style={[styles.side, styles.sideRight]}>
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
});
