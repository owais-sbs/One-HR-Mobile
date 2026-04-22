import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Clock, Calendar, ClipboardList } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getDuration(inTime?: string, outTime?: string) {
  if (!inTime || !outTime) return null;
  const start = new Date(inTime).getTime();
  const end = new Date(outTime).getTime();
  const ms = end - start;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export default function AttendanceReportScreen({ navigation }: any) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.HISTORY);
      const data = response.data?.data || [];
      setAttendanceData(data);
    } catch (error) {
      console.error('Attendance history error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance])
  );

  const presentCount = attendanceData.filter((a) => a.outTime && a.inTime).length;
  const absentCount = attendanceData.filter((a) => !a.inTime).length;
  const onLeaveCount = 0; // TODO: integrate with leave module

  const renderItem = ({ item }: { item: any }) => {
    const isPresent = item.inTime != null;
    const status = item.outTime ? 'Present' : isPresent ? 'Clocked In' : 'Absent';
    const duration = getDuration(item.inTime, item.outTime);

    return (
      <View style={styles.logItem}>
        <View style={styles.logDateContainer}>
          <Text variant="bold" size={16} color={colors.text.primary}>
            {formatDate(item.inTime).split(' ')[0]}
          </Text>
          <Text variant="medium" size={12} color={colors.text.secondary}>
            {formatDate(item.inTime).split(' ')[1]}
          </Text>
        </View>
        <View style={styles.logInfo}>
          <View style={styles.logTimeRow}>
            <Clock size={14} color={colors.text.muted} />
            <Text variant="regular" size={13} color={colors.text.secondary} style={styles.logTimeText}>
              {isPresent ? `${formatTime(item.inTime)} - ${item.outTime ? formatTime(item.outTime) : '—'}` : '—'}
            </Text>
          </View>
          {duration && (
            <Text variant="regular" size={12} color={colors.text.muted}>
              Duration: {duration}
            </Text>
          )}
        </View>
        <StatusBadge status={status} />
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.monthSelector}>
        <Calendar size={18} color={colors.secondary} />
        <Text variant="bold" size={15} color={colors.secondary} style={styles.currentMonth}>
          Attendance History
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text variant="bold" size={20} color="#FFFFFF">{presentCount}</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)">Present</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text variant="bold" size={20} color="#FFFFFF">{absentCount}</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)">Absent</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text variant="bold" size={20} color="#FFFFFF">{onLeaveCount}</Text>
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
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={attendanceData}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
