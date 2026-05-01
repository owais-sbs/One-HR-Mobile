import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';
import {
  loadNotificationCenter,
  markAllNotificationsRead,
  markNotificationRead,
  refreshNotificationCenter,
  type NotificationCategory,
  type NotificationRecord,
} from '../services/notificationService';

type NotificationItem = NotificationRecord;

const getNotificationIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'leave':
      return { icon: Calendar, bgColor: '#EFF6FF', iconColor: '#2563eb' };
    case 'attendance':
      return { icon: Clock, bgColor: '#FFFBEB', iconColor: '#d97706' };
    case 'approval':
      return { icon: CheckCircle, bgColor: '#F0FDF4', iconColor: '#16a34a' };
    case 'alert':
      return { icon: AlertCircle, bgColor: '#FEF2F2', iconColor: '#dc2626' };
    default:
      return { icon: Bell, bgColor: '#F4F4F5', iconColor: '#71717a' };
  }
};

const SectionHeader = ({ title }: { title: string }) => (
  <Text variant="medium" size={11} color={colors.text.muted} style={styles.sectionHeader}>
    {title}
  </Text>
);

const NotificationItemRow = ({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (id: string) => void;
}) => {
  const { icon: IconComponent, bgColor, iconColor } = getNotificationIcon(item.category);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        styles.notificationItem,
        !item.read && styles.unreadItem,
        pressed && styles.pressedItem,
      ]}
    >
      {!item.read && <View style={styles.unreadIndicator} />}
      <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
        <IconComponent size={18} color={iconColor} strokeWidth={2} />
      </View>
      <View style={styles.contentWrapper}>
        <View style={styles.topRow}>
          <Text variant="semibold" size={14} color={colors.text.primary} numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <Text variant="regular" size={11} color={colors.text.muted}>
            {item.timeLabel}
          </Text>
        </View>
        <Text variant="regular" size={13} color={colors.text.secondary} numberOfLines={2} style={styles.subtitle}>
          {item.subtitle}
        </Text>
      </View>
    </Pressable>
  );
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const refreshed = await refreshNotificationCenter();
      setNotifications(refreshed.length > 0 ? refreshed : await loadNotificationCenter());
    } catch (error) {
      console.error('Notification load error:', error);
      setNotifications(await loadNotificationCenter());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const groupedData = useMemo(() => {
    const unread = notifications.filter((item) => !item.read);
    const read = notifications.filter((item) => item.read);

    return [
      ...(unread.length > 0 ? [{ id: 'header-new', type: 'header' as const, title: 'NEW' }, ...unread.map((item) => ({ id: item.id, type: 'item' as const, ...item }))] : []),
      ...(read.length > 0 ? [{ id: 'header-earlier', type: 'header' as const, title: 'EARLIER' }, ...read.map((item) => ({ id: item.id, type: 'item' as const, ...item }))] : []),
    ];
  }, [notifications]);

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await markNotificationRead(id);
      setNotifications(updated);
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const updated = await markAllNotificationsRead();
      setNotifications(updated);
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return <SectionHeader title={item.title} />;
    }
    return <NotificationItemRow item={item} onPress={handleMarkRead} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Notifications" />
      <View style={styles.actionsRow}>
        <Text variant="medium" size={12} color={colors.text.muted}>
          Attendance reminders and leave updates
        </Text>
        <Pressable
          onPress={handleMarkAllRead}
          style={({ pressed }) => [
            styles.markAllButton,
            pressed && styles.markAllButtonPressed,
          ]}
        >
          <Text variant="semibold" size={11} color={colors.secondary}>
            Mark all read
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={groupedData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="All caught up!"
              message="You don't have any notifications at the moment."
              icon={<Bell size={40} color={colors.text.muted} />}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  markAllButtonPressed: {
    opacity: 0.8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  sectionHeader: {
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  unreadItem: {
    backgroundColor: '#F8FAFF',
    borderColor: colors.accent.blue,
  },
  pressedItem: {
    opacity: 0.7,
  },
  unreadIndicator: {
    position: 'absolute',
    left: -1,
    top: '50%',
    marginTop: -8,
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: colors.secondary,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentWrapper: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  subtitle: {
    lineHeight: 16,
  },
});

