import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  UserCheck,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { CustomBarChart } from '../components/ui/CustomBarChart';
import { CustomPieChart } from '../components/ui/CustomPieChart';
import { STORAGE_KEYS, API_ENDPOINTS } from '../config/apiConfig';
import apiClient from '../api/apiClient';
import { getCurrentEmployee } from '../api/employeeService';
import { getCompanyById } from '../api/companyService';
import { normalizeEmployeeData } from '../utils/employeeData';
import {
  formatJoiningDate,
  getEmployeeJoiningDate,
  hasEmployeeJoined,
  isOnOrAfterJoiningDate,
} from '../utils/employmentDates';
import { refreshNotificationCenter } from '../services/notificationService';
import { getCompanyHolidays } from '../api/holidayService';

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
  const hhmmMatch = dateTimeStr.match(/^(\d{2}):(\d{2})$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  }
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

function getDurationHours(inTime?: string, outTime?: string | null) {
  if (!inTime || !outTime) return 0;
  const start = new Date(inTime).getTime();
  const end = new Date(outTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

function buildFallbackOutTime(inTime?: string, endTime?: string) {
  if (!inTime || !endTime) return null;
  const inDate = new Date(inTime);
  if (Number.isNaN(inDate.getTime())) return null;
  const timeMatch = endTime.match(/^(\d{2}):(\d{2})/);
  if (timeMatch) {
    const fallback = new Date(inDate);
    fallback.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return fallback.toISOString();
  }
  const endDate = new Date(endTime);
  if (!Number.isNaN(endDate.getTime())) return endDate.toISOString();
  return null;
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function isSameWeek(left: Date, right: Date) {
  const d1 = new Date(left);
  const d2 = new Date(right);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const day1 = d1.getDay() || 7;
  d1.setDate(d1.getDate() - day1 + 1);
  const day2 = d2.getDay() || 7;
  d2.setDate(d2.getDate() - day2 + 1);
  return d1.getTime() === d2.getTime();
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
         left.getMonth() === right.getMonth() &&
         left.getDate() === right.getDate();
}

function daysUntil(date: Date, referenceDate: Date) {
  const start = new Date(referenceDate);
  const end = new Date(date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

const WORKING_DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const WORKING_DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_BY_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getWeekdayKey(date: Date) {
  return WEEKDAY_BY_INDEX[date.getDay()] || 'mon';
}

type LeaveType = {
  id: number;
  name: string;
  totalDays: number;
  color?: string;
  icon?: string;
};

export default function DashboardScreen({ navigation }: any) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [companyLeaveTypes, setCompanyLeaveTypes] = useState<LeaveType[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);

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
      // Reset attendance state to prevent showing old user data while loading
      setAttendanceHistory([]);
      setTodayAttendance(null);

      const currentUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      let emp = null;
      if (cached) {
        const parsed = normalizeEmployeeData(JSON.parse(cached));
        if (parsed?.accountId === currentUserId || String(parsed?.id) === currentUserId) {
          emp = parsed;
        }
      }

      if (!emp) {
        const response = await getCurrentEmployee();
        emp = normalizeEmployeeData(response);
        if (emp) {
          await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEE_DATA, JSON.stringify(emp));
        }
      }

      if (!emp) {
        return;
      }

      setEmployee(emp);

      // Fetch today's attendance
      await fetchTodayAttendance();

      // Fetch current company schedule and metadata
      if (emp?.companyId) {
        await fetchCompany(emp.companyId);
      }

      // Fetch attendance history for charts
      await fetchAttendanceHistory();

      // Fetch company leave types and balances
      if (emp?.companyId || emp?.id) {
        await fetchLeaveData(emp.companyId, emp.id);
      }

      // Fetch company holidays
      if (emp?.companyId) {
        await fetchHolidays(emp.companyId);
      }

      // Fetch pending leaves
      if (emp?.id) {
        await fetchPendingLeaves(emp.id);
      }

      refreshNotificationCenter().catch((error) => {
        console.error('Refresh notification center error:', error);
      });

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

  const fetchAttendanceHistory = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.HISTORY);
      const data = response.data?.data || response.data || [];
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch attendance history error:', error);
      setAttendanceHistory([]);
    }
  };

  const fetchCompany = async (companyId: number) => {
    try {
      const data = await getCompanyById(companyId);
      setCompany(data);
    } catch (error) {
      console.error('Fetch company error:', error);
      setCompany(null);
    }
  };

  const fetchLeaveData = async (companyId?: number, employeeId?: number) => {
    try {
      const requests = [];
      if (companyId) {
        requests.push(apiClient.get(API_ENDPOINTS.LEAVE_TYPES.BY_COMPANY(companyId)));
      } else {
        requests.push(apiClient.get(API_ENDPOINTS.LEAVE_TYPES.LIST));
      }
      if (employeeId) {
        requests.push(apiClient.get(API_ENDPOINTS.LEAVE.BALANCES(employeeId)));
      }

      const [typesResponse, balancesResponse] = await Promise.all(requests);

      const typesData = typesResponse?.data?.data || typesResponse?.data || [];
      const balancesData = balancesResponse?.data?.data || balancesResponse?.data || [];

      setCompanyLeaveTypes(Array.isArray(typesData) ? typesData : []);
      setLeaveBalances(Array.isArray(balancesData) ? balancesData : []);
    } catch (error) {
      console.error('Fetch leave data error:', error);
      setCompanyLeaveTypes([]);
      setLeaveBalances([]);
    }
  };

  const fetchHolidays = async (companyId: number) => {
    try {
      const data = await getCompanyHolidays(companyId);
      const list = Array.isArray(data) ? data : [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const upcoming = list
        .filter((h: any) => !h.isdeleted && h.isactive !== false)
        .map((h: any) => {
          const dateValue = h.date || h.startDate;
          const d = new Date(dateValue);
          return {
            id: String(h.id),
            name: h.name || 'Holiday',
            date: d,
            dateStr: dateValue,
          };
        })
        .filter((h: any) => h.date.getTime() >= now.getTime())
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
        .slice(0, 3);

      setUpcomingHolidays(upcoming);
    } catch (error) {
      console.error('Fetch holidays error:', error);
      setUpcomingHolidays([]);
    }
  };

  const fetchPendingLeaves = async (employeeId: number) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.LEAVE.MY_LEAVES(employeeId));
      const data = response.data?.data || response.data || [];
      const list = Array.isArray(data) ? data : [];
      const pendingDays = list
        .filter((leave: any) => String(leave.status).toUpperCase() === 'PENDING')
        .reduce((sum: number, leave: any) => sum + (Number(leave.leaveDays) || 0), 0);
      setPendingLeaves(pendingDays);

      const sorted = [...list].sort((a: any, b: any) => {
        const da = new Date(a.createdAt || a.startDate).getTime();
        const db = new Date(b.createdAt || b.startDate).getTime();
        return db - da;
      });
      setRecentLeaves(sorted.slice(0, 3));
    } catch (error) {
      console.error('Fetch pending leaves error:', error);
      setPendingLeaves(0);
      setRecentLeaves([]);
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
                refreshNotificationCenter().catch((error) => {
                  console.error('Refresh notification center error:', error);
                });
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
                refreshNotificationCenter().catch((error) => {
                  console.error('Refresh notification center error:', error);
                });
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

  const workStartTime = extractTimeFromDateTime(company?.startTime);
  const workEndTime = extractTimeFromDateTime(company?.endTime);
  const workDurationMs = workStartTime && workEndTime
    ? (workEndTime.getTime() - workStartTime.getTime())
    : 0;

  const progressPercent = workDurationMs > 0
    ? Math.min(100, Math.round((elapsedMs / workDurationMs) * 100))
    : 0;

  const configuredWorkingDayKeys = useMemo(() => {
    if (!company?.workingDays) return [];
    return WORKING_DAY_ORDER.filter((day) => Boolean(company.workingDays?.[day]));
  }, [company]);

  const joiningDate = useMemo(() => getEmployeeJoiningDate(employee), [employee]);
  const employeeHasJoined = useMemo(
    () => hasEmployeeJoined(employee, currentTime),
    [employee, currentTime]
  );
  const joiningDateLabel = useMemo(() => formatJoiningDate(employee), [employee]);
  const daysUntilJoining = useMemo(
    () => (joiningDate ? daysUntil(joiningDate, currentTime) : 0),
    [joiningDate, currentTime]
  );

  const combinedAttendanceHistory = useMemo(() => {
    const history = [...attendanceHistory];
    if (todayAttendance?.inTime) {
      const todayDate = new Date(todayAttendance.inTime);
      if (!Number.isNaN(todayDate.getTime())) {
        const filtered = history.filter(item => {
          const itemDate = new Date(item.inTime);
          if (Number.isNaN(itemDate.getTime())) return true;
          return !isSameDay(itemDate, todayDate);
        });
        filtered.push(todayAttendance);
        return filtered;
      }
    }
    return history.filter((item) => {
      const checkIn = new Date(item.inTime);
      return !Number.isNaN(checkIn.getTime()) && isOnOrAfterJoiningDate(checkIn, employee);
    });
  }, [attendanceHistory, employee, todayAttendance]);

  const monthlyAttendance = useMemo(
    () => combinedAttendanceHistory.filter((item) => {
      const checkIn = new Date(item.inTime);
      return !Number.isNaN(checkIn.getTime()) && isSameMonth(checkIn, currentTime);
    }),
    [combinedAttendanceHistory, currentTime]
  );

  const weeklyAttendance = useMemo(
    () => combinedAttendanceHistory.filter((item) => {
      const checkIn = new Date(item.inTime);
      return !Number.isNaN(checkIn.getTime()) && isSameWeek(checkIn, currentTime);
    }),
    [combinedAttendanceHistory, currentTime]
  );

  const attendanceHoursByWeekday = useMemo(() => {
    return weeklyAttendance.reduce((acc, item) => {
      const checkIn = new Date(item.inTime);
      const weekdayKey = getWeekdayKey(checkIn);
      const effectiveOut = item.outTime ?? buildFallbackOutTime(item.inTime, company?.endTime);
      acc[weekdayKey] = (acc[weekdayKey] || 0) + getDurationHours(item.inTime, effectiveOut);
      return acc;
    }, {} as Record<string, number>);
  }, [weeklyAttendance, company]);

  const observedWorkingDayKeys = useMemo(() => {
    const keys = Array.from(
      new Set(weeklyAttendance.map((item) => getWeekdayKey(new Date(item.inTime))))
    );
    return keys.sort((left, right) => WORKING_DAY_ORDER.indexOf(left) - WORKING_DAY_ORDER.indexOf(right));
  }, [weeklyAttendance]);

  const weeklyChartKeys = configuredWorkingDayKeys.length > 0
    ? configuredWorkingDayKeys
    : observedWorkingDayKeys.length > 0
      ? observedWorkingDayKeys
      : WORKING_DAY_ORDER.slice(0, 5); // Default to Mon-Fri if no data

  const weeklyActivityData = weeklyChartKeys.map((dayKey) => ({
    label: WORKING_DAY_LABELS[dayKey] || dayKey.toUpperCase(),
    value: Number((attendanceHoursByWeekday[dayKey] || 0).toFixed(1)),
  }));

  const monthlyHours = monthlyAttendance.reduce((sum, item) => {
    const effectiveOut = item.outTime ?? buildFallbackOutTime(item.inTime, company?.endTime);
    return sum + getDurationHours(item.inTime, effectiveOut);
  }, 0);

  const leaveChartData = companyLeaveTypes.length > 0
    ? companyLeaveTypes.map((type, index) => {
        const matchingBalance = leaveBalances.find(
          (balance) => Number(balance.leaveTypeId) === Number(type.id)
        );
        return {
          label: type.name,
          value: Math.max(0, matchingBalance?.remaining ?? matchingBalance?.totalAllocated ?? type.totalDays ?? 0),
          color: type.color || [colors.secondary, colors.success, colors.warning][index % 3],
        };
      })
    : leaveBalances.length > 0
      ? leaveBalances.map((balance, index) => ({
          label: balance.leaveTypeName || 'Leave',
          value: Math.max(0, balance.remaining ?? balance.totalAllocated ?? 0),
          color: [colors.secondary, colors.success, colors.warning][index % 3],
        }))
      : defaultBalances.map((leave) => ({
          label: leave.type,
          value: leave.left,
          color: leave.color,
        }));

  const openAttendanceReport = () => {
    navigation.navigate('Attendance');
  };

  const pendingSubtitle = daysUntilJoining === 0
    ? 'Your attendance will become active on your joining date.'
    : daysUntilJoining === 1
      ? 'Your attendance will become active in 1 day.'
      : `Your attendance will become active in ${daysUntilJoining} days.`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text variant="semibold" size={13} color="#8E8E93" style={styles.greetingLabel}>
              GOOD MORNING
            </Text>
            <Text variant="bold" size={28} color="#000000" style={styles.greetingName}>
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
            <Text variant="bold" size={14} color="#000000">
              {getInitials(employee?.firstName, employee?.lastName)}
            </Text>
          </Pressable>
        </View>

        {!employeeHasJoined ? (
          <View style={styles.pendingPage}>
            <View style={styles.pendingPageIconWrap}>
              <Calendar size={28} color="#FFFFFF" />
            </View>
            <Text variant="bold" size={30} color="#000000" style={styles.pendingPageTitle}>
              Joining Pending
            </Text>
            <Text variant="medium" size={15} color={colors.text.secondary} style={styles.pendingPageText}>
              Attendance and weekly activity will be available after you join.
            </Text>
            <View style={styles.pendingPageDateCard}>
              <Text variant="medium" size={12} color={colors.text.secondary}>
                Joining Date
              </Text>
              <Text variant="bold" size={22} color="#000000" style={styles.pendingPageDateValue}>
                {joiningDateLabel}
              </Text>
            </View>
            <Text variant="medium" size={13} color={colors.text.secondary} style={styles.pendingPageHint}>
              {pendingSubtitle}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.clockCard}>
              <View style={styles.dateBadge}>
                <Calendar size={12} color="rgba(255,255,255,0.8)" />
                <Text variant="medium" size={11} color="rgba(255,255,255,0.8)" style={styles.dateText}>
                  {dateStr}
                </Text>
              </View>
              <Text variant="bold" size={36} color="#FFFFFF" style={styles.timeText}>
                {timeStr}
              </Text>

              {todayAttendance?.inTime && (
                <View style={styles.loggedHoursContainer}>
                  <Clock size={14} color="rgba(255,255,255,0.9)" />
                  <Text variant="semibold" size={13} color="rgba(255,255,255,0.9)" style={styles.loggedHoursText}>
                    {isClockedIn ? 'Logged In: ' : 'Total Hours: '}
                    {formatDuration(elapsedMs)}
                  </Text>
                </View>
              )}

              {company && (
                <View style={styles.workingHoursRow}>
                  <Text variant="medium" size={11} color="rgba(255,255,255,0.6)">
                    Work: {workStartTime ? workStartTime.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:true}) : '—'} — {workEndTime ? workEndTime.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', hour12:true}) : '—'}
                  </Text>
                </View>
              )}

              {workDurationMs > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text variant="medium" size={10} color="rgba(255,255,255,0.6)">
                    {progressPercent}% of daily hours
                  </Text>
                </View>
              )}

              {todayAttendance?.inTime && (
                <View style={styles.timesRow}>
                  <View style={styles.timeBox}>
                    <Text variant="medium" size={10} color="rgba(255,255,255,0.6)" style={{marginBottom: 2}}>In Time</Text>
                    <Text variant="bold" size={14} color="#FFFFFF">{formatTime(todayAttendance.inTime)}</Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.timeBox}>
                    <Text variant="medium" size={10} color="rgba(255,255,255,0.6)" style={{marginBottom: 2}}>Out Time</Text>
                    <Text variant="bold" size={14} color="#FFFFFF">
                      {todayAttendance?.outTime ? formatTime(todayAttendance.outTime) : '—'}
                    </Text>
                  </View>
                </View>
              )}

              <Button
                onPress={isClockedIn ? handleClockOut : handleClockIn}
                title={isClockedIn ? "Clock Out" : "Clock In"}
                variant={isClockedIn ? "danger" : "secondary"}
                size="md"
                icon={isClockedIn ? <LogOut size={16} color="#fff" /> : <LogIn size={16} color="#fff" />}
                style={styles.clockButton}
                disabled={loading}
              />
              {loading && <ActivityIndicator style={styles.loader} color="#FFFFFF" />}
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="Monthly Hours"
                value={`${monthlyHours.toFixed(1)}h`}
                description="Logged this month"
                color={colors.success}
                icon={<UserCheck size={18} color={colors.success} />}
                style={styles.statCard}
                onPress={openAttendanceReport}
              />
              <StatCard
                label="Pending Requests"
                value={String(pendingLeaves)}
                description="Awaiting approval"
                color={colors.warning}
                icon={<FileText size={18} color={colors.warning} />}
                style={styles.statCard}
                onPress={() => navigation.navigate('LeaveHistory')}
              />
            </View>

            <View style={styles.chartsGrid}>
              <Pressable
                onPress={openAttendanceReport}
                style={({ pressed }) => [
                  styles.chartContainer,
                  pressed && styles.chartPressablePressed,
                ]}
              >
                <CustomBarChart
                  title="Weekly Activity"
                  data={weeklyActivityData.length > 0 ? weeklyActivityData : [
                    { value: 0, label: "Mon" },
                    { value: 0, label: "Tue" },
                    { value: 0, label: "Wed" },
                    { value: 0, label: "Thu" },
                    { value: 0, label: "Fri" },
                  ]}
                  yAxisSuffix="h"
                />
                <Text variant="medium" size={11} color={colors.text.secondary} style={styles.chartHint}>
                  Tap to view full attendance report
                </Text>
              </Pressable>

              <View style={styles.chartContainer}>
                <CustomPieChart
                  title="Leave Distribution"
                  data={leaveChartData}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="bold" size={20} color="#000000">
                  Recent Leave Requests
                </Text>
                <Pressable onPress={() => navigation.navigate('LeaveHistory')} style={styles.actionButton}>
                  <Text variant="semibold" size={15} color="#007AFF">
                    See All
                  </Text>
                </Pressable>
              </View>
              <View style={styles.listContainer}>
                {recentLeaves.length > 0 ? (
                  recentLeaves.map((leave, index) => {
                    const isApproved = String(leave.status).toUpperCase() === 'APPROVED' || String(leave.status).toUpperCase() === 'ACCEPTED';
                    const isRejected = String(leave.status).toUpperCase() === 'REJECTED';

                    let StatusIcon = Clock;
                    let statusColor = colors.warning;
                    if (isApproved) {
                      StatusIcon = CheckCircle;
                      statusColor = colors.success;
                    } else if (isRejected) {
                      StatusIcon = XCircle;
                      statusColor = colors.error;
                    }

                    const d = new Date(leave.startDate);
                    const leaveDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <Pressable
                        key={leave.id || index}
                        style={({ pressed }) => [
                          styles.listItem,
                          index > 0 && styles.listItemBorder,
                          pressed && styles.listItemPressed
                        ]}
                        onPress={() => navigation.navigate('LeaveHistory')}
                      >
                        <View style={[styles.listIcon, { backgroundColor: statusColor + '15' }]}>
                          <StatusIcon size={20} color={statusColor} />
                        </View>
                        <View style={styles.itemContent}>
                          <Text variant="bold" size={15} color="#000000">
                            {leave.leaveTypeName || 'Leave Request'}
                          </Text>
                          <Text variant="medium" size={13} color="#8E8E93">
                            {leaveDateStr} • {leave.leaveDays} Day(s)
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#C6C6C8" />
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.listItem}>
                    <View style={[styles.listIcon, { backgroundColor: '#F2F2F7' }]}>
                      <FileText size={20} color="#8E8E93" />
                    </View>
                    <View style={styles.itemContent}>
                      <Text variant="bold" size={15} color="#000000">
                        No recent requests
                      </Text>
                      <Text variant="medium" size={13} color="#8E8E93">
                        You haven&apos;t requested any leaves yet
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="bold" size={20} color="#000000">
                  Quick Actions
                </Text>
              </View>
              <View style={styles.quickActionsGrid}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionCard,
                    pressed && styles.actionCardPressed
                  ]}
                  onPress={() => navigation.navigate('LeaveHistory')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.accent.blue }]}>
                    <FileText size={20} color={colors.secondary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text variant="bold" size={14} color={colors.text.primary}>
                      My Leave History
                    </Text>
                    <Text variant="medium" size={12} color={colors.text.secondary}>
                      Track your leave requests
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.text.muted} />
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="bold" size={20} color="#000000">
                  Upcoming Holidays
                </Text>
                <Pressable onPress={() => navigation.navigate('HolidayList')} style={styles.actionButton}>
                  <Text variant="semibold" size={15} color="#007AFF">
                    See All
                  </Text>
                </Pressable>
              </View>

              <View style={styles.listContainer}>
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday, index) => {
                    const holidayDateStr = holiday.date.toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    return (
                      <Pressable
                        key={holiday.id}
                        style={({ pressed }) => [
                          styles.listItem,
                          index > 0 && styles.listItemBorder,
                          pressed && styles.listItemPressed
                        ]}
                        onPress={() => navigation.navigate('HolidayList')}
                      >
                        <View style={[styles.listIcon, { backgroundColor: '#F0F4F8' }]}>
                          <Calendar size={18} color={colors.secondary} />
                        </View>
                        <View style={styles.itemContent}>
                          <Text variant="bold" size={14} color="#000000">
                            {holiday.name}
                          </Text>
                          <Text variant="medium" size={12} color="#8E8E93">
                            {holidayDateStr}
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#C6C6C8" />
                      </Pressable>
                    );
                  })
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.listItem,
                      pressed && styles.listItemPressed
                    ]}
                    onPress={() => navigation.navigate('HolidayList')}
                  >
                    <View style={[styles.listIcon, { backgroundColor: '#F0F4F8' }]}>
                      <Calendar size={18} color={colors.secondary} />
                    </View>
                    <View style={styles.itemContent}>
                      <Text variant="bold" size={14} color="#000000">
                        No upcoming holidays
                      </Text>
                      <Text variant="medium" size={12} color="#8E8E93">
                        Check back later
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#C6C6C8" />
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS System Background
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  greeting: {
    gap: 2,
  },
  greetingLabel: {
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  greetingName: {
    letterSpacing: -0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24, // perfectly round
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clockCard: {
    backgroundColor: '#000000', // Deep black for premium Apple widget feel
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    letterSpacing: 0.3,
  },
  timeText: {
    marginBottom: 12,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  loggedHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  loggedHoursText: {
    letterSpacing: 0.5,
  },
  workingHoursRow: {
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  clockButton: {
    width: '100%',
    borderRadius: 14,
    height: 48,
  },
  loader: {
    marginTop: 10,
  },
  pendingPage: {
    flex: 1,
    minHeight: 520,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  pendingPageIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pendingPageTitle: {
    textAlign: 'center',
    marginBottom: 10,
  },
  pendingPageText: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 22,
  },
  pendingPageDateCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  pendingPageDateValue: {
    marginTop: 6,
  },
  pendingPageHint: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  pendingCardContent: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pendingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pendingTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  pendingText: {
    textAlign: 'center',
    marginBottom: 14,
  },
  pendingDatePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  pendingHint: {
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0,
  },
  chartPressablePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  chartHint: {
    textAlign: 'center',
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  horizontalScroll: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  leaveCardMargin: {
    marginRight: 12,
  },
  leaveCardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0,
  },
  quickActionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0,
  },
  actionCardPressed: {
    backgroundColor: '#F8FAFC',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
    gap: 2,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  listItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA', // Apple standard separator
    marginLeft: 60, // inset separator
  },
  listItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
});
