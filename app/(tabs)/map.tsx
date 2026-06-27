import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useBarsInBounds } from '@/hooks/useBars';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { AddBarModal } from '@/components/map/AddBarModal';
import { Bar } from '@/types/database';

const canBlur = Platform.OS !== 'android' || parseInt(String(Platform.Version)) >= 31;

const LIGHT_MAP_STYLE = [
  // Fond général — presque blanc
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  // Routes — blanches avec bordure subtile
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d4d4d4' }] },
  // Labels routes — on garde seulement les routes importantes
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  // Eau — bleu clair
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  // Parcs et nature — vert très pâle
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f5e0' }] },
  { featureType: 'landscape.natural', stylers: [{ color: '#eeeeee' }] },
  // Tout le reste des POI — masqué
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Zones administratives — très légères
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
];

const PARIS = { lat: 48.8566, lng: 2.3522 };
const INITIAL_DELTA = 0.1;

function boundsFromRegion(r: Region) {
  return {
    north: r.latitude + r.latitudeDelta / 2,
    south: r.latitude - r.latitudeDelta / 2,
    east: r.longitude + r.longitudeDelta / 2,
    west: r.longitude - r.longitudeDelta / 2,
  };
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCenteredRef = useRef(false);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
  const [addBarVisible, setAddBarVisible] = useState(false);
  const [mapBounds, setMapBounds] = useState(() =>
    boundsFromRegion({
      latitude: PARIS.lat,
      longitude: PARIS.lng,
      latitudeDelta: INITIAL_DELTA,
      longitudeDelta: INITIAL_DELTA,
    })
  );

  const { data: bars } = useBarsInBounds(mapBounds);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (location && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      mapRef.current?.animateToRegion(
        { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        600
      );
    }
  }, [location]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
    boundsTimerRef.current = setTimeout(() => setMapBounds(boundsFromRegion(region)), 400);
  }, []);

  const handleMarkerPress = useCallback((bar: Bar) => {
    setSelectedBar(bar);
    bottomSheetRef.current?.expand();
  }, []);

  const handleBarAdded = useCallback((bar: Bar) => {
    setAddBarVisible(false);
    mapRef.current?.animateToRegion(
      { latitude: bar.lat, longitude: bar.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600
    );
    setSelectedBar(bar);
    setTimeout(() => bottomSheetRef.current?.expand(), 700);
  }, []);

  const handleNewPerf = useCallback(() => {
    if (!selectedBar) return;
    bottomSheetRef.current?.close();
    router.push(`/perform/${selectedBar.id}`);
  }, [selectedBar, router]);

  return (
    <View style={styles.container}>
      {/* Map — full screen */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: PARIS.lat,
          longitude: PARIS.lng,
          latitudeDelta: INITIAL_DELTA,
          longitudeDelta: INITIAL_DELTA,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={Platform.OS === 'android' ? LIGHT_MAP_STYLE : undefined}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {bars?.map((bar) => (
          <Marker
            key={bar.id}
            coordinate={{ latitude: bar.lat, longitude: bar.lng }}
            onPress={() => handleMarkerPress(bar)}
          >
            <View style={[
              styles.marker,
              bar.has_rewards && styles.markerReward,
              selectedBar?.id === bar.id && styles.markerActive,
            ]}>
              <Ionicons name="water" size={18} color={Colors.amber[500]} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Transparent header overlay */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Text style={styles.carteTitle}>Carte</Text>

        {user && (
          <TouchableOpacity
            onPress={() => setAddBarVisible(true)}
            style={styles.addBarBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={Colors.text} />
            <Text style={styles.addBarText}>Ajouter un point d'eau</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recenter button */}
      {location && (
        <TouchableOpacity
          style={[styles.recenterBtn, { bottom: 70 + insets.bottom }]}
          onPress={() =>
            mapRef.current?.animateToRegion(
              { latitude: location.lat, longitude: location.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
              400
            )
          }
          activeOpacity={0.8}
        >
          {canBlur ? (
            <BlurView intensity={40} tint="extraLight" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.recenterFallback]} />
          )}
          <Ionicons name="locate" size={20} color={Colors.text} />
        </TouchableOpacity>
      )}

      {/* Bar detail bottom sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['42%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: Colors.surface }}
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
        onClose={() => setSelectedBar(null)}
      >
        <BottomSheetView style={styles.sheetContent}>
          {selectedBar && (
            <>
              <Text style={styles.barName}>{selectedBar.name}</Text>
              <Text style={styles.barAddress}>{selectedBar.address}, {selectedBar.city}</Text>

              {/* Récompenses */}
              {selectedBar.has_rewards && (
                <View style={styles.sheetRewardBadge}>
                  <Text style={styles.sheetRewardText}>🏆 Ce point d'eau a des récompenses</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => router.push(`/bar/${selectedBar.id}`)}
                activeOpacity={0.8}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Voir le point d'eau</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNewPerf}
                activeOpacity={0.85}
                style={styles.perfBtn}
              >
                <Text style={styles.perfBtnText}>Nouvelle performance</Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Add bar modal */}
      <AddBarModal
        visible={addBarVisible}
        onClose={() => setAddBarVisible(false)}
        onBarAdded={handleBarAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  carteTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  addBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBarText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  marker: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: Colors.zinc[300],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  markerReward: { borderColor: Colors.amber[500], backgroundColor: Colors.amber[500] + '33' },
  markerActive: { borderColor: Colors.amber[500], backgroundColor: Colors.amber[400] },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recenterFallback: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 22,
  },
  sheetContent: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  barName: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  barAddress: { color: Colors.textSecondary, fontSize: 13 },
  sheetPricesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  sheetPrice: { color: Colors.amber[500], fontSize: 13, fontWeight: '700' },
  sheetPriceSep: { color: Colors.zinc[600], fontSize: 13 },
  sheetRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.amber[500] + '18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.amber[500] + '44',
  },
  sheetRewardText: { color: Colors.amber[500], fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  secondaryBtnText: { color: Colors.accent, fontWeight: '600' },
  perfBtn: {
    backgroundColor: Colors.amber[500],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  perfBtnText: { color: Colors.black, fontSize: 16, fontWeight: '700' },
});
