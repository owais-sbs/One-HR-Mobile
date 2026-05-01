import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '../api/apiClient';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import { getCompanyById } from '../api/companyService';
import { getCurrentEmployee } from '../api/employeeService';
import { normalizeEmployeeData } from '../utils/employeeData';

function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export type NotificationCategory = 'leave' | 'attendance' | 'approval' | 'alert';

export type NotificationRecord = {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  read: boolean;
  category: NotificationCategory;
  source: 'leave' | 'attendance';
  createdAt: string;
  scheduledFor?: string;
  sourceId?: string;
};

type EmployeeData = {
  id?: number;
  companyId?: number;
};

type CompanyData = {
  startTime?: string;
  endTime?: string;
  workingDays?: Record<string, boolean>;
};

type LeaveRecord = {
  id: number;
  startDate?: string;
  endDate?: string;
  leaveTypeName?: string;
  approvedAt?: string;
  approvedByName?: string;
  status?: string;
};

type AttendanceRecord = {
  inTime?: string;
  outTime?: string | null;
};

const NOTIFICATION_STORAGE_KEY = '@onehr.notifications.v1';
const NOTIFICATION_SCHEDULE_KEY = '@onehr.notifications.scheduled.v1';
const NOTIFICATION_WINDOW_DAYS = 7;
const REMINDER_OFFSET_MINUTES = 5;

