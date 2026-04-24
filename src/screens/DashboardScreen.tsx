import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import {
  Calendar,
  ChevronRight,
  LogIn,
  LogOut,
  TrendingUp,
  UserCheck,
  Clock,
  FileText,
  Users,
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { LeaveCard } from '../components/ui/LeaveCard';
import { CustomBarChart } from '../components/ui/CustomBarChart';
import { CustomPieChart } from '../components/ui/CustomPieChart';
import { STORAGE_KEYS, API_ENDPOINTS } from '../config/apiConfig';
import apiClient from '../api/apiClient';

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '??';
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function extractTimeFromDateTime(dateTimeStr?: string) {
  if (!dateTimeStr) return null;
  // Parse LocalDateTime string like "1970-01-01T09:00:00" manually to avoid UTC issues
  const match = dateTimeStr.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
}

export default function DashboardScreen({ navigation }: any) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employee, setEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [workingHours, setWorkingHours] = useState<any>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [teamLeavesCount, setTeamLeavesCount] = useState(0);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update elapsed time when clocked in
  useEffect(() => {
    if (!isClockedIn || !todayAttendance?.inTime) return;
    const inTime = new Date(todayAttendance.inTime);
    const updateElapsed = () => {
      setElapsedMs(Date.now() - inTime.getTime());
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, todayAttendance]);

  const loadDashboardData = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      if (cached) {
        const emp = JSON.parse(cached);
        setEmployee(emp);

        // Fetch today's attendance
        await fetchTodayAttendance();

        // Fetch working hours for company
        if (emp?.companyId) {
          await fetchWorkingHours(emp.companyId);
        }

        // Fetch leave balances
        if (emp?.id) {
          await fetchLeaveBalances(emp.id);
        }

        // Fetch pending team leaves count if manager
        if (emp?.id && emp?.reportingManagerId) {
          await fetchTeamLeavesCount(emp.id);
        }
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.TODAY);
      const data = response.data?.data;
      if (data) {
        setTodayAttendance(data);
        setIsClockedIn(data.outTime == null);
        if (data.outTime) {
          const inTime = new Date(data.inTime).getTime();
          const outTime = new Date(data.outTime).getTime();
          setElapsedMs(outTime - inTime);
        }
      } else {
        setTodayAttendance(null);
        setIsClockedIn(false);
        setElapsedMs(0);
      }
    } catch (error) {
      console.error('Fetch attendance error:', error);
      setTodayAttendance(null);
      setIsClockedIn(false);
    }
  };

  const fetchWorkingHours = async (companyId: number) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKING_HOURS.BY_COMPANY(companyId));
      setWorkingHours(response.data?.data || null);
    } catch (error) {
      console.error('Fetch working hours error:', error);
      setWorkingHours(null);
    }
  };

  const fetchLeaveBalances = async (employeeId: number) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.LEAVE.BALANCES(employeeId));
      if (response.data?.isSuccess !== false) {
        const balances = response.data?.data || [];
        setLeaveBalances(balances);
      }
    } catch (error) {
      console.error('Fetch leave balances error:', error);
    }
  };

  const fetchTeamLeavesCount = async (supervisorId: number) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.LEAVE.TEAM_LEAVES_BY_STATUS(supervisorId, 'PENDING'));
      if (response.data?.isSuccess !== false) {
        const leaves = response.data?.data || [];
        setTeamLeavesCount(leaves.length);
      }
    } catch (error) {
      console.error('Fetch team leaves error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleClockIn = () => {
    Alert.alert(
      'Clock In',
      'Are you sure you want to clock in?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock In',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CLOCK_IN);
              if (response.data?.isSuccess === false) {
                Alert.alert('Error', response.data?.error || 'Clock in failed');
                return;
              }
              const data = response.data?.data;
              if (data) {
                setTodayAttendance(data);
                setIsClockedIn(true);
                setElapsedMs(0);
              }
            } catch (error: any) {
              const msg = error?.response?.data?.error || error?.message || 'Clock in failed';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClockOut = () => {
    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CLOCK_OUT);
              if (response.data?.isSuccess === false) {
                Alert.alert('Error', response.data?.error || 'Clock out failed');
                return;
              }
              const data = response.data?.data;
              if (data) {
                setTodayAttendance(data);
                setIsClockedIn(false);
                const inTime = new Date(data.inTime).getTime();
                const outTime = new Date(data.outTime).getTime();
                setElapsedMs(outTime - inTime);
              }
            } catch (error: any) {
              const msg = error?.response?.data?.error || error?.message || 'Clock out failed';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const defaultBalances = [
    { type: 'Annual Leave', left: 8, total: 12, color: colors.secondary },
    { type: 'Sick Leave', left: 8, total: 10, color: colors.success },
    { type: 'Casual Leave', left: 4, total: 5, color: colors.warning },
  ];

  const workStartTime = extractTimeFromDateTime(workingHours?.startTime);
  const workEndTime = extractTimeFromDateTime(workingHours?.endTime);
  const workDurationMs = workStartTime && workEndTime
    ? (workEndTime.getTime() - workStartTime.getTime())
    : 0;

  const progressPercent = workDurationMs > 0
    ? Math.min(100, Math.round((elapsedMs / workDurationMs) * 100))
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text variant="medium" size={10} color={colors.text.muted} style={styles.greetingLabel}>
              Good Morning
            </Text>
            <Text variant="bold" size={18} color={colors.text.primary}>
              {employee
                ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.accountName || 'Employee'
                : 'Employee'}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => [
              styles.avatar,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Text variant="semibold" size={12} color={colors.text.primary}>
              {getInitials(employee?.firstName, employee?.lastName)}
            </Text>
          </Pressable>
        </View>

        <View style={styles.clockCard}>
          <View style={styles.dateBadge}>
            <Calendar size={11} color="rgba(255,255,255,0.7)" />
            <Text variant="regular" size={10} color="rgba(255,255,255,0.7)" style={styles.dateText}>
              {dateStr}
            </Text>
          </View>
          <Text variant="bold" size={32} color="#FFFFFF" style={styles.timeText}>
            {timeStr}
          </Text>

          {todayAttendance?.inTime && (
            <View style={styles.loggedHoursContainer}>
              <Clock size={14} color="rgba(255,255,255,0.8)" />
              <Text variant="medium" size={12} color="rgba(255,255,255,0.8)" style={styles.loggedHoursText}>
                {isClockedIn ? 'Logged In: ' : 'Total Hours: '}
                {formatDuration(elapsedMs)}
              </Text>
            </View>
          )}

          {workingHours && (
            <View style={styles.workingHoursRow}>
              <Text variant="regular" size={10} color="rgba(255,255,255,0.5)">
                Work: {workStartTime ? workStartTime.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:true}) : '—'} — {workEndTime ? workEndTime.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:true}) : '—'}
              </Text>
            </View>
          )}

          {workDurationMs > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text variant="regular" size={9} color="rgba(255,255,255,0.5)">
                {progressPercent}% of daily hours
              </Text>
            </View>
          )}

          {todayAttendance?.inTime && (
            <View style={styles.timesRow}>
              <View style={styles.timeBox}>
                <Text variant="regular" size={9} color="rgba(255,255,255,0.5)">In</Text>
                <Text variant="semibold" size={12} color="#FFFFFF">{formatTime(todayAttendance.inTime)}</Text>
              </View>
              {todayAttendance?.outTime && (
                <View style={styles.timeBox}>
                  <Text variant="regular" size={9} color="rgba(255,255,255,0.5)">Out</Text>
                  <Text variant="semibold" size={12} color="#FFFFFF">{formatTime(todayAttendance.outTime)}</Text>
                </View>
              )}
            </View>
          )}

          <Button
            onPress={isClockedIn ? handleClockOut : handleClockIn}
            title={isClockedIn ? "Clock Out" : "Clock In"}
            variant={isClockedIn ? "danger" : "secondary"}
            size="sm"
            icon={isClockedIn ? <LogOut size={14} color="#fff" /> : <LogIn size={14} color="#fff" />}
            style={styles.clockButton}
            disabled={loading}
          />
          {loading && <ActivityIndicator style={styles.loader} color="#FFFFFF" />}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <StatCard
              label="On Leave"
              value="8 Days"
              description="This year total"
              color={colors.secondary}
              icon={<TrendingUp size={16} color={colors.secondary} />}
            />
          </View>
          <View style={styles.statGap} />
          <View style={styles.statItem}>
            <StatCard
              label="Present"
              value="22 Days"
              description="Current month"
              color={colors.success}
              icon={<UserCheck size={16} color={colors.success} />}
            />
          </View>
        </View>

        <View style={styles.chartsSection}>
          <CustomPieChart
            title="Leave Distribution"
            data={[
              { value: 12, color: colors.secondary, label: 'Annual' },
              { value: 8, color: colors.success, label: 'Sick' },
              { value: 4, color: colors.warning, label: 'Casual' },
            ]}
          />

          <CustomBarChart
            title="Weekly Activity"
            data={[
              { value: 8, label: "Mon" },
              { value: 9, label: "Tue" },
              { value: 8.5, label: "Wed" },
              { value: 9.8, label: "Thu" },
              { value: 7.5, label: "Fri" },
            ]}
            yAxisSuffix="h"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="semibold" size={14} color={colors.text.primary}>
              Leave Balances
            </Text>
            <Pressable onPress={() => navigation.navigate('ApplyLeave')}>
              <Text variant="medium" size={11} color={colors.secondary}>
                + Apply Leave
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {(leaveBalances.length > 0 ? leaveBalances.map((b: any) => ({
              type: b.leaveTypeName || 'Leave',
              left: b.remaining || 0,
              total: b.totalAllocated || 0,
              color: colors.secondary,
            })) : defaultBalances).map((leave: any, index: number, arr: any[]) => (
              <LeaveCard
                key={index}
                label={leave.type}
                left={leave.left}
                total={leave.total}
                color={leave.color}
                style={index < arr.length - 1 ? styles.leaveCardMargin : undefined}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="semibold" size={14} color={colors.text.primary}>
              Leave Requests
            </Text>
            <Pressable onPress={() => navigation.navigate('LeaveHistory')}>
              <Text variant="medium" size={11} color={colors.secondary}>
                View All
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.actionCardPressed
            ]}
            onPress={() => navigation.navigate('LeaveHistory')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent.blue }]}>
              <FileText size={18} color={colors.secondary} />
            </View>
            <View style={styles.actionContent}>
              <Text variant="semibold" size={13} color={colors.text.primary}>
                My Leave History
              </Text>
              <Text variant="regular" size={11} color={colors.text.secondary}>
                View all your leave requests
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.muted} />
          </Pressable>

          {employee?.reportingManagerId && (
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
                { marginTop: 8 }
              ]}
              onPress={() => navigation.navigate('TeamLeaves')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success + '15' }]}>
                <Users size={18} color={colors.success} />
              </View>
              <View style={styles.actionContent}>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  Team Leave Requests
                </Text>
                <Text variant="regular" size={11} color={colors.text.secondary}>
                  {teamLeavesCount > 0 ? `${teamLeavesCount} pending approval${teamLeavesCount > 1 ? 's' : ''}` : 'No pending approvals'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.text.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="semibold" size={14} color={colors.text.primary}>
              Upcoming Holidays
            </Text>
            <Pressable onPress={() => navigation.navigate('HolidayList')}>
              <Text variant="medium" size={11} color={colors.secondary}>
                See All
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.holidayItem,
              pressed && styles.holidayItemPressed
            ]}
            onPress={() => navigation.navigate('HolidayList')}
          >
            <View style={[styles.holidayIcon, { backgroundColor: colors.accent.blue }]}>
              <Calendar size={16} color={colors.secondary} />
            </View>
            <View style={styles.itemContent}>
              <Text variant="semibold" size={13} color={colors.text.primary}>
                New Year&apos;s Eve
              </Text>
              <Text variant="regular" size={11} color={colors.text.secondary}>
                31 Dec 2024
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    padding: 12,
    paddingTop: 6,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: {
    gap: 1,
  },
  greetingLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  clockCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dateText: {
    letterSpacing: 0.2,
  },
  timeText: {
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  loggedHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  loggedHoursText: {
    letterSpacing: 0.3,
  },
  workingHoursRow: {
    marginBottom: 8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  timeBox: {
    alignItems: 'center',
  },
  clockButton: {
    width: '100%',
    borderRadius: 10,
    height: 40,
  },
  loader: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statGap: {
    width: 10,
  },
  chartsSection: {
    gap: 10,
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalScroll: {
    paddingRight: 12,
  },
  leaveCardMargin: {
    marginRight: 10,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  holidayItemPressed: {
    backgroundColor: '#F8F8F8',
  },
  holidayIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  actionCardPressed: {
    backgroundColor: '#F8F8F8',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
});
