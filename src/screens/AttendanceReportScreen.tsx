import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Clock, Calendar, ClipboardList } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import apiClient from '../api/apiClient';
import { API_ENDPOINTS, STORAGE_KEYS, CACHE_TTL } from '../config/apiConfig';
import { getCurrentEmployee } from '../api/employeeService';
import { getCompanyById } from '../api/companyService';
import { normalizeEmployeeData } from '../utils/employeeData';

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_BY_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

type AttendanceItem = {
  id: number;
  inTime?: string;
  outTime?: string | null;
};

type ReportDay = {
  key: string;
  date: Date;
  dayLabel: string;
  workingDay: boolean;
  status: 'Present' | 'Clocked In' | 'Absent' | 'Off Day' | 'Working Day';
  inTime?: string;
  outTime?: string | null;
  hours: number;
};

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekdayKey(date: Date) {
  return WEEKDAY_BY_INDEX[date.getDay()] || 'mon';
}

function hoursBetween(start?: string, end?: string | null) {
  if (!start || !end) return 0;
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return 0;
  return Math.max(0, (endDate.getTime() - startDate.getTime()) / 3_600_000);
}

function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatFullDay(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function buildFallbackOutTime(inTime?: string, endTime?: string) {
  if (!inTime || !endTime) return null;
  const inDate = parseDate(inTime);
  if (!inDate) return null;
  const timeMatch = endTime.match(/^(\d{2}):(\d{2})/);
  if (timeMatch) {
    const fallback = new Date(inDate);
    fallback.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return fallback.toISOString();
  }
  const endDate = parseDate(endTime);
  if (endDate) return endDate.toISOString();
  return null;
}

export default function AttendanceReportScreen() {
  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAttendance = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
      await AsyncStorage.removeItem(STORAGE_KEYS.ATTENDANCE_CACHE);
    } else {
      setLoading(true);
    }
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      let employee = cached ? normalizeEmployeeData(JSON.parse(cached)) : null;

      if (!employee) {
        const response = await getCurrentEmployee();
        employee = normalizeEmployeeData(response);
        if (employee) {
          await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEE_DATA, JSON.stringify(employee));
        }
      }

      if (employee?.companyId) {
        const cachedCompany = await AsyncStorage.getItem(`${STORAGE_KEYS.COMPANY_DATA}_${employee.companyId}`);
        if (cachedCompany) {
          setCompany(JSON.parse(cachedCompany));
        } else {
          try {
            const companyData = await getCompanyById(employee.companyId);
            setCompany(companyData);
            await AsyncStorage.setItem(`${STORAGE_KEYS.COMPANY_DATA}_${employee.companyId}`, JSON.stringify(companyData));
          } catch (companyError) {
            console.error('Company load error:', companyError);
            setCompany(null);
          }
        }
      } else {
        setCompany(null);
      }

      if (!forceRefresh) {
        const now = Date.now();
        const attendanceCache = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE_CACHE);
        if (attendanceCache) {
          const { data, timestamp } = JSON.parse(attendanceCache);
          if (now - timestamp < CACHE_TTL.ATTENDANCE) {
            setAttendanceData(data);
            return;
          }
        }
      }

      const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.HISTORY);
      const data = response.data?.data || [];
      const attendanceList = Array.isArray(data) ? data : [];
      setAttendanceData(attendanceList);
      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_CACHE, JSON.stringify({
        data: attendanceList,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Attendance history error:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    loadAttendance(true);
  }, [loadAttendance]);

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance])
  );

  const reportDate = useMemo(() => new Date(), []);
  const companyEndTime = company?.endTime;
  const workingDayKeys = useMemo(() => {
    const enabled = Object.entries(company?.workingDays ?? {})
      .filter(([, isEnabled]) => isEnabled)
      .map(([day]) => day.toLowerCase());
    return WEEKDAY_ORDER.filter((day) => enabled.includes(day));
  }, [company]);

  const monthDays = useMemo(() => {
    const monthStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
    const monthEnd = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordMap = new Map<string, AttendanceItem>();

    attendanceData.forEach((item) => {
      const checkIn = parseDate(item.inTime);
      if (!checkIn) return;
      const key = getDateKey(checkIn);
      if (!recordMap.has(key)) {
        recordMap.set(key, item);
      }
    });

    const days: ReportDay[] = [];
    const cursor = new Date(monthStart);

    while (cursor <= monthEnd) {
      const key = getDateKey(cursor);
      const weekdayKey = getWeekdayKey(cursor);
      const record = recordMap.get(key);
      const fallbackOutTime = record?.outTime ?? buildFallbackOutTime(record?.inTime, companyEndTime);
      const isWorkingDay = workingDayKeys.length > 0
        ? workingDayKeys.includes(weekdayKey)
        : true;

      let status: ReportDay['status'] = 'Off Day';
      if (isWorkingDay) {
        if (fallbackOutTime) {
          status = 'Present';
        } else if (record?.inTime) {
          status = 'Clocked In';
        } else {
          const dayStart = new Date(cursor);
          dayStart.setHours(0, 0, 0, 0);
          status = dayStart > today ? 'Working Day' : 'Absent';
        }
      } else if (record?.inTime) {
        status = record.outTime ? 'Present' : 'Clocked In';
      }

      days.push({
        key,
        date: new Date(cursor),
        dayLabel: WEEKDAY_LABELS[weekdayKey] || weekdayKey.toUpperCase(),
        workingDay: isWorkingDay,
        status,
        inTime: record?.inTime,
        outTime: fallbackOutTime,
        hours: fallbackOutTime ? hoursBetween(record?.inTime, fallbackOutTime) : 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [attendanceData, companyEndTime, reportDate, workingDayKeys]);

  const presentCount = monthDays.filter((day) => day.status === 'Present').length;
  const clockedInCount = monthDays.filter((day) => day.status === 'Clocked In').length;
  const absentCount = monthDays.filter((day) => day.status === 'Absent').length;
  const workingCount = monthDays.filter((day) => day.workingDay).length;
  const totalHours = monthDays.reduce((sum, day) => sum + day.hours, 0);

  const todayKey = getDateKey(reportDate);
  const todayEntry = monthDays.find((day) => day.key === todayKey);

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.monthSelector}>
        <Calendar size={18} color={colors.secondary} />
        <View style={styles.monthTextBlock}>
          <Text variant="bold" size={15} color={colors.secondary}>
            {formatMonthLabel(reportDate)}
          </Text>
          <Text variant="regular" size={11} color={colors.text.secondary}>
            Monthly attendance summary
          </Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text variant="bold" size={20} color="#FFFFFF">{workingCount}</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.7)">Working Days</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.success }]}>
          <Text variant="bold" size={20} color="#FFFFFF">{presentCount}</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.7)">Present</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.warning }]}>
          <Text variant="bold" size={20} color="#FFFFFF">{clockedInCount}</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.7)">In Progress</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.error }]}>
          <Text variant="bold" size={20} color="#FFFFFF">{absentCount}</Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.7)">Absent</Text>
        </View>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text variant="bold" size={16} color={colors.text.primary}>
              {formatDuration(totalHours)}
            </Text>
            <Text variant="regular" size={11} color={colors.text.secondary}>
              Total worked this month
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text variant="bold" size={16} color={colors.text.primary}>
              {todayEntry?.status || 'No record'}
            </Text>
            <Text variant="regular" size={11} color={colors.text.secondary}>
              Today&apos;s status
            </Text>
          </View>
        </View>

        {company && (
          <View style={styles.scheduleRow}>
            <Text variant="medium" size={11} color={colors.text.secondary}>
              Schedule:
            </Text>
            <Text variant="semibold" size={11} color={colors.text.primary}>
              {workingDayKeys.length > 0
                ? workingDayKeys.map((day) => WEEKDAY_LABELS[day] || day.toUpperCase()).join(' · ')
                : 'Not configured'}
            </Text>
            <Text variant="medium" size={11} color={colors.text.secondary}>
              {company.startTime ? `${company.startTime.slice(0, 5)} - ${company.endTime.slice(0, 5)}` : ''}
            </Text>
          </View>
        )}
      </View>

      <Text variant="bold" size={17} color={colors.text.primary} style={styles.sectionTitle}>
        Daily Breakdown
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: ReportDay }) => {
    const isToday = item.key === todayKey;
    const durationLabel = item.inTime
      ? item.outTime
        ? formatDuration(item.hours)
        : 'In progress'
      : item.workingDay
        ? 'No clock in recorded'
        : 'Scheduled off';

    return (
      <View
        style={[
          styles.dayCard,
          !item.workingDay && styles.dayCardOff,
          isToday && styles.dayCardToday,
        ]}
      >
        <View style={styles.dayDateColumn}>
          <Text variant="bold" size={18} color={colors.text.primary}>
            {item.date.getDate()}
          </Text>
          <Text variant="medium" size={11} color={colors.text.secondary}>
            {item.dayLabel}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <View style={styles.dayInfoTop}>
            <View style={styles.dayTitleBlock}>
              <Text variant="semibold" size={13} color={colors.text.primary}>
                {formatFullDay(item.date)}
              </Text>
              <Text variant="regular" size={11} color={colors.text.secondary}>
                {item.workingDay ? 'Working day' : 'Off day'}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.dayTimesRow}>
            <View style={styles.timeChip}>
              <Clock size={12} color={colors.text.muted} />
              <Text variant="regular" size={11} color={colors.text.secondary} style={styles.timeChipText}>
                In: {formatTime(item.inTime)}
              </Text>
            </View>
            <View style={styles.timeChip}>
              <Clock size={12} color={colors.text.muted} />
              <Text variant="regular" size={11} color={colors.text.secondary} style={styles.timeChipText}>
                Out: {formatTime(item.outTime)}
              </Text>
            </View>
          </View>

          <Text variant="medium" size={11} color={colors.text.secondary}>
            Duration: {durationLabel}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Attendance Report" />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={monthDays}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ClipboardList size={48} color={colors.text.muted} />
              <Text variant="semibold" size={15} color={colors.text.primary} style={styles.emptyTitle}>
                No attendance logs found
              </Text>
              <Text variant="regular" size={12} color={colors.text.secondary} style={styles.emptyText}>
                Your month view will appear here once clock-in and clock-out records are available.
              </Text>
            </View>
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
    borderRadius: 16,
    marginBottom: 14,
    gap: 10,
  },
  monthTextBlock: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  scheduleRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
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
  dayCardOff: {
    backgroundColor: '#FAFAFB',
  },
  dayCardToday: {
    borderColor: colors.secondary,
  },
  dayDateColumn: {
    width: 54,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
  },
  dayInfo: {
    flex: 1,
    gap: 8,
  },
  dayInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  dayTitleBlock: {
    flex: 1,
  },
  dayTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipText: {
    letterSpacing: 0.1,
  },
  emptyState: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    marginTop: 6,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
  },
});
