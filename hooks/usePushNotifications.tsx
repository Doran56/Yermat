import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PushState {
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>({
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false, error: 'Permission refusée' }));
        return false;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      await (supabase.from('push_subscriptions') as any).upsert({
        user_id: user.id,
        expo_push_token: tokenData.data,
        platform: Platform.OS,
      }, { onConflict: 'user_id,expo_push_token' });

      setState({ isSubscribed: true, isLoading: false, error: null });
      return true;
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: "Erreur lors de l'inscription" }));
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      await (supabase.from('push_subscriptions') as any)
        .delete()
        .eq('user_id', user.id)
        .eq('expo_push_token', tokenData.data);
      setState(prev => ({ ...prev, isSubscribed: false }));
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {});
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {});
    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return { ...state, subscribe, unsubscribe };
}
