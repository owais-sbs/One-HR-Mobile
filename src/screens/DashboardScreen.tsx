import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../theme/colors";
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
  Activity,
} from "lucide-react-native";
import { Text } from "../components/ui/Typography";
import { StatCard } from "../components/ui/StatCard";
import { Button } from "../components/ui/Button";
import { CustomBarChart } from "../components/ui/CustomBarChart";
import { CustomPieChart } from "../components/ui/CustomPieChart";
import { STORAGE_KEYS, API_ENDPOINTS } from "../config/apiConfig";
import apiClient from "../api/apiClient";
import { getCurrentEmployee } from "../api/employeeService";
import { getCompanyById } from "../api/companyService";
import { normalizeEmployeeData } from "../utils/employeeData";
import {
  formatJoiningDate,
  getEmployeeJoiningDate,
  hasEmployeeJoined,
  isOnOrAfterJoiningDate,
} from "../utils/employmentDates";
import { refreshNotificationCenter } from "../services/notificationService";
import { getCompanyHolidays } from "../api/holidayService";

const { width } = Dimensions.get("window");

const CLOCK_IN_GRACE_MS = 30 * 60 * 1000;
const CLOCK_OUT_GRACE_MS = 30 * 60 * 1000;

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.charAt(0) || "";
  const l = lastName?.charAt(0) || "";
  return (f + l).toUpperCase() || "??";
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function extractTimeFromDateTime(dateTimeStr?: string) {
  if (!dateTimeStr) return null;
  const match = dateTimeStr.match(/T(\d{2}):(\d{2}):(\d{2})/);
  const hhmmMatch = dateTimeStr.match(/^(\d{2}):(\d{2})$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
    );
  }
  if (!match) {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
  );
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
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
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
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function daysUntil(date: Date, referenceDate: Date) {
  const start = new Date(referenceDate);
  const end = new Date(date);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

const WORKING_DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const WORKING_DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_BY_INDEX = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getWeekdayKey(date: Date) {
  return WEEKDAY_BY_INDEX[date.getDay()] || "mon";
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
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [employee?.profileImageUrl]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isClockedIn || !todayAttendance?.inTime) return;
    const inTime = new Date(todayAttendance.inTime);
    const updateElapsed = () => setElapsedMs(Date.now() - inTime.getTime());
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, todayAttendance]);

  useEffect(() => {
    if (!isClockedIn || !company?.endTime) return;

    const endTime = extractTimeFromDateTime(company.endTime);
    if (!endTime) return;

    const autoCloseTime = new Date(endTime.getTime() + CLOCK_OUT_GRACE_MS);
    const now = Date.now();

    if (now >= autoCloseTime.getTime()) {
      setIsClockedIn(false);
      return;
    }

    const timeoutMs = autoCloseTime.getTime() - now;
    const timeout = setTimeout(() => {
      setIsClockedIn(false);
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [isClockedIn, company?.endTime]);

  const loadDashboardData = useCallback(async () => {
    try {
      setAttendanceHistory([]);
      setTodayAttendance(null);

      const currentUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      let emp = null;

      if (cached) {
        const parsed = normalizeEmployeeData(JSON.parse(cached));
        if (
          parsed?.accountId === currentUserId ||
          String(parsed?.id) === currentUserId
        )
          emp = parsed;
      }

      if (!emp) {
        const response = await getCurrentEmployee();
        emp = normalizeEmployeeData(response);
        if (emp)
          await AsyncStorage.setItem(
            STORAGE_KEYS.EMPLOYEE_DATA,
            JSON.stringify(emp),
          );
      }

      if (!emp) return;
      setEmployee(emp);

      await fetchTodayAttendance();
      if (emp?.companyId) await fetchCompany(emp.companyId);
      await fetchAttendanceHistory();
      if (emp?.companyId || emp?.id)
        await fetchLeaveData(emp.companyId, emp.id);
      if (emp?.companyId) await fetchHolidays(emp.companyId);
      if (emp?.id) await fetchPendingLeaves(emp.id);

      refreshNotificationCenter().catch(console.error);
    } catch (error) {
      console.error("Dashboard load error:", error);
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
      setAttendanceHistory([]);
    }
  };

  const fetchCompany = async (companyId: number) => {
    try {
      const data = await getCompanyById(companyId);
      setCompany(data);
    } catch (error) {
      setCompany(null);
    }
  };

  const fetchLeaveData = async (companyId?: number, employeeId?: number) => {
    try {
      const requests = [];
      if (companyId)
        requests.push(
          apiClient.get(API_ENDPOINTS.LEAVE_TYPES.BY_COMPANY(companyId)),
        );
      else requests.push(apiClient.get(API_ENDPOINTS.LEAVE_TYPES.LIST));
      if (employeeId)
        requests.push(apiClient.get(API_ENDPOINTS.LEAVE.BALANCES(employeeId)));

      const [typesResponse, balancesResponse] = await Promise.all(requests);
      const typesData = typesResponse?.data?.data || typesResponse?.data || [];
      const balancesData =
        balancesResponse?.data?.data || balancesResponse?.data || [];

      setCompanyLeaveTypes(Array.isArray(typesData) ? typesData : []);
      setLeaveBalances(Array.isArray(balancesData) ? balancesData : []);
    } catch (error) {
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
          return {
            id: String(h.id),
            name: h.name || "Holiday",
            date: new Date(dateValue),
            dateStr: dateValue,
          };
        })
        .filter((h: any) => h.date.getTime() >= now.getTime())
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
        .slice(0, 3);

      setUpcomingHolidays(upcoming);
    } catch (error) {
      setUpcomingHolidays([]);
    }
  };

  const fetchPendingLeaves = async (employeeId: number) => {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.LEAVE.MY_LEAVES(employeeId),
      );
      const data = response.data?.data || response.data || [];
      const list = Array.isArray(data) ? data : [];

      const pendingDays = list
        .filter(
          (leave: any) => String(leave.status).toUpperCase() === "PENDING",
        )
        .reduce(
          (sum: number, leave: any) => sum + (Number(leave.leaveDays) || 0),
          0,
        );
      setPendingLeaves(pendingDays);

      const sorted = [...list].sort(
        (a: any, b: any) =>
          new Date(b.createdAt || b.startDate).getTime() -
          new Date(a.createdAt || a.startDate).getTime(),
      );
      setRecentLeaves(sorted.slice(0, 3));
    } catch (error) {
      setPendingLeaves(0);
      setRecentLeaves([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  const handleClockIn = () => {
    const now = new Date();
    const startTime = extractTimeFromDateTime(company?.startTime);

    if (startTime) {
      const earliestClockIn = new Date(startTime.getTime() - CLOCK_IN_GRACE_MS);
      if (now < earliestClockIn) {
        const earlyTime = formatTime(earliestClockIn.toISOString());
        Alert.alert(
          "Too Early",
          `Clock in is only allowed from ${earlyTime} onwards (30 minutes before work start).`,
        );
        return;
      }
    }

    Alert.alert("Clock In", "Ready to start your day?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clock In",
        onPress: async () => {
          setLoading(true);
          try {
            const response = await apiClient.post(
              API_ENDPOINTS.ATTENDANCE.CLOCK_IN,
            );
            if (response.data?.isSuccess === false)
              return Alert.alert(
                "Error",
                response.data?.error || "Clock in failed",
              );
            const data = response.data?.data;
            if (data) {
              setTodayAttendance(data);
              setIsClockedIn(true);
              setElapsedMs(0);
              refreshNotificationCenter().catch(console.error);
            }
          } catch (error: any) {
            Alert.alert(
              "Error",
              error?.response?.data?.error ||
                error?.message ||
                "Clock in failed",
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleClockOut = () => {
    const now = new Date();
    const endTime = extractTimeFromDateTime(company?.endTime);

    if (endTime) {
      const latestAllowed = new Date(endTime.getTime() + CLOCK_OUT_GRACE_MS);
      if (now > latestAllowed) {
        Alert.alert(
          "Too Late",
          "Clock out is no longer allowed. Your session will be closed automatically.",
        );
        return;
      }
    }

    Alert.alert("Clock Out", "Done for the day?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clock Out",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const response = await apiClient.post(
              API_ENDPOINTS.ATTENDANCE.CLOCK_OUT,
            );
            if (response.data?.isSuccess === false)
              return Alert.alert(
                "Error",
                response.data?.error || "Clock out failed",
              );
            const data = response.data?.data;
            if (data) {
              setTodayAttendance(data);
              setIsClockedIn(false);
              setElapsedMs(
                new Date(data.outTime).getTime() -
                  new Date(data.inTime).getTime(),
              );
              refreshNotificationCenter().catch(console.error);
            }
          } catch (error: any) {
            Alert.alert(
              "Error",
              error?.response?.data?.error ||
                error?.message ||
                "Clock out failed",
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const dateStr = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const defaultBalances = [
    { type: "Annual", left: 8, total: 12, color: "#3B82F6" },
    { type: "Sick", left: 8, total: 10, color: "#10B981" },
    { type: "Casual", left: 4, total: 5, color: "#F59E0B" },
  ];

  const workStartTime = extractTimeFromDateTime(company?.startTime);
  const workEndTime = extractTimeFromDateTime(company?.endTime);
  const workDurationMs =
    workStartTime && workEndTime
      ? workEndTime.getTime() - workStartTime.getTime()
      : 0;
  const progressPercent =
    workDurationMs > 0
      ? Math.min(100, Math.round((elapsedMs / workDurationMs) * 100))
      : 0;

  const configuredWorkingDayKeys = useMemo(
    () =>
      company?.workingDays
        ? WORKING_DAY_ORDER.filter((day) => Boolean(company.workingDays?.[day]))
        : [],
    [company],
  );
  const joiningDate = useMemo(
    () => getEmployeeJoiningDate(employee),
    [employee],
  );
  const employeeHasJoined = useMemo(
    () => hasEmployeeJoined(employee, currentTime),
    [employee, currentTime],
  );
  const joiningDateLabel = useMemo(
    () => formatJoiningDate(employee),
    [employee],
  );
  const daysUntilJoining = useMemo(
    () => (joiningDate ? daysUntil(joiningDate, currentTime) : 0),
    [joiningDate, currentTime],
  );

  const combinedAttendanceHistory = useMemo(() => {
    const history = [...attendanceHistory];
    if (todayAttendance?.inTime) {
      const todayDate = new Date(todayAttendance.inTime);
      if (!Number.isNaN(todayDate.getTime())) {
        const filtered = history.filter((item) => {
          const itemDate = new Date(item.inTime);
          return Number.isNaN(itemDate.getTime())
            ? true
            : !isSameDay(itemDate, todayDate);
        });
        filtered.push(todayAttendance);
        return filtered;
      }
    }
    return history.filter((item) => {
      const checkIn = new Date(item.inTime);
      return (
        !Number.isNaN(checkIn.getTime()) &&
        isOnOrAfterJoiningDate(checkIn, employee)
      );
    });
  }, [attendanceHistory, employee, todayAttendance]);

  const monthlyAttendance = useMemo(
    () =>
      combinedAttendanceHistory.filter((item) => {
        const checkIn = new Date(item.inTime);
        return (
          !Number.isNaN(checkIn.getTime()) && isSameMonth(checkIn, currentTime)
        );
      }),
    [combinedAttendanceHistory, currentTime],
  );

  const weeklyAttendance = useMemo(
    () =>
      combinedAttendanceHistory.filter((item) => {
        const checkIn = new Date(item.inTime);
        return (
          !Number.isNaN(checkIn.getTime()) && isSameWeek(checkIn, currentTime)
        );
      }),
    [combinedAttendanceHistory, currentTime],
  );

  const attendanceHoursByWeekday = useMemo(() => {
    return weeklyAttendance.reduce(
      (acc, item) => {
        const checkIn = new Date(item.inTime);
        const weekdayKey = getWeekdayKey(checkIn);
        const effectiveOut =
          item.outTime ?? buildFallbackOutTime(item.inTime, company?.endTime);
        acc[weekdayKey] =
          (acc[weekdayKey] || 0) + getDurationHours(item.inTime, effectiveOut);
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [weeklyAttendance, company]);

  const observedWorkingDayKeys = useMemo(() => {
    const keys = Array.from(
      new Set(
        weeklyAttendance.map((item) => getWeekdayKey(new Date(item.inTime))),
      ),
    );
    return keys.sort(
      (left, right) =>
        WORKING_DAY_ORDER.indexOf(left) - WORKING_DAY_ORDER.indexOf(right),
    );
  }, [weeklyAttendance]);

  const weeklyChartKeys =
    configuredWorkingDayKeys.length > 0
      ? configuredWorkingDayKeys
      : observedWorkingDayKeys.length > 0
        ? observedWorkingDayKeys
        : WORKING_DAY_ORDER.slice(0, 5);
  const weeklyActivityData = weeklyChartKeys.map((dayKey) => ({
    label: WORKING_DAY_LABELS[dayKey] || dayKey.toUpperCase(),
    value: Number((attendanceHoursByWeekday[dayKey] || 0).toFixed(1)),
  }));

  const monthlyHours = monthlyAttendance.reduce((sum, item) => {
    const effectiveOut =
      item.outTime ?? buildFallbackOutTime(item.inTime, company?.endTime);
    return sum + getDurationHours(item.inTime, effectiveOut);
  }, 0);

  const leaveChartData =
    companyLeaveTypes.length > 0
      ? companyLeaveTypes.map((type, index) => {
          const matchingBalance = leaveBalances.find(
            (balance) => Number(balance.leaveTypeId) === Number(type.id),
          );
          return {
            label: type.name,
            value: Math.max(
              0,
              matchingBalance?.remaining ??
                matchingBalance?.totalAllocated ??
                type.totalDays ??
                0,
            ),
            color: type.color || ["#3B82F6", "#10B981", "#F59E0B"][index % 3],
          };
        })
      : leaveBalances.length > 0
        ? leaveBalances.map((balance, index) => ({
            label: balance.leaveTypeName || "Leave",
            value: Math.max(
              0,
              balance.remaining ?? balance.totalAllocated ?? 0,
            ),
            color: ["#3B82F6", "#10B981", "#F59E0B"][index % 3],
          }))
        : defaultBalances.map((leave) => ({
            label: leave.type,
            value: leave.left,
            color: leave.color,
          }));

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text
              variant="medium"
              size={13}
              color="#64748B"
              style={styles.dateDisplay}
            >
              {dateStr}
            </Text>
            <Text
              variant="bold"
              size={26}
              color="#0F172A"
              style={styles.greetingName}
            >
              Hi,{" "}
              {employee
                ? `${employee.firstName || ""}`.trim() || "There"
                : "There"}{" "}
              👋
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Profile")}
            style={({ pressed }) => [
              styles.avatar,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {employee?.profileImageUrl && !imageError ? (
              <Image
                source={{ uri: employee.profileImageUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <Text variant="bold" size={15} color="#0F172A">
                {getInitials(employee?.firstName, employee?.lastName)}
              </Text>
            )}
          </Pressable>
        </View>

        {!employeeHasJoined ? (
          <View style={styles.pendingState}>
            <View style={styles.pendingIconWrap}>
              <Calendar size={32} color="#3B82F6" />
            </View>
            <Text
              variant="bold"
              size={24}
              color="#0F172A"
              style={styles.pendingTitle}
            >
              Joining Soon
            </Text>
            <Text
              variant="medium"
              size={15}
              color="#64748B"
              style={styles.pendingText}
            >
              Your dashboard will unlock on your joining date.
            </Text>
            <View style={styles.pendingDateCard}>
              <Text variant="medium" size={13} color="#64748B">
                Scheduled Date
              </Text>
              <Text
                variant="bold"
                size={20}
                color="#0F172A"
                style={{ marginTop: 4 }}
              >
                {joiningDateLabel}
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Hero Attendance Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.liveIndicator}>
                  <View
                    style={[
                      styles.liveDot,
                      isClockedIn && styles.liveDotActive,
                    ]}
                  />
                  <Text variant="medium" size={12} color="#94A3B8">
                    {isClockedIn ? "Clocked In" : "Off the clock"}
                  </Text>
                </View>
                {company && workStartTime && workEndTime && (
                  <Text variant="medium" size={12} color="#64748B">
                    {workStartTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {workEndTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </View>

              <View style={styles.timeWrapper}>
                <Text
                  variant="bold"
                  size={44}
                  color="#FFFFFF"
                  style={styles.mainTime}
                >
                  {timeStr.split(" ")[0]}
                </Text>
                <Text
                  variant="semibold"
                  size={18}
                  color="#94A3B8"
                  style={styles.amPm}
                >
                  {timeStr.split(" ")[1]}
                </Text>
              </View>

              <View style={styles.durationWrapper}>
                <Text variant="medium" size={14} color="#CBD5E1">
                  Logged today:{" "}
                  <Text variant="bold" size={14} color="#FFFFFF">
                    {formatDuration(elapsedMs)}
                  </Text>
                </Text>
              </View>

              {workDurationMs > 0 && (
                <View style={styles.progressSection}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: isClockedIn ? "#10B981" : "#3B82F6",
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {todayAttendance?.inTime && (
                <View style={styles.timePillsRow}>
                  <View style={styles.timePill}>
                    <Text variant="medium" size={11} color="#94A3B8">
                      In
                    </Text>
                    <Text variant="bold" size={14} color="#F8FAFC">
                      {formatTime(todayAttendance.inTime)}
                    </Text>
                  </View>
                  <View style={styles.timePill}>
                    <Text variant="medium" size={11} color="#94A3B8">
                      Out
                    </Text>
                    <Text variant="bold" size={14} color="#F8FAFC">
                      {todayAttendance?.outTime
                        ? formatTime(todayAttendance.outTime)
                        : "--:--"}
                    </Text>
                  </View>
                </View>
              )}

              <Pressable
                onPress={isClockedIn ? handleClockOut : handleClockIn}
                disabled={loading}
                style={[
                  styles.heroButton,
                  isClockedIn
                    ? styles.heroButtonDanger
                    : styles.heroButtonPrimary,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    {isClockedIn ? (
                      <LogOut size={18} color="#FFFFFF" />
                    ) : (
                      <LogIn size={18} color="#FFFFFF" />
                    )}
                    <Text
                      variant="semibold"
                      size={16}
                      color="#FFFFFF"
                      style={styles.heroButtonText}
                    >
                      {isClockedIn ? "Clock Out" : "Clock In"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Quick Stats Grid - Side by Side */}
            <View style={styles.statsRow}>
              <Pressable
                style={styles.statBox}
                onPress={() => navigation.navigate("Attendance")}
              >
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}
                >
                  <Activity size={20} color="#3B82F6" />
                </View>
                <Text variant="bold" size={20} color="#0F172A">
                  {monthlyHours.toFixed(1)}
                  <Text variant="medium" size={14} color="#64748B">
                    {" "}
                    h
                  </Text>
                </Text>
                <Text variant="medium" size={13} color="#64748B">
                  Monthly Hours
                </Text>
              </Pressable>

              <Pressable
                style={styles.statBox}
                onPress={() => navigation.navigate("LeaveHistory")}
              >
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#FFFBEB" }]}
                >
                  <FileText size={20} color="#F59E0B" />
                </View>
                <Text variant="bold" size={20} color="#0F172A">
                  {pendingLeaves}
                </Text>
                <Text variant="medium" size={13} color="#64748B">
                  Pending Leaves
                </Text>
              </Pressable>
            </View>

            {/* Bento Box Charts */}
            <View style={styles.bentoSection}>
              <Text
                variant="bold"
                size={18}
                color="#0F172A"
                style={styles.sectionTitle}
              >
                Overview
              </Text>

              <View style={styles.bentoCharts}>
                <Pressable
                  onPress={() => navigation.navigate("Attendance")}
                  style={styles.bentoCardLarge}
                >
                  <Text
                    variant="semibold"
                    size={15}
                    color="#0F172A"
                    style={styles.chartTitle}
                  >
                    Weekly Activity
                  </Text>
                  <CustomBarChart
                    data={
                      weeklyActivityData.length > 0
                        ? weeklyActivityData
                        : [
                            { value: 0, label: "M" },
                            { value: 0, label: "T" },
                            { value: 0, label: "W" },
                            { value: 0, label: "T" },
                            { value: 0, label: "F" },
                          ]
                    }
                    yAxisSuffix="h"
                  />
                </Pressable>

                <View style={styles.bentoCardLarge}>
                  <Text
                    variant="semibold"
                    size={15}
                    color="#0F172A"
                    style={styles.chartTitle}
                  >
                    Leave Balances
                  </Text>
                  <CustomPieChart data={leaveChartData} />
                </View>
              </View>
            </View>

            {/* Recent Leave Requests */}
            <View style={styles.listSection}>
              <View style={styles.sectionHeaderRow}>
                <Text variant="bold" size={18} color="#0F172A">
                  Leave Requests
                </Text>
                <Pressable onPress={() => navigation.navigate("LeaveHistory")}>
                  <Text variant="semibold" size={14} color="#3B82F6">
                    View All
                  </Text>
                </Pressable>
              </View>

              <View style={styles.glassList}>
                {recentLeaves.length > 0 ? (
                  recentLeaves.map((leave, index) => {
                    const statusStr = String(leave.status).toUpperCase();
                    const isApproved =
                      statusStr === "APPROVED" || statusStr === "ACCEPTED";
                    const isRejected = statusStr === "REJECTED";

                    const StatusIcon = isApproved
                      ? CheckCircle
                      : isRejected
                        ? XCircle
                        : Clock;
                    const statusColor = isApproved
                      ? "#10B981"
                      : isRejected
                        ? "#EF4444"
                        : "#F59E0B";
                    const leaveDateStr = new Date(
                      leave.startDate,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <Pressable
                        key={leave.id || index}
                        style={[
                          styles.listItem,
                          index > 0 && styles.listDivider,
                        ]}
                        onPress={() => navigation.navigate("LeaveHistory")}
                      >
                        <View
                          style={[
                            styles.listIconBg,
                            { backgroundColor: statusColor + "15" },
                          ]}
                        >
                          <StatusIcon size={18} color={statusColor} />
                        </View>
                        <View style={styles.listContent}>
                          <Text variant="semibold" size={15} color="#0F172A">
                            {leave.leaveTypeName || "Leave"}
                          </Text>
                          <Text variant="medium" size={13} color="#64748B">
                            {leaveDateStr} • {leave.leaveDays} Day(s)
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor + "15" },
                          ]}
                        >
                          <Text
                            variant="semibold"
                            size={11}
                            color={statusColor}
                          >
                            {statusStr}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyListItem}>
                    <Text variant="medium" size={14} color="#94A3B8">
                      No recent requests.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Upcoming Holidays */}
            <View style={[styles.listSection, { marginBottom: 10 }]}>
              <View style={styles.sectionHeaderRow}>
                <Text variant="bold" size={18} color="#0F172A">
                  Upcoming Holidays
                </Text>
                <Pressable onPress={() => navigation.navigate("HolidayList")}>
                  <Text variant="semibold" size={14} color="#3B82F6">
                    View All
                  </Text>
                </Pressable>
              </View>

              <View style={styles.glassList}>
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday, index) => (
                    <Pressable
                      key={holiday.id}
                      style={[styles.listItem, index > 0 && styles.listDivider]}
                      onPress={() => navigation.navigate("HolidayList")}
                    >
                      <View
                        style={[
                          styles.listIconBg,
                          { backgroundColor: "#F1F5F9" },
                        ]}
                      >
                        <Calendar size={18} color="#475569" />
                      </View>
                      <View style={styles.listContent}>
                        <Text variant="semibold" size={15} color="#0F172A">
                          {holiday.name}
                        </Text>
                        <Text variant="medium" size={13} color="#64748B">
                          {holiday.date.toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <ChevronRight size={18} color="#CBD5E1" />
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyListItem}>
                    <Text variant="medium" size={14} color="#94A3B8">
                      No upcoming holidays.
                    </Text>
                  </View>
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
    backgroundColor: "#F8FAFC", // Modern sleek background (Slate 50)
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    gap: 4,
  },
  dateDisplay: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  greetingName: {
    letterSpacing: -0.5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },

  // Hero Card Styles
  heroCard: {
    backgroundColor: "#0F172A", // Deep modern Slate 900
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748B",
  },
  liveDotActive: {
    backgroundColor: "#10B981", // Emerald green
    shadowColor: "#10B981",
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  timeWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 8,
  },
  mainTime: {
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  amPm: {
    marginBottom: 4,
  },
  durationWrapper: {
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  timePillsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  timePill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 4,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 16,
    gap: 8,
  },
  heroButtonPrimary: {
    backgroundColor: "#3B82F6", // Sleek Blue
  },
  heroButtonDanger: {
    backgroundColor: "#EF4444", // Sleek Red
  },
  heroButtonText: {
    letterSpacing: 0.3,
  },

  // Stats Grid Row
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  // Bento Charts Section
  bentoSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  bentoCharts: {
    gap: 16,
  },
  bentoCardLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  chartTitle: {
    marginBottom: 16,
  },

  // Lists Section
  listSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  glassList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  listDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  listIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  listContent: {
    flex: 1,
    gap: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyListItem: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  // Pending State
  pendingState: {
    flex: 1,
    minHeight: 400,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 32,
    marginTop: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  pendingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  pendingTitle: {
    marginBottom: 8,
  },
  pendingText: {
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  pendingDateCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
});
