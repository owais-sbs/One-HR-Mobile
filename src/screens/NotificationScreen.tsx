import React from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Bell, Calendar, DollarSign, Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';

interface Notification {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  iconColor: string;
  read: boolean;
  category: 'salary' | 'leave' | 'attendance' | 'general' | 'document' | 'approval' | 'alert';
}

const getNotificationIcon = (category: Notification['category']) => {
  switch (category) {
    case 'salary':
      return { icon: DollarSign, bgColor: '#ECFDF5', iconColor: '#16a34a' };
    case 'leave':
      return { icon: Calendar, bgColor: '#EFF6FF', iconColor: '#2563eb' };
    case 'attendance':
      return { icon: Clock, bgColor: '#FFFBEB', iconColor: '#d97706' };
    case 'approval':
      return { icon: CheckCircle, bgColor: '#F0FDF4', iconColor: '#16a34a' };
    case 'document':
      return { icon: FileText, bgColor: '#F5F3FF', iconColor: '#7c3aed' };
    case 'alert':
      return { icon: AlertCircle, bgColor: '#FEF2F2', iconColor: '#dc2626' };
    default:
      return { icon: Bell, bgColor: '#F4F4F5', iconColor: '#71717a' };
  }
};

const notifications: Notification[] = [
  {
    id: '1',
    title: 'Salary Credited',
    subtitle: 'Your salary for April 2026 has been processed',
    time: '2h ago',
    category: 'salary',
    read: false,
    ...getNotificationIcon('salary'),
  },
  {
    id: '2',
    title: 'Leave Approved',
    subtitle: 'Your leave for Apr 25 has been approved',
    time: '5h ago',
    category: 'approval',
    read: false,
    ...getNotificationIcon('approval'),
  },
  {
    id: '3',
    title: 'Clock-in Reminder',
    subtitle: "Don't forget to clock in for your morning shift",
    time: '1d ago',
    category: 'attendance',
    read: true,
    ...getNotificationIcon('attendance'),
  },
  {
    id: '4',
    title: 'Payslip Available',
    subtitle: 'Your March 2026 payslip is ready to view',
    time: '2d ago',
    category: 'document',
    read: true,
    ...getNotificationIcon('document'),
  },
  {
    id: '5',
    title: 'New Policy Update',
    subtitle: 'Updated attendance policy effective May 1',
    time: '3d ago',
    category: 'general',
    read: true,
    ...getNotificationIcon('general'),
  },
];

const SectionHeader = ({ title }: { title: string }) => (
  <Text variant="medium" size={11} color={colors.text.muted} style={styles.sectionHeader}>
    {title}
  </Text>
);

const NotificationItem = ({ item }: { item: Notification }) => {
  const IconComponent = item.icon;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.notificationItem,
        !item.read && styles.unreadItem,
        pressed && styles.pressedItem,
      ]}
    >
      {!item.read && <View style={styles.unreadIndicator} />}
      <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
        <IconComponent size={18} color={item.iconColor} strokeWidth={2} />
      </View>
      <View style={styles.contentWrapper}>
        <View style={styles.topRow}>
          <Text variant="semibold" size={14} color={colors.text.primary} numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <Text variant="regular" size={11} color={colors.text.muted}>
            {item.time}
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
  const todayNotifications = notifications.filter(n => n.read === false);
  const earlierNotifications = notifications.filter(n => n.read === true);

  const data = [
    ...(todayNotifications.length > 0 ? [{ id: 'header-new', type: 'header' as const, title: 'NEW' }, ...todayNotifications.map(n => ({ id: n.id, type: 'item' as const, ...n }))] : []),
    ...(earlierNotifications.length > 0 ? [{ id: 'header-earlier', type: 'header' as const, title: 'EARLIER' }, ...earlierNotifications.map(n => ({ id: n.id, type: 'item' as const, ...n }))] : []),
  ];

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return <SectionHeader title={item.title} />;
    }
    return <NotificationItem item={item} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={data}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
