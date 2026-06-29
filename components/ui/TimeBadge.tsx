import { View, Text } from 'react-native';
import { formatTime } from '@/lib/utils';
import { Colors } from '@/constants/colors';

interface TimeBadgeProps {
  timeMs: number;
  size?: 'sm' | 'md' | 'lg';
}

export function TimeBadge({ timeMs, size = 'md' }: TimeBadgeProps) {
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 13;
  const px = size === 'sm' ? 6 : 10;
  const py = size === 'sm' ? 2 : 4;

  return (
    <View style={{
      backgroundColor: Colors.brand,
      borderRadius: 6,
      paddingHorizontal: px,
      paddingVertical: py,
    }}>
      <Text style={{ color: Colors.white, fontWeight: '800', fontSize, fontVariant: ['tabular-nums'] }}>
        {formatTime(timeMs)}
      </Text>
    </View>
  );
}
