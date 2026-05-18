import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
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
  Plus,
} from "lucide-react-native";
import { Text } from "../components/ui/Typography";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { Button } from "../components/ui/Button";
import apiClient from "../api/apiClient";
import { API_ENDPOINTS, STORAGE_KEYS, CACHE_TTL } from "../config/apiConfig";
import { getCurrentEmployee } from "../api/employeeService";
import { getCompanyById } from "../api/companyService";
import { normalizeEmployeeData } from "../utils/employeeData";
import {
  formatJoiningDate,
  hasEmployeeJoined,
  isOnOrAfterJoiningDate,
} from "../utils/employmentDates";
import {
  formatCompanyTime,
  getCurrentCompanyDate,
  parseCompanyDateTime,
} from "../utils/companyTime";

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
  status?: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
  workedMinutes?: number;
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
  return parseCompanyDateTime(value);
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

function workedHours(record?: AttendanceItem) {
  if (!record) return 0;
  return Math.max(0, Number(record.workedMinutes || 0)) / 60;
}

function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(dateStr?: string | null) {
  return dateStr ? formatCompanyTime(dateStr) : "—";
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
          } catch {
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
    } catch {
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

  const reportDate = useMemo(
    () => getCurrentCompanyDate(company?.timezone),
    [company?.timezone],
  );
  const employeeHasJoined = useMemo(
    () => hasEmployeeJoined(employee, reportDate),
    [employee, reportDate],
  );
  const joiningDateLabel = useMemo(
    () => formatJoiningDate(employee),
    [employee],
  );
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
      const isWorkingDay =
        workingDayKeys.length > 0 ? workingDayKeys.includes(weekdayKey) : true;
      const dateReachedJoining = isOnOrAfterJoiningDate(cursor, employee);

      let status: ReportDay["status"] = "Off Day";
      if (!dateReachedJoining) status = "Working Day";
      else if (isWorkingDay) {
        if (record?.status === "CLOCKED_OUT") status = "Present";
        else if (record?.status === "CLOCKED_IN" || record?.status === "ON_BREAK") status = "Clocked In";
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
        outTime: record?.outTime ?? null,
        hours: workedHours(record),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days.sort((a, b) => b.date.getTime() - a.date.getTime()); // Show latest first
  }, [attendanceData, employee, reportDate, workingDayKeys]);

  const visibleDailyLogs = useMemo(() => {
    const today = getCurrentCompanyDate(company?.timezone);
    today.setHours(23, 59, 59, 999);
    const todayKey = getDateKey(today);

    return monthDays.filter((day) => {
      if (day.date.getTime() > today.getTime()) {
        return false;
      }

      if (day.inTime || day.outTime) {
        return true;
      }

      return (
        day.status === "Absent" ||
        day.status === "Clocked In" ||
        day.key === todayKey
      );
    });
  }, [company?.timezone, monthDays]);

  const presentCount = monthDays.filter(
    (day) => day.status === "Present",
  ).length;
  const clockedInCount = monthDays.filter(
    (day) => day.status === "Clocked In",
  ).length;
  const halfDayCount = monthDays.filter(
    (day) => day.workingDay && day.hours > 0 && day.hours < 4,
  ).length;
  const absentCount = monthDays.filter((day) => day.status === "Absent").length;
  const workingCount = monthDays.filter((day) => day.workingDay).length;
  const totalHours = monthDays.reduce((sum, day) => sum + day.hours, 0);

  const ListHeader = () => (
    <View style={styles.headerContent}>
      {!employeeHasJoined && (
        <View style={styles.pendingState}>
          <View style={styles.pendingIconWrap}>
            <Calendar size={20} color="#3B82F6" />
          </View>
          <View style={styles.pendingTextStack}>
            <Text variant="bold" size={14} color="#0F172A">
              Joining Pending
            </Text>
            <Text variant="medium" size={12} color="#64748B">
              Attendance begins on {joiningDateLabel}
            </Text>
          </View>
        </View>
      )}

      {/* Hero Stats Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.monthPill}>
            <Calendar size={12} color="#3B82F6" />
            <Text variant="semibold" size={12} color="#3B82F6">
              {formatMonthLabel(reportDate)}
            </Text>
          </View>
          <Text variant="medium" size={11} color="#94A3B8">
            This Month
          </Text>
        </View>

        <View style={styles.heroMain}>
          <Text
            variant="bold"
            size={32}
            color="#0F172A"
            style={styles.heroTime}
          >
            {formatDuration(totalHours).split(" ")[0]}
            <Text variant="semibold" size={16} color="#64748B">
              {" "}
              {formatDuration(totalHours).split(" ")[1]}
            </Text>
          </Text>
          <Text variant="medium" size={12} color="#64748B">
            Total Logged Hours
          </Text>
        </View>

        {company && (
          <View style={styles.heroFooter}>
            <Briefcase size={12} color="#94A3B8" />
            <Text variant="medium" size={11} color="#64748B">
              Schedule:{" "}
              {company.startTime
                ? `${company.startTime.slice(0, 5)} - ${company.endTime.slice(0, 5)}`
                : "Not Set"}
            </Text>
            <Text variant="medium" size={11} color="#64748B">
              {company.timezone || "Timezone not set"}
            </Text>
          </View>
        )}
      </View>

      {/* Compact Stats Row */}
      <View style={styles.compactStatsRow}>
        <View style={[styles.compactStatBox, { borderLeftColor: "#10B981" }]}>
          <CheckCircle size={14} color="#10B981" />
          <Text variant="bold" size={18} color="#0F172A">
            {presentCount}
          </Text>
          <Text variant="medium" size={10} color="#64748B">
            Present
          </Text>
        </View>

        <View style={[styles.compactStatBox, { borderLeftColor: "#F59E0B" }]}>
          <Clock size={14} color="#F59E0B" />
          <Text variant="bold" size={18} color="#0F172A">
            {clockedInCount}
          </Text>
          <Text variant="medium" size={10} color="#64748B">
            Active
          </Text>
        </View>

        <View style={[styles.compactStatBox, { borderLeftColor: "#F59E0B" }]}>
          <Clock size={14} color="#F59E0B" />
          <Text variant="bold" size={18} color="#0F172A">
            {halfDayCount}
          </Text>
          <Text variant="medium" size={10} color="#64748B">
            Half Day
          </Text>
        </View>

        <View style={[styles.compactStatBox, { borderLeftColor: "#EF4444" }]}>
          <XCircle size={14} color="#EF4444" />
          <Text variant="bold" size={18} color="#0F172A">
            {absentCount}
          </Text>
          <Text variant="medium" size={10} color="#64748B">
            Absent
          </Text>
        </View>

        <View style={[styles.compactStatBox, { borderLeftColor: "#64748B" }]}>
          <Calendar size={14} color="#64748B" />
          <Text variant="bold" size={18} color="#0F172A">
            {workingCount}
          </Text>
          <Text variant="medium" size={10} color="#64748B">
            Work Days
          </Text>
        </View>
      </View>

      <View style={styles.applyLeaveRow}>
        <Button
          title="Apply Leave"
          onPress={() =>
            navigation.navigate("Dashboard", { screen: "ApplyLeave" })
          }
          icon={<Plus size={16} color="#FFFFFF" />}
        />
      </View>

      <Text variant="bold" size={16} color="#0F172A" style={styles.listTitle}>
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
        <View
          style={[
            styles.dateBlock,
            !item.workingDay && { backgroundColor: "#F8FAFC" },
          ]}
        >
          <Text
            variant="bold"
            size={16}
            color={item.workingDay ? "#0F172A" : "#94A3B8"}
          >
            {item.date.getDate()}
          </Text>
          <Text
            variant="medium"
            size={10}
            color={item.workingDay ? "#64748B" : "#CBD5E1"}
          >
            {item.dayLabel}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <View style={styles.dayHeader}>
            <Text variant="semibold" size={13} color="#0F172A">
              {formatFullDay(item.date)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text variant="semibold" size={10} color={statusColor}>
                {item.status}
              </Text>
            </View>
          </View>

          {item.workingDay && item.status !== "Absent" ? (
            <View style={styles.timeTracker}>
              <View style={styles.timeNode}>
                <Text variant="medium" size={10} color="#94A3B8">
                  In
                </Text>
                <Text variant="semibold" size={12} color="#0F172A">
                  {formatTime(item.inTime)}
                </Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeNode}>
                <Text variant="medium" size={10} color="#94A3B8">
                  Out
                </Text>
                <Text variant="semibold" size={12} color="#0F172A">
                  {formatTime(item.outTime)}
                </Text>
              </View>
              {(item.inTime || item.outTime) && (
                <Text
                  variant="semibold"
                  size={10}
                  color="#3B82F6"
                  style={{ marginLeft: "auto" }}
                >
                  {formatDuration(item.hours)}
                </Text>
              )}
            </View>
          ) : (
            <Text variant="medium" size={11} color="#94A3B8">
              {item.status === "Absent"
                ? "No attendance recorded."
                : "Scheduled day off."}
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
          data={visibleDailyLogs}
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
  applyLeaveRow: {
    marginTop: 16,
    marginBottom: 16,
  },

  // Pending State Header
  pendingState: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  pendingIconWrap: {
    width: 36,
    height: 36,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pendingTextStack: {
    flex: 1,
    gap: 2,
  },

  // Hero Stats Card
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  heroMain: {
    marginBottom: 12,
  },
  heroTime: {
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 6,
  },

  // Compact Stats Row
  compactStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  compactStatBox: {
    flexBasis: "48%",
    minWidth: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderLeftWidth: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    gap: 4,
  },

  listTitle: {
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // Day Cards
  dayCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.015,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCardOff: {
    backgroundColor: "#FAFAFA",
    borderColor: "#F1F5F9",
  },
  dateBlock: {
    width: 44,
    height: 48,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dayInfo: {
    flex: 1,
    justifyContent: "center",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeTracker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
  },
  timeNode: {
    flex: 1,
    gap: 1,
  },
  timeDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
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
