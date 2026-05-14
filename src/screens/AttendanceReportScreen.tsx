import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  Clock,
  Calendar,
  ClipboardList,
  CheckCircle,
  XCircle,
  Briefcase,
} from "lucide-react-native";
import { Text } from "../components/ui/Typography";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import apiClient from "../api/apiClient";
import { API_ENDPOINTS, STORAGE_KEYS, CACHE_TTL } from "../config/apiConfig";
import { getCurrentEmployee } from "../api/employeeService";
import { getCompanyById } from "../api/companyService";
import { normalizeEmployeeData } from "../utils/employeeData";
import {
  formatJoiningDate,
  getEmployeeJoiningDate,
  hasEmployeeJoined,
  isOnOrAfterJoiningDate,
} from "../utils/employmentDates";

const WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_BY_INDEX = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
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
  status: "Present" | "Clocked In" | "Absent" | "Off Day" | "Working Day";
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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getWeekdayKey(date: Date) {
  return WEEKDAY_BY_INDEX[date.getDay()] || "mon";
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
  if (!dateStr) return "—";
  const d = parseDate(dateStr);
  if (!d) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatFullDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
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
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAttendance = useCallback(async (forceRefresh = false) => {
    const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    const attendanceCacheKey = `${STORAGE_KEYS.ATTENDANCE_CACHE}_${userId || "unknown"}`;

    if (forceRefresh) {
      setRefreshing(true);
      await AsyncStorage.removeItem(attendanceCacheKey);
    } else {
      setLoading(true);
    }
    try {
      const cachedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      let employee = null;
      if (cached) {
        const parsed = normalizeEmployeeData(JSON.parse(cached));
        if (
          parsed?.accountId === cachedUserId ||
          String(parsed?.id) === cachedUserId
        )
          employee = parsed;
      }

      if (!employee) {
        const response = await getCurrentEmployee();
        employee = normalizeEmployeeData(response);
        if (employee)
          await AsyncStorage.setItem(
            STORAGE_KEYS.EMPLOYEE_DATA,
            JSON.stringify(employee),
          );
      }
      setEmployee(employee);

      if (employee?.companyId) {
        const cachedCompany = await AsyncStorage.getItem(
          `${STORAGE_KEYS.COMPANY_DATA}_${employee.companyId}`,
        );
        if (cachedCompany) setCompany(JSON.parse(cachedCompany));
        else {
          try {
            const companyData = await getCompanyById(employee.companyId);
            setCompany(companyData);
            await AsyncStorage.setItem(
              `${STORAGE_KEYS.COMPANY_DATA}_${employee.companyId}`,
              JSON.stringify(companyData),
            );
          } catch (companyError) {
            setCompany(null);
          }
        }
      }

      if (!forceRefresh) {
        const now = Date.now();
        const attendanceCache = await AsyncStorage.getItem(attendanceCacheKey);
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
      await AsyncStorage.setItem(
        attendanceCacheKey,
        JSON.stringify({ data: attendanceList, timestamp: Date.now() }),
      );
    } catch (error) {
      setAttendanceData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => loadAttendance(true), [loadAttendance]);
  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance]),
  );

  const reportDate = useMemo(() => new Date(), []);
  const joiningDate = useMemo(
    () => getEmployeeJoiningDate(employee),
    [employee],
  );
  const employeeHasJoined = useMemo(
    () => hasEmployeeJoined(employee, reportDate),
    [employee, reportDate],
  );
  const joiningDateLabel = useMemo(
    () => formatJoiningDate(employee),
    [employee],
  );
  const companyEndTime = company?.endTime;

  const workingDayKeys = useMemo(() => {
    const enabled = Object.entries(company?.workingDays ?? {})
      .filter(([, isEnabled]) => isEnabled)
      .map(([day]) => day.toLowerCase());
    return WEEKDAY_ORDER.filter((day) => enabled.includes(day));
  }, [company]);

  const monthDays = useMemo(() => {
    const monthStart = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      reportDate.getFullYear(),
      reportDate.getMonth() + 1,
      0,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordMap = new Map<string, AttendanceItem>();

    attendanceData.forEach((item) => {
      const checkIn = parseDate(item.inTime);
      if (!checkIn || !isOnOrAfterJoiningDate(checkIn, employee)) return;
      const key = getDateKey(checkIn);
      if (!recordMap.has(key)) recordMap.set(key, item);
    });

    const days: ReportDay[] = [];
    const cursor = new Date(monthStart);

    while (cursor <= monthEnd) {
      const key = getDateKey(cursor);
      const weekdayKey = getWeekdayKey(cursor);
      const record = recordMap.get(key);
      const fallbackOutTime =
        record?.outTime ?? buildFallbackOutTime(record?.inTime, companyEndTime);
      const isWorkingDay =
        workingDayKeys.length > 0 ? workingDayKeys.includes(weekdayKey) : true;
      const dateReachedJoining = isOnOrAfterJoiningDate(cursor, employee);

      let status: ReportDay["status"] = "Off Day";
      if (!dateReachedJoining) status = "Working Day";
      else if (isWorkingDay) {
        if (fallbackOutTime) status = "Present";
        else if (record?.inTime) status = "Clocked In";
        else {
          const dayStart = new Date(cursor);
          dayStart.setHours(0, 0, 0, 0);
          status = dayStart > today ? "Working Day" : "Absent";
        }
      } else if (record?.inTime) {
        status = record.outTime ? "Present" : "Clocked In";
      }

      days.push({
        key,
        date: new Date(cursor),
        dayLabel: WEEKDAY_LABELS[weekdayKey] || weekdayKey.toUpperCase(),
        workingDay: isWorkingDay,
        status,
        inTime: record?.inTime,
        outTime: fallbackOutTime,
        hours: fallbackOutTime
          ? hoursBetween(record?.inTime, fallbackOutTime)
          : 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days.sort((a, b) => b.date.getTime() - a.date.getTime()); // Show latest first
  }, [attendanceData, companyEndTime, employee, reportDate, workingDayKeys]);

  const presentCount = monthDays.filter(
    (day) => day.status === "Present",
  ).length;
  const clockedInCount = monthDays.filter(
    (day) => day.status === "Clocked In",
  ).length;
  const absentCount = monthDays.filter((day) => day.status === "Absent").length;
  const workingCount = monthDays.filter((day) => day.workingDay).length;
  const totalHours = monthDays.reduce((sum, day) => sum + day.hours, 0);

  const ListHeader = () => (
    <View style={styles.headerContent}>
      {!employeeHasJoined && (
        <View style={styles.pendingState}>
          <View style={styles.pendingIconWrap}>
            <Calendar size={28} color="#3B82F6" />
          </View>
          <View style={styles.pendingTextStack}>
            <Text variant="bold" size={16} color="#0F172A">
              Joining Pending
            </Text>
            <Text variant="medium" size={13} color="#64748B">
              Attendance begins on {joiningDateLabel}
            </Text>
          </View>
        </View>
      )}

      {/* Hero Stats Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.monthPill}>
            <Calendar size={14} color="#3B82F6" />
            <Text variant="semibold" size={13} color="#3B82F6">
              {formatMonthLabel(reportDate)}
            </Text>
          </View>
          <Text variant="medium" size={12} color="#94A3B8">
            This Month
          </Text>
        </View>

        <View style={styles.heroMain}>
          <Text
            variant="bold"
            size={40}
            color="#0F172A"
            style={styles.heroTime}
          >
            {formatDuration(totalHours).split(" ")[0]}
            <Text variant="semibold" size={20} color="#64748B">
              {" "}
              {formatDuration(totalHours).split(" ")[1]}
            </Text>
          </Text>
          <Text variant="medium" size={14} color="#64748B">
            Total Logged Hours
          </Text>
        </View>

        {company && (
          <View style={styles.heroFooter}>
            <Briefcase size={14} color="#94A3B8" />
            <Text variant="medium" size={12} color="#64748B">
              Schedule:{" "}
              {company.startTime
                ? `${company.startTime.slice(0, 5)} - ${company.endTime.slice(0, 5)}`
                : "Not Set"}
            </Text>
          </View>
        )}
      </View>

      {/* Bento Grid Stats */}
      <View style={styles.bentoGrid}>
        <View style={styles.statBox}>
          <View style={[styles.statIconWrap, { backgroundColor: "#ECFDF5" }]}>
            <CheckCircle size={20} color="#10B981" />
          </View>
          <Text variant="bold" size={22} color="#0F172A">
            {presentCount}
          </Text>
          <Text variant="medium" size={13} color="#64748B">
            Present
          </Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconWrap, { backgroundColor: "#FFFBEB" }]}>
            <Clock size={20} color="#F59E0B" />
          </View>
          <Text variant="bold" size={22} color="#0F172A">
            {clockedInCount}
          </Text>
          <Text variant="medium" size={13} color="#64748B">
            Active / Open
          </Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconWrap, { backgroundColor: "#FEF2F2" }]}>
            <XCircle size={20} color="#EF4444" />
          </View>
          <Text variant="bold" size={22} color="#0F172A">
            {absentCount}
          </Text>
          <Text variant="medium" size={13} color="#64748B">
            Absent
          </Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconWrap, { backgroundColor: "#F1F5F9" }]}>
            <Calendar size={20} color="#64748B" />
          </View>
          <Text variant="bold" size={22} color="#0F172A">
            {workingCount}
          </Text>
          <Text variant="medium" size={13} color="#64748B">
            Work Days
          </Text>
        </View>
      </View>

      <Text variant="bold" size={18} color="#0F172A" style={styles.listTitle}>
        Daily Log
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: ReportDay }) => {
    let statusColor = "#64748B";
    let statusBg = "#F1F5F9";

    if (item.status === "Present") {
      statusColor = "#10B981";
      statusBg = "#ECFDF5";
    } else if (item.status === "Absent") {
      statusColor = "#EF4444";
      statusBg = "#FEF2F2";
    } else if (item.status === "Clocked In") {
      statusColor = "#F59E0B";
      statusBg = "#FFFBEB";
    }

    return (
      <View style={[styles.dayCard, !item.workingDay && styles.dayCardOff]}>
        {/* Left Date Block */}
        <View
          style={[
            styles.dateBlock,
            !item.workingDay && { backgroundColor: "#F8FAFC" },
          ]}
        >
          <Text
            variant="bold"
            size={18}
            color={item.workingDay ? "#0F172A" : "#94A3B8"}
          >
            {item.date.getDate()}
          </Text>
          <Text
            variant="medium"
            size={12}
            color={item.workingDay ? "#64748B" : "#CBD5E1"}
          >
            {item.dayLabel}
          </Text>
        </View>

        {/* Right Info Block */}
        <View style={styles.dayInfo}>
          <View style={styles.dayHeader}>
            <Text variant="semibold" size={15} color="#0F172A">
              {formatFullDay(item.date)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text variant="semibold" size={11} color={statusColor}>
                {item.status}
              </Text>
            </View>
          </View>

          {item.workingDay && item.status !== "Absent" ? (
            <View style={styles.timeTracker}>
              <View style={styles.timeNode}>
                <Text variant="medium" size={11} color="#94A3B8">
                  Clock In
                </Text>
                <Text variant="semibold" size={13} color="#0F172A">
                  {formatTime(item.inTime)}
                </Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeNode}>
                <Text variant="medium" size={11} color="#94A3B8">
                  Clock Out
                </Text>
                <Text variant="semibold" size={13} color="#0F172A">
                  {formatTime(item.outTime)}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              variant="medium"
              size={13}
              color="#94A3B8"
              style={{ marginTop: 4 }}
            >
              {item.status === "Absent"
                ? "No attendance recorded."
                : "Scheduled day off."}
            </Text>
          )}

          {(item.inTime || item.outTime) && (
            <Text
              variant="semibold"
              size={12}
              color="#3B82F6"
              style={{ marginTop: 8 }}
            >
              {formatDuration(item.hours)} Logged
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScreenHeader title="Attendance Report" />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3B82F6" />
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
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <ClipboardList size={32} color="#94A3B8" />
              </View>
              <Text
                variant="bold"
                size={18}
                color="#0F172A"
                style={{ marginTop: 16 }}
              >
                No Records Found
              </Text>
              <Text
                variant="medium"
                size={14}
                color="#64748B"
                style={styles.emptyText}
              >
                Your daily logs will appear here once you start clocking in.
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
    backgroundColor: "#F8FAFC", // Sleek Slate 50
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerContent: {
    marginBottom: 8,
  },

  // Pending State Header
  pendingState: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  pendingIconWrap: {
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  pendingTextStack: {
    flex: 1,
    gap: 2,
  },

  // Hero Stats Card
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  heroMain: {
    marginBottom: 24,
  },
  heroTime: {
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 28,
  },
  statBox: {
    width: "47.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
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
    marginBottom: 12,
  },

  listTitle: {
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // Day Cards
  dayCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCardOff: {
    backgroundColor: "#FAFAFB",
    borderColor: "#F1F5F9",
  },
  dateBlock: {
    width: 56,
    height: 64,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  dayInfo: {
    flex: 1,
    justifyContent: "center",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeTracker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  timeNode: {
    flex: 1,
    gap: 2,
  },
  timeDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },

  // Empty State
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 260,
    marginTop: 8,
    lineHeight: 22,
  },
});
