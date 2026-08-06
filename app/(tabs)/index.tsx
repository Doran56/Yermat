import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useInfinitePerformances } from '@/hooks/usePerformances';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, useMarkNotificationsReadByType } from '@/hooks/useNotifications';
import { FeedCard } from '@/components/feed/FeedCard';
import { PerformanceSheet } from '@/components/feed/PerformanceSheet';
import { RevealOverlay } from '@/components/feed/RevealOverlay';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { PerformanceWithDetails } from '@/types/database';

// BlurView requires Android API 31+ (Android 12)
const canBlur = Platform.OS !== 'android' || parseInt(String(Platform.Version)) >= 31;

type FeedTab = 'all' | 'friends' | 'bars';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'friends', label: 'Amis' },
  { key: 'bars', label: "Points d'eau" },
];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<FeedTab>('all');
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const sheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<FlashListRef<PerformanceWithDetails>>(null);
  const [selectedPerf, setSelectedPerf] = useState<PerformanceWithDetails | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsub = navigation.addListener('tabPress' as any, () => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsub;
  }, [navigation]);
  const snapPoints = useMemo(() => ['52%', '92%'], []);
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  useFocusEffect(
    useCallback(() => {
      setIsTabFocused(true);
      return () => setIsTabFocused(false);
    }, [])
  );

  const { data: notifications } = useNotifications();
  const friendsUnread = notifications?.filter(n => !n.read && n.type === 'user_performance').length ?? 0;
  const barsUnread = notifications?.filter(n => !n.read && n.type === 'bar_performance').length ?? 0;
  const markNotificationsReadByType = useMarkNotificationsReadByType();

  const handleTabPress = (key: FeedTab) => {
    setActiveTab(key);
    if (key === 'friends' && friendsUnread > 0) markNotificationsReadByType.mutate('user_performance');
    else if (key === 'bars' && barsUnread > 0) markNotificationsReadByType.mutate('bar_performance');
  };
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfinitePerformances();
  const { userFollows, barFollows } = useFollows();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Le filtre visibility='public' est appliqué côté serveur dans useInfinitePerformances.
  const allPerfs: PerformanceWithDetails[] = useMemo(
    () => data?.pages.flat() ?? [],
    [data]
  );

  const filtered = useMemo(() => {
    if (activeTab === 'friends') {
      const followedSet = new Set(userFollows?.map((f: any) => f.following_id) ?? []);
      return allPerfs.filter(p => followedSet.has(p.user_id));
    }
    if (activeTab === 'bars') {
      const followedBars = new Set(barFollows?.map((f: any) => f.bar_id) ?? []);
      return allPerfs.filter(p => p.bar_id && followedBars.has(p.bar_id));
    }
    return allPerfs;
  }, [activeTab, allPerfs, userFollows, barFollows]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setVisibleIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <LoadingScreen />;

  if (!user && filtered.length === 0) {
    return (
      <View style={[styles.unauthScreen, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <Image source={require('../../assets/logo.png')} style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 16 }} />
        <Text style={styles.tagline}>Hydrate-toi, filme, progresse</Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)')}
          style={styles.ctaBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      {/* Feed */}
      <FlashList
        ref={listRef}
        data={filtered}
        renderItem={({ item, index }) => (
          <FeedCard
            performance={item}
            isVisible={visibleIndex === index && isTabFocused}
            // Visible + la suivante : la carte d'après est déjà tamponnée quand on
            // scrolle, sans télécharger tout ce que FlashList monte autour.
            shouldLoad={index === visibleIndex || index === visibleIndex + 1}
            cardHeight={containerHeight}
            onAuthRequired={() => setShowAuthModal(true)}
            onPressDetail={(p) => { setSelectedPerf(p); sheetRef.current?.snapToIndex(0); }}
          />
        )}
        pagingEnabled
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {/* Top overlay: tabs left + search right */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {/* Filter tabs */}
        <View style={[styles.tabsRow, !canBlur && styles.tabsRowFallback]}>
          {canBlur && (
            <BlurView intensity={25} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          )}
          {TABS.map(tab => {
            const tabBadge = tab.key === 'friends' ? friendsUnread : tab.key === 'bars' ? barsUnread : 0;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => handleTabPress(tab.key)}
                style={styles.tabBtn}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                  {tabBadge > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{tabBadge > 9 ? '9+' : String(tabBadge)}</Text>
                    </View>
                  )}
                </View>
                {activeTab === tab.key && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.rightGroup}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/classement')}
            style={styles.searchBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={22} color={Colors.zinc[100]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty state */}
      {filtered.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="water-outline" size={48} color={Colors.zinc[600]} />
          <Text style={{ color: Colors.zinc[400], marginTop: 12, textAlign: 'center' }}>
            {activeTab === 'friends' ? 'Suis des gens pour voir leur feed' : 'Aucun Yermat pour le moment'}
          </Text>
        </View>
      )}

      {/* Reveal overlay — shown after a successful publish */}
      <RevealOverlay />

      {/* Performance detail sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.surface }}
        handleIndicatorStyle={{ backgroundColor: Colors.zinc[400] }}
        onClose={() => setSelectedPerf(null)}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        {selectedPerf && <PerformanceSheet performance={selectedPerf} />}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.zinc[950] },
  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchBtn: { padding: 4 },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    overflow: 'hidden',
  },
  tabsRowFallback: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center' },
  tabLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: Colors.white },
  tabIndicator: { height: 2, width: 20, backgroundColor: Colors.amber[500], borderRadius: 1, marginTop: 2 },
  tabBadge: {
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: Colors.amber[500],
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unauthScreen: {
    flex: 1,
    backgroundColor: Colors.zinc[950],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tagline: { color: Colors.zinc[400], fontSize: 14, marginTop: 8, marginBottom: 40 },
  ctaBtn: {
    backgroundColor: Colors.amber[500],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  ctaBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});
