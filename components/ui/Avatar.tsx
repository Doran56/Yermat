import { View, Text, Image } from 'react-native';
import { Colors } from '@/constants/colors';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name = '', size = 40 }: AvatarProps) {
  const borderRadius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius,
      backgroundColor: Colors.zinc[800],
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: Colors.brand, fontSize: size * 0.35, fontWeight: '700' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
