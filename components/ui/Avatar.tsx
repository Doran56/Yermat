import { View, Text } from 'react-native';
import { Image } from 'expo-image';
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
      // expo-image plutôt que celui de React Native : cache disque persistant, donc
      // un avatar déjà vu n'est pas retéléchargé au relancement de l'app.
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
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
