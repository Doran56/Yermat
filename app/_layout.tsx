import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { RevealProvider } from '@/context/RevealContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { supabase } from '@/integrations/supabase/client';

// Empêche le splash de se fermer avant que les polices soient prêtes
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  },
});

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { subscribe } = usePushNotifications();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // Auto-subscribe to push notifications on login
  useEffect(() => {
    if (!session) return;
    subscribe();
  }, [session?.user?.id]);

  // Navigate to the right screen when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      const { type, performanceId, barId } = data;
      switch (type) {
        case 'new_performance':
        case 'comment':
        case 'yermat':
        case 'personal_best':
          if (performanceId) router.push(`/performance/${performanceId}`);
          break;
        case 'new_follower':
          router.push('/(tabs)/profile');
          break;
        case 'medal_earned':
          router.push('/(tabs)/classement');
          break;
        case 'rank_beaten':
          if (barId) router.push(`/bar/${barId}`);
          else router.push('/(tabs)/classement');
          break;
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) return <LoadingScreen />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090B' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="perform/[barId]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="performance/[id]" />
      <Stack.Screen name="bar/[barId]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="admin/reports" />
      <Stack.Screen name="admin/bars" />
      <Stack.Screen name="admin/bar/[barId]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular: require('../assets/fonts/BebasNeue-Regular.ttf'),
    Inter_400Regular: require('../assets/fonts/Inter-Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter-Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/Inter-Bold.ttf'),
    Inter_900Black: require('../assets/fonts/Inter-Black.ttf'),
  });

  // Tous les useEffect AVANT le return conditionnel — Rules of Hooks
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;
      const params = new URLSearchParams(url.slice(hashIndex + 1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }); });
    return () => subscription.remove();
  }, []);

  // Render conditionnel APRÈS tous les hooks
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RevealProvider>
              <StatusBar style="dark" />
              <AuthGate />
            </RevealProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
