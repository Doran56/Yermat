import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NotificationWithDetails,
} from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/colors';
import { formatRelativeDate } from '@/lib/utils';

function getNotificationText(notif: NotificationWithDetails): string {
  const actor = notif.source_user?.username ?? 'Quelqu\'un';
  const bar = notif.source_bar?.name ?? "ce point d'eau";

  switch (notif.type) {
    case 'user_performance': return `${actor} a posté un nouveau Yermat`;
    case 'bar_performance':  return `Nouveau Yermat au ${bar}`;
    case 'comment':          return `${actor} a commenté ton Yermat`;
    case 'yermat':           return `${actor} a ajouté une goutte à ton Yermat 💧`;
    case 'new_follower':     return `${actor} commence à te suivre`;
    case 'rank_beaten':      return `${actor} vient de te détrôner au ${bar} !`;
    case 'personal_best':    return 'Nouveau record perso ! 🎉';
    case 'medal_earned':     return 'Tu as gagné une médaille 🏅';
    default:                 return 'Nouvelle notification';
  }
}

function getNotificationIcon(type: NotificationWithDetails['type']): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'user_performance': return 'water-outline';
    case 'bar_performance':  return 'location-outline';
    case 'comment':          return 'chatbubble-outline';
    case 'yermat':           return 'water';
    case 'new_follower':     return 'person-add-outline';
    case 'rank_beaten':      return 'trending-down-outline';
    case 'personal_best':    return 'trophy-outline';
    case 'medal_earned':     return 'medal-outline';
    default:                 return 'notifications-outline';
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePress = useCallback((notif: NotificationWithDetails) => {
    if (!notif.read) markRead.mutate(notif.id);
    switch (notif.type) {
      case 'user_performance':
      case 'bar_performance':
      case 'comment':
      case 'yermat':
      case 'personal_best':
        if (notif.performance_id) router.push(`/performance/${notif.performance_id}`);
        break;
      case 'rank_beaten':
        if (notif.source_bar_id) router.push(`/bar/${notif.source_bar_id}`);
        else router.push('/(tabs)/classement');
        break;
      case 'new_follower':
      case 'medal_earned':
        router.push('/(tabs)/classement');
        break;
    }
  }, [markRead, router]);

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Notifications"
        onBack={() => router.back()}
        rightElement={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => markAllRead.mutate()}
              style={styles.markAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {isLoading ? (
        <ActivityIndicator color={Colors.amber[500]} style={styles.loader} />
      ) : !notifications?.length ? (
        <EmptyState
          icon="notifications-off-outline"
          title="Aucune notification"
          description="Tes notifications apparaîtront ici"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.amber[500]}
            />
          }
        >
          {notifications.map(notif => (
            <TouchableOpacity
              key={notif.id}
              onPress={() => handlePress(notif)}
              style={[styles.item, !notif.read && styles.itemUnread]}
              activeOpacity={0.75}
            >
              <View style={styles.avatarWrap}>
                {notif.source_user ? (
                  <Avatar
                    uri={notif.source_user.avatar_url}
                    name={notif.source_user.username}
                    size={42}
                  />
                ) : (
                  <View style={styles.iconAvatar}>
                    <Ionicons
                      name={getNotificationIcon(notif.type)}
                      size={20}
                      color={Colors.amber[500]}
                    />
                  </View>
                )}
              </View>

              <View style={styles.itemContent}>
                <Text style={styles.itemText} numberOfLines={2}>
                  {getNotificationText(notif)}
                </Text>
                <Text style={styles.itemTime}>
                  {formatRelativeDate(notif.created_at)}
                </Text>
              </View>

              {!notif.read && <View style={styles.dot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loader: { flex: 1 },
  list: { paddingBottom: 32 },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    color: Colors.amber[500],
    fontSize: 13,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemUnread: {
    backgroundColor: Colors.bgElevated,
  },
  avatarWrap: {
    width: 42,
    height: 42,
  },
  iconAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bgElevated2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  itemTime: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.amber[500],
  },
});
