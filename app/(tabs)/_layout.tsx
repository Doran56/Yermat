import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused, isFeedActive }: { name: string; focused: boolean; isFeedActive: boolean }) {
  const color = focused
    ? Colors.brand
    : isFeedActive ? Colors.zinc[400] : Colors.textSecondary;

  const iconMap: Record<string, { active: IoniconName; inactive: IoniconName }> = {
    index:      { active: 'home',    inactive: 'home-outline' },
    classement: { active: 'trophy',  inactive: 'trophy-outline' },
    map:        { active: 'map',     inactive: 'map-outline' },
    profile:    { active: 'person',  inactive: 'person-outline' },
  };

  const icons = iconMap[name];
  if (!icons) return null;

  return (
    <Ionicons
      name={focused ? icons.active : icons.inactive}
      size={22}
      color={color}
    />
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isFeedActive = state.routes[state.index]?.name === 'index';
  const barBg = isFeedActive ? Colors.zinc[950] : Colors.bg;
  const barBorder = isFeedActive ? Colors.zinc[800] : Colors.border;

  const tabs = [
    { name: 'index', label: 'Feed' },
    { name: 'classement', label: 'Top' },
    null,
    { name: 'map', label: 'Carte' },
    { name: 'profile', label: 'Profil' },
  ];

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: barBg,
      borderTopWidth: 1,
      borderTopColor: barBorder,
      paddingBottom: insets.bottom,
      paddingTop: 8,
      paddingHorizontal: 8,
      alignItems: 'center',
    }}>
      {tabs.map((tab, i) => {
        if (!tab) {
          return (
            <TouchableOpacity
              key="perf"
              onPress={() => router.push('/(tabs)/map')}
              activeOpacity={0.8}
              style={{ flex: 1, alignItems: 'center', marginTop: -20 }}
            >
              <View style={{
                width: 58, height: 58, borderRadius: 29,
                backgroundColor: isFeedActive ? Colors.zinc[900] : Colors.bgElevated,
                borderWidth: 1.5,
                borderColor: Colors.brand,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: Colors.brand,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 12,
              }}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={{ width: 36, height: 36, resizeMode: 'contain' }}
                />
              </View>
              <Text style={{ color: Colors.brand, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                PERF
              </Text>
            </TouchableOpacity>
          );
        }

        const isFocused = state.routes[state.index]?.name === tab.name;
        const labelColor = isFocused
          ? Colors.brand
          : isFeedActive ? Colors.zinc[400] : Colors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
          >
            <TabIcon name={tab.name} focused={isFocused} isFeedActive={isFeedActive} />
            <Text style={{
              color: labelColor,
              fontSize: 10,
              fontWeight: isFocused ? '700' : '500',
              marginTop: 2,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="classement" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
