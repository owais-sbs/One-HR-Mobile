import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Clock, Calendar, ClipboardList } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/ui/ScreenHeader';

export default function AttendanceReportScreen({ navigation }: any) {
  const attendanceData = [
    { id: '1', date: '15 Apr', checkIn: '09:00 AM', checkOut: '06:00 PM', status: 'Present' },
    { id: '2', date: '14 Apr', checkIn: '08:55 AM', checkOut: '06:10 PM', status: 'Present' },
    { id: '3', date: '13 Apr', checkIn: '-', checkOut: '-', status: 'On Leave' },
    { id: '4', date: '12 Apr', checkIn: '09:15 AM', checkOut: '06:00 PM', status: 'Present' },
    { id: '5', date: '11 Apr', checkIn: '09:00 AM', checkOut: '05:45 PM', status: 'Present' },
  ];

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.logItem}>
      <View style={styles.logDateContainer}>
        <Text variant="bold" size={16} color={colors.text.primary}>
          {item.date.split(' ')[0]}
        </Text>
        <Text variant="medium" size={12} color={colors.text.secondary}>
          {item.date.split(' ')[1]}
        </Text>
      </View>
      <View style={styles.logInfo}>
        <View style={styles.logTimeRow}>
          <Clock size={14} color={colors.text.muted} />
          <Text variant="regular" size={13} color={colors.text.secondary} style={styles.logTimeText}>
            {item.checkIn} - {item.checkOut}
          </Text>
        </View>
        <Text variant="regular" size={12} color={colors.text.muted}>
          Shift: General (09:00 - 18:00)
        </Text>
      </View>
      <StatusBadge status={item.status} />
    </View>
  );

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.monthSelector}>
        <Calendar size={18} color={colors.secondary} />
        <Text variant="bold" size={15} color={colors.secondary} style={styles.currentMonth}>
          April 2024
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text variant="bold" size={20} color="#FFFFFF">22</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)">Present</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text variant="bold" size={20} color="#FFFFFF">2</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)">Absent</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text variant="bold" size={20} color="#FFFFFF">4</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)">Leave</Text>
        </View>
      </View>

      <Text variant="bold" size={17} color={colors.text.primary} style={styles.sectionTitle}>
        Daily Logs
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Attendance Report" />
      <FlatList
        data={attendanceData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="No logs found"
            message="You haven't recorded any attendance logs for this period."
            icon={<ClipboardList size={48} color={colors.text.muted} />}
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
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerContent: {
    marginBottom: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.blue,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  currentMonth: {
    marginLeft: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  logDateContainer: {
    width: 50,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight: 10,
    alignItems: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  logTimeText: {
    marginLeft: 6,
  },
});