let bootstrapComplete = false;

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeLabel(date: Date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeOnly(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRangeLabel(start?: string, end?: string) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (startDate && endDate) {
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  if (startDate) {
    return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return 'your leave';
}

function getWeekdayKey(date: Date) {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()] || 'mon';
}

function isWorkingDay(company?: CompanyData, date = new Date()) {
  if (!company?.workingDays) {
    return true;
  }

  const weekday = getWeekdayKey(date);
  const enabled = company.workingDays[weekday];
  return Boolean(enabled);
}

function parseTimeOnDate(date: Date, value?: string) {
  if (!value) return null;

  const hhmmMatch = value.match(/^(\d{2}):(\d{2})$/);
  if (hhmmMatch) {
    const next = new Date(date);
    next.setHours(Number(hhmmMatch[1]), Number(hhmmMatch[2]), 0, 0);
    return next;
  }

  const timeMatch = value.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    const next = new Date(date);
    next.setHours(Number(timeMatch[1]), Number(timeMatch[2]), Number(timeMatch[3]), 0);
    return next;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateWithinLeave(date: Date, leave: LeaveRecord) {
  const start = parseDate(leave.startDate);
  const end = parseDate(leave.endDate);
  if (!start && !end) return false;

  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  if (start) {
    start.setHours(0, 0, 0, 0);
  }
  if (end) {
    end.setHours(23, 59, 59, 999);
  }

  if (start && end) {
    return normalized >= start && normalized <= end;
  }

  if (start) {
    return normalized >= start;
  }

  return end ? normalized <= end : false;
}

function buildNotificationTimeLabel(value?: string) {
  const parsed = parseDate(value);
  if (!parsed) return 'Just now';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

async function getStoredNotifications() {
  const raw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveStoredNotifications(records: NotificationRecord[]) {
  await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(records));
}

async function getScheduledNotificationIds() {
  const raw = await AsyncStorage.getItem(NOTIFICATION_SCHEDULE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

async function saveScheduledNotificationIds(ids: string[]) {
  await AsyncStorage.setItem(NOTIFICATION_SCHEDULE_KEY, JSON.stringify(ids));
}

async function mergeNotificationRecords(incoming: NotificationRecord[]) {
  const existing = await getStoredNotifications();
  const recordMap = new Map<string, NotificationRecord>();

  [...existing, ...incoming].forEach((record) => {
    if (!record?.id) return;
    const current = recordMap.get(record.id);
    recordMap.set(record.id, {
      ...current,
      ...record,
      read: current?.read ?? record.read ?? false,
    });
  });

  const merged = Array.from(recordMap.values()).sort((left, right) => {
    const leftTime = parseDate(left.createdAt)?.getTime() ?? 0;
    const rightTime = parseDate(right.createdAt)?.getTime() ?? 0;
    return rightTime - leftTime;
  });

  await saveStoredNotifications(merged);
  return merged;
}

async function clearScheduledNotifications() {
  if (isRunningInExpoGo()) return;
  try {
    const scheduledIds = await getScheduledNotificationIds();
    await Promise.all(
      scheduledIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))
    );
    await saveScheduledNotificationIds([]);
  } catch (error) {
    console.error('Clear scheduled notifications error:', error);
  }
}

async function scheduleLocalNotification(title: string, body: string, fireDate: Date, data: Record<string, string>) {
  if (isRunningInExpoGo()) return null;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });

    const scheduledIds = await getScheduledNotificationIds();
    await saveScheduledNotificationIds([...scheduledIds, id]);
    return id;
  } catch (error) {
    console.error('Schedule local notification error:', error);
    return null;
  }
}

async function scheduleAttendanceReminders(
  company: CompanyData,
  leaves: LeaveRecord[],
  attendance?: AttendanceRecord | null
) {
  const now = new Date();
  const reminderDates: Date[] = [];

  for (let index = 0; index < NOTIFICATION_WINDOW_DAYS; index += 1) {
    const next = new Date(now);
    next.setDate(now.getDate() + index);
    reminderDates.push(next);
  }

  const approvedLeaves = leaves.filter((leave) => String(leave.status).toUpperCase() === 'APPROVED');
  const upcomingReminders: NotificationRecord[] = [];

  for (const date of reminderDates) {
    if (!isWorkingDay(company, date)) {
      continue;
    }

    if (approvedLeaves.some((leave) => isDateWithinLeave(date, leave))) {
      continue;
    }

    const startDate = parseTimeOnDate(date, company.startTime);
    const endDate = parseTimeOnDate(date, company.endTime);
    const isToday = getDateKey(date) === getDateKey(now);
    const hasClockedInToday = Boolean(attendance?.inTime);
    const hasClockedOutToday = Boolean(attendance?.outTime);

    if (startDate) {
      const fireDate = new Date(startDate.getTime() - REMINDER_OFFSET_MINUTES * 60 * 1000);
      const shouldScheduleClockIn = !isToday
        || (!hasClockedInToday && !hasClockedOutToday);

      if (fireDate.getTime() > now.getTime() && shouldScheduleClockIn) {
        const id = `attendance:clock-in:${getDateKey(date)}`;
        const startTimeFormatted = formatTimeOnly(startDate);
        upcomingReminders.push({
          id,
          title: 'Clock In Reminder',
          subtitle: `Don't forget to clock in at ${startTimeFormatted}.`,
          timeLabel: formatTimeLabel(fireDate),
          read: false,
          category: 'attendance',
          source: 'attendance',
          createdAt: now.toISOString(),
          scheduledFor: fireDate.toISOString(),
          sourceId: id,
        });
        await scheduleLocalNotification(
          'Clock In Reminder',
          `Don't forget to clock in at ${startTimeFormatted}.`,
          fireDate,
          {
            type: 'attendance',
            reminder: 'clock-in',
            reminderDate: getDateKey(date),
          }
        );
      }
    }

    if (endDate) {
      const fireDate = new Date(endDate.getTime() - REMINDER_OFFSET_MINUTES * 60 * 1000);
      const shouldScheduleClockOut = !isToday
        || (hasClockedInToday && !hasClockedOutToday);

      if (fireDate.getTime() > now.getTime() && shouldScheduleClockOut) {
        const id = `attendance:clock-out:${getDateKey(date)}`;
        const endTimeFormatted = formatTimeOnly(endDate);
        upcomingReminders.push({
          id,
          title: 'Clock Out Reminder',
          subtitle: `Don't forget to clock out at ${endTimeFormatted}.`,
          timeLabel: formatTimeLabel(fireDate),
          read: false,
          category: 'attendance',
          source: 'attendance',
          createdAt: now.toISOString(),
          scheduledFor: fireDate.toISOString(),
          sourceId: id,
        });
        await scheduleLocalNotification(
          'Clock Out Reminder',
          `Don't forget to clock out at ${endTimeFormatted}.`,
          fireDate,
          {
            type: 'attendance',
            reminder: 'clock-out',
            reminderDate: getDateKey(date),
          }
        );
      }
    }
  }

  return upcomingReminders;
}

async function buildLeaveNotifications(leaves: LeaveRecord[]) {
  return leaves
    .filter((leave) => String(leave.status).toUpperCase() === 'APPROVED')
    .map((leave) => {
      const approvalDate = leave.approvedAt || leave.startDate || new Date().toISOString();
      const period = formatRangeLabel(leave.startDate, leave.endDate);

      return {
        id: `leave:approved:${leave.id}`,
        title: 'Leave Approved',
        subtitle: `${leave.leaveTypeName || 'Your leave'} for ${period} has been approved.`,
        timeLabel: buildNotificationTimeLabel(approvalDate),
        read: false,
        category: 'approval',
        source: 'leave',
        createdAt: approvalDate,
        sourceId: String(leave.id),
      } satisfies NotificationRecord;
    });
}

async function getEmployeeContext() {
  const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
  let employee: EmployeeData | null = cached ? normalizeEmployeeData(JSON.parse(cached)) : null;

  if (!employee) {
    const response = await getCurrentEmployee();
    employee = normalizeEmployeeData(response);
    if (employee) {
      await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEE_DATA, JSON.stringify(employee));
    }
  }

  return employee;
}

