import { Text, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { formatTime } from '@/lib/utils';

interface TimeTagProps {
  timeMs: number;
  style?: TextStyle;
}

// Affichage discret du temps (texte simple, pas de badge coloré) — à côté du
// lieu / de la date / du statut de certification, jamais mis en avant seul.
export function TimeTag({ timeMs, style }: TimeTagProps) {
  if (!timeMs || timeMs <= 0) return null;
  return (
    <Text style={[{ color: Colors.textTertiary, fontSize: 11 }, style]}>
      {formatTime(timeMs)}
    </Text>
  );
}