async function fetchAttendanceLeaveData(employeeId: number) {
  const [attendanceResponse, leaveResponse] = await Promise.all([
    apiClient.get(API_ENDPOINTS.ATTENDANCE.TODAY).catch(() => null),
    apiClient.get(API_ENDPOINTS.LEAVE.MY_LEAVES_BY_STATUS(employeeId, 'APPROVED')).catch(() => null),
  ]);

  const attendance = attendanceResponse?.data?.data || null;
  const leaves = leaveResponse?.data?.data || [];

  return {
    attendance,
    leaves: Array.isArray(leaves) ? leaves : [],
  };
}

export async function initializeNotificationSystem() {
  if (bootstrapComplete) {
    return;
  }

  bootstrapComplete = true;

  if (isRunningInExpoGo()) {
    console.warn('Notifications are not supported in Expo Go. Use a development build instead.');
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }

    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      await Notifications.requestPermissionsAsync();
    }

    Notifications.addNotificationReceivedListener(async (notification) => {
      const data = (notification.request.content.data || {}) as Record<string, string>;
      const now = new Date().toISOString();
      const type = data.type === 'leave' ? 'approval' : 'attendance';
      const record: NotificationRecord = {
        id: data.reminder ? `${data.type}:${data.reminder}:${data.reminderDate || now}` : `push:${notification.request.identifier}`,
        title: notification.request.content.title || 'Notification',
        subtitle: notification.request.content.body || '',
        timeLabel: buildNotificationTimeLabel(now),
        read: false,
        category: type,
        source: type === 'approval' ? 'leave' : 'attendance',
        createdAt: now,
        sourceId: notification.request.identifier,
      };

      await mergeNotificationRecords([record]);
    });
  } catch (error) {
    console.error('Notification setup error:', error);
  }
}

export async function refreshNotificationCenter() {
  if (isRunningInExpoGo()) {
    return [];
  }

  try {
    const employee = await getEmployeeContext();
    if (!employee?.id) {
      return [];
    }

    const company = employee.companyId ? await getCompanyById(employee.companyId).catch(() => null) : null;
    const { attendance, leaves } = await fetchAttendanceLeaveData(employee.id);

    const leaveNotifications = await buildLeaveNotifications(leaves);
    await clearScheduledNotifications();
    const attendanceNotifications = company?.startTime || company?.endTime
      ? await scheduleAttendanceReminders(company, leaves, attendance)
      : [];

    const existing = await getStoredNotifications();
    const preserved = existing.filter((record) => !record.id.startsWith('attendance:clock-'));
    await saveStoredNotifications(preserved);

    const records = await mergeNotificationRecords([...leaveNotifications, ...attendanceNotifications]);

    return records;
  } catch (error) {
    console.error('Refresh notification center error:', error);
    return [];
  }
}

export async function loadNotificationCenter() {
  return getStoredNotifications();
}

export async function markNotificationRead(id: string) {
  const records = await getStoredNotifications();
  const updated = records.map((record) => (
    record.id === id ? { ...record, read: true } : record
  ));
  await saveStoredNotifications(updated);
  return updated;
}

export async function markAllNotificationsRead() {
  const records = await getStoredNotifications();
  const updated = records.map((record) => ({ ...record, read: true }));
  await saveStoredNotifications(updated);
  return updated;
}
