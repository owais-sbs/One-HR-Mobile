import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Button } from '../components/ui/Button';
import { API_CONFIG, API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import apiClient from '../api/apiClient';
import { getEmployeeData, refreshEmployeeData } from '../utils/currentEmployee';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isDisabled: boolean;
  isHoliday: boolean;
  hasExistingLeave: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
}

interface LeaveType {
  id: number;
  name: string;
  totalDays: number;
  color?: string;
  icon?: string;
}

interface LeaveBalance {
  id: number;
  leaveTypeId: number;
  totalAllocated: number;
  used: number;
  remaining: number;
  extraUsed: number;
}

interface ExistingLeaveRequest {
  startDate: string;
  endDate: string;
}

interface CompanyHoliday {
  startDate?: string;
  endDate?: string;
  date?: string;
  isactive?: boolean;
  isdeleted?: boolean;
}

interface WorkingHourConfig {
  workingDays?: string;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const toDateKey = (value?: string | null) => {
  if (!value) return '';
  return value.split('T')[0];
};

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value?: string | null) => {
  const dateKey = toDateKey(value);
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const normalizeDayToken = (value?: string | null) => {
  const map: Record<string, string> = {
    monday: 'mon', mon: 'mon',
    tuesday: 'tue', tue: 'tue',
    wednesday: 'wed', wed: 'wed',
    thursday: 'thu', thu: 'thu',
    friday: 'fri', fri: 'fri',
    saturday: 'sat', sat: 'sat',
    sunday: 'sun', sun: 'sun',
  };
  return value ? map[value.trim().toLowerCase()] || value.trim().toLowerCase() : '';
};

const getDayToken = (date: Date) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];

const buildWorkingDaySet = (workingDays?: string) =>
  new Set(
    (workingDays || '')
      .split(',')
      .map(normalizeDayToken)
      .filter(Boolean),
  );

const buildDateRangeKeys = (startValue?: string | null, endValue?: string | null) => {
  const start = parseDateOnly(startValue);
  const end = parseDateOnly(endValue || startValue);
  if (!start || !end) return [];

  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
};

const buildHolidayDateSet = (holidays: CompanyHoliday[]) =>
  new Set(
    holidays.flatMap((holiday) => {
      if (holiday?.isdeleted || holiday?.isactive === false) return [];
      return buildDateRangeKeys(
        holiday.startDate || holiday.date,
        holiday.endDate || holiday.startDate || holiday.date,
      );
    }),
  );

const buildExistingLeaveDateSet = (leaves: ExistingLeaveRequest[]) =>
  new Set(
    leaves.flatMap((leave) => buildDateRangeKeys(leave.startDate, leave.endDate)),
  );

const fetchOptionalApiData = async (path: string) => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      headers: {
        ...API_CONFIG.HEADERS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(() => null);
    return data?.data || data || null;
  } catch {
    return null;
  }
};

const isHolidayDate = (date: Date, holidayDateSet: Set<string>) =>
  holidayDateSet.has(toLocalDateKey(date));

const hasExistingLeaveOnDate = (date: Date, existingLeaveDateSet: Set<string>) =>
  existingLeaveDateSet.has(toLocalDateKey(date));

const isSelectableWorkingDate = (
  date: Date,
  workingDaySet: Set<string>,
  holidayDateSet: Set<string>,
  existingLeaveDateSet: Set<string>,
  minDate: Date,
) => {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  if (current < minDate) return false;
  if (workingDaySet.size > 0 && !workingDaySet.has(getDayToken(current))) return false;
  if (isHolidayDate(current, holidayDateSet)) return false;
  if (hasExistingLeaveOnDate(current, existingLeaveDateSet)) return false;
  return true;
};

const rangesOverlap = (
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) => leftStart <= rightEnd && leftEnd >= rightStart;

const hasLeaveConflict = (
  leaves: ExistingLeaveRequest[],
  startDate: string,
  endDate: string,
) =>
  leaves.some((leave) => {
    const leaveStart = toDateKey(leave.startDate);
    const leaveEnd = toDateKey(leave.endDate);
    if (!leaveStart || !leaveEnd) return false;
    return rangesOverlap(startDate, endDate, leaveStart, leaveEnd);
  });

const generateCalendarDays = (
  year: number,
  month: number,
  selectedRange: { start: Date | null; end: Date | null },
  workingDaySet: Set<string>,
  holidayDateSet: Set<string>,
  existingLeaveDateSet: Set<string>,
): CalendarDay[] => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const date = new Date(prevMonthYear, prevMonth, dayNum);
    const isHoliday = isHolidayDate(date, holidayDateSet);
    const hasExistingLeave = hasExistingLeaveOnDate(date, existingLeaveDateSet);
    days.push({
      day: dayNum,
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      isDisabled: true,
      isHoliday,
      hasExistingLeave,
      isSelected: false,
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isHoliday = isHolidayDate(date, holidayDateSet);
    const hasExistingLeave = hasExistingLeaveOnDate(date, existingLeaveDateSet);
    const isDisabled = !isSelectableWorkingDate(date, workingDaySet, holidayDateSet, existingLeaveDateSet, today);
    const isSelected = selectedRange.start !== null &&
      date.getTime() === selectedRange.start.getTime();
    const isRangeEnd = selectedRange.end !== null &&
      date.getTime() === selectedRange.end.getTime();
    const isInRange = selectedRange.start !== null && selectedRange.end !== null &&
      date.getTime() > selectedRange.start.getTime() &&
      date.getTime() < selectedRange.end.getTime();

    days.push({
      day,
      date,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      isDisabled,
      isHoliday,
      hasExistingLeave,
      isSelected,
      isRangeStart: isSelected,
      isRangeEnd,
      isInRange,
    });
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, day);
    const isHoliday = isHolidayDate(date, holidayDateSet);
    const hasExistingLeave = hasExistingLeaveOnDate(date, existingLeaveDateSet);
    days.push({
      day,
      date,
      isCurrentMonth: false,
      isToday: date.getTime() === today.getTime(),
      isDisabled: true,
      isHoliday,
      hasExistingLeave,
      isSelected: false,
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: false,
    });
  }

  return days;
};

export default function ApplyLeaveScreen({ navigation }: any) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<number | null>(null);
  const [step, setStep] = useState<'date' | 'type' | 'reason'>('date');
  const [reason, setReason] = useState('');

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employee, setEmployee] = useState<any>(null);
  const [existingLeaves, setExistingLeaves] = useState<ExistingLeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [workingDays, setWorkingDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const holidayDateSet = buildHolidayDateSet(holidays);
  const existingLeaveDateSet = buildExistingLeaveDateSet(existingLeaves);

  const calendarDays = generateCalendarDays(
    currentYear,
    currentMonth,
    selectedRange,
    workingDays,
    holidayDateSet,
    existingLeaveDateSet,
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const emp = await getEmployeeData({ forceRefresh: true });
      if (!emp) return;

      setEmployee(emp);

      const companyId = emp?.companyId;
      const typesUrl = companyId
        ? API_ENDPOINTS.LEAVE_TYPES.BY_COMPANY(companyId)
        : API_ENDPOINTS.LEAVE_TYPES.LIST;

      const [typesRes, balancesRes, leavesRes, holidaysData, workingHoursData] = await Promise.allSettled([
        apiClient.get(typesUrl),
        emp?.id ? apiClient.get(API_ENDPOINTS.LEAVE.BALANCES(emp.id)) : Promise.resolve(null),
        emp?.id ? apiClient.get(API_ENDPOINTS.LEAVE.MY_LEAVES(emp.id)) : Promise.resolve(null),
        companyId ? fetchOptionalApiData(API_ENDPOINTS.HOLIDAYS.BY_COMPANY(companyId)) : Promise.resolve(null),
        companyId ? fetchOptionalApiData(API_ENDPOINTS.WORKING_HOURS.BY_COMPANY(companyId)) : Promise.resolve(null),
      ]);

      if (typesRes.status === 'fulfilled' && typesRes.value?.data?.isSuccess !== false) {
        setLeaveTypes(typesRes.value?.data?.data || []);
      }

      if (balancesRes.status === 'fulfilled' && balancesRes.value?.data?.isSuccess !== false) {
        setBalances(balancesRes.value?.data?.data || []);
      }

      if (leavesRes.status === 'fulfilled' && leavesRes.value?.data?.isSuccess !== false) {
        setExistingLeaves(Array.isArray(leavesRes.value?.data?.data) ? leavesRes.value.data.data : []);
      }

      if (holidaysData.status === 'fulfilled') {
        setHolidays(Array.isArray(holidaysData.value) ? holidaysData.value : []);
      }

      const workingHour = workingHoursData.status === 'fulfilled'
        ? workingHoursData.value as WorkingHourConfig | null
        : null;
      setWorkingDays(buildWorkingDaySet(workingHour?.workingDays));
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayPress = (day: CalendarDay) => {
    if (!day.isCurrentMonth || day.isDisabled) return;

    if (!selectingEnd) {
      setSelectedRange({ start: day.date, end: null });
      setSelectingEnd(true);
    } else {
      if (selectedRange.start && day.date < selectedRange.start) {
        setSelectedRange({ start: day.date, end: selectedRange.start });
      } else {
        setSelectedRange({ start: selectedRange.start, end: day.date });
      }
      setSelectingEnd(false);
      setStep('type');
    }
  };

  const getSelectedDaysCount = () => {
    if (!selectedRange.start || !selectedRange.end) return 0;
    let count = 0;
    const cursor = new Date(selectedRange.start);
    const minDate = new Date(selectedRange.start.getFullYear(), selectedRange.start.getMonth(), selectedRange.start.getDate());
    while (cursor <= selectedRange.end) {
      if (isSelectableWorkingDate(cursor, workingDays, holidayDateSet, new Set(), minDate)) {
        count += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  };

  const getBalanceForType = (typeId: number) => {
    return balances.find(b => b.leaveTypeId === typeId);
  };

  const isExtraLeave = () => {
    if (!selectedLeaveType) return false;
    const balance = getBalanceForType(selectedLeaveType);
    if (!balance) return false;
    return balance.remaining < getSelectedDaysCount();
  };

  const handleSubmit = async () => {
    if (!employee?.id || !selectedLeaveType || !selectedRange.start || !selectedRange.end) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const freshEmployee = await refreshEmployeeData();
      if (!freshEmployee?.id || !selectedLeaveType || !selectedRange.start || !selectedRange.end) {
        Alert.alert('Error', 'Unable to refresh employee data. Please try again.');
        return;
      }

      setEmployee(freshEmployee);

      const currentLeavesResponse = await apiClient.get(
        API_ENDPOINTS.LEAVE.MY_LEAVES(freshEmployee.id),
      );
      if (currentLeavesResponse.data?.isSuccess === false) {
        Alert.alert('Error', currentLeavesResponse.data?.error || 'Unable to verify leave history. Please try again.');
        return;
      }
      const currentLeaves = Array.isArray(currentLeavesResponse.data?.data)
        ? currentLeavesResponse.data.data
        : [];

      const startDateKey = toLocalDateKey(selectedRange.start);
      const endDateKey = toLocalDateKey(selectedRange.end);
      const startDate = new Date(selectedRange.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedRange.end);
      endDate.setHours(0, 0, 0, 0);

      if (!isSelectableWorkingDate(startDate, workingDays, holidayDateSet, new Set(), startDate)) {
        Alert.alert('Error', 'Start date must be a company working day and not a holiday.');
        return;
      }

      if (!isSelectableWorkingDate(endDate, workingDays, holidayDateSet, new Set(), startDate)) {
        Alert.alert('Error', 'End date must be a company working day and not a holiday.');
        return;
      }

      const hasConflict = hasLeaveConflict(
        currentLeaves,
        startDateKey,
        endDateKey,
      );
      if (hasConflict) {
        Alert.alert('Error', "You've already requested leave on that day.");
        return;
      }

      const payload = {
        employeeId: freshEmployee.id,
        leaveTypeId: selectedLeaveType,
        startDate: toLocalDateKey(selectedRange.start),
        endDate: toLocalDateKey(selectedRange.end),
        leaveDays: getSelectedDaysCount(),
        reason: reason.trim(),
        companyId: freshEmployee.companyId,
      };

      const response = await apiClient.post(API_ENDPOINTS.LEAVE.REQUEST, payload);
      if (response.data?.isSuccess === false) {
        Alert.alert('Error', response.data?.error || 'Failed to submit leave request');
        return;
      }

      Alert.alert(
        'Success',
        'Leave request submitted successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('DashboardMain') }]
      );
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to submit leave request';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderCalendar = () => (
    <View style={styles.calendarContainer}>
      <View style={styles.monthHeader}>
        <Pressable onPress={goToPrevMonth} style={styles.monthNav}>
          <ChevronLeft size={20} color={colors.text.secondary} />
        </Pressable>
        <Text variant="semibold" size={16} color={colors.text.primary}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>
        <Pressable onPress={goToNextMonth} style={styles.monthNav}>
          <ChevronRight size={20} color={colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.daysHeader}>
        {DAYS.map(day => (
          <View key={day} style={styles.dayHeaderCell}>
            <Text variant="medium" size={11} color={colors.text.muted}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => (
          <Pressable
            key={index}
            onPress={() => handleDayPress(day)}
            disabled={day.isDisabled}
            style={[
              styles.dayCell,
              !day.isCurrentMonth && styles.otherMonthDay,
              day.isDisabled && styles.disabledDay,
              day.isHoliday && styles.holidayDay,
              day.hasExistingLeave && styles.existingLeaveDay,
              day.isToday && styles.todayCell,
              (day.isRangeStart || day.isRangeEnd) && styles.selectedDay,
              day.isRangeStart && styles.rangeStart,
              day.isRangeEnd && styles.rangeEnd,
              day.isInRange && styles.inRangeDay,
            ]}
          >
            <Text
              variant="medium"
              size={13}
              color={
                !day.isCurrentMonth ? colors.text.muted + '40' :
                (day.isRangeStart || day.isRangeEnd) ? '#FFFFFF' :
                day.isDisabled ? colors.text.muted :
                day.isInRange ? colors.text.primary :
                colors.text.primary
              }
            >
              {day.day}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.todayCell]} />
          <Text variant="regular" size={11} color={colors.text.muted}>Today</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.holidayDay]} />
          <Text variant="regular" size={11} color={colors.text.muted}>Holiday / day off</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.existingLeaveDay]} />
          <Text variant="regular" size={11} color={colors.text.muted}>Already requested</Text>
        </View>
      </View>

      {selectedRange.start && (
        <View style={styles.selectionInfo}>
          <View style={styles.selectionBadge}>
            <Calendar size={14} color={colors.secondary} />
            <Text variant="medium" size={13} color={colors.text.primary} style={styles.selectionText}>
              {selectedRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {selectedRange.end ? ` - ${selectedRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' (Select end date)'}
            </Text>
          </View>
          {selectedRange.end && (
            <View style={styles.daysCountBadge}>
              <Clock size={12} color={colors.text.muted} />
              <Text variant="regular" size={12} color={colors.text.muted}>
                {getSelectedDaysCount()} day{getSelectedDaysCount() > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderLeaveTypeSelection = () => (
    <View style={styles.leaveTypeContainer}>
      <Text variant="semibold" size={15} color={colors.text.primary} style={styles.sectionLabel}>
        Leave Type
      </Text>
      {leaveTypes.length === 0 && (
        <View style={styles.emptyState}>
          <Text variant="regular" size={13} color={colors.text.muted}>No leave types available</Text>
        </View>
      )}
      {leaveTypes.map(type => {
        const balance = getBalanceForType(type.id);
        const isSelected = selectedLeaveType === type.id;
        const typeColor = type.color || colors.secondary;
        return (
          <Pressable
            key={type.id}
            onPress={() => setSelectedLeaveType(type.id)}
            style={[
              styles.leaveTypeItem,
              isSelected && styles.leaveTypeItemSelected,
            ]}
          >
            <View style={styles.leaveTypeLeft}>
              <Text style={styles.leaveTypeIcon}>{type.icon || '📋'}</Text>
              <View>
                <Text variant="medium" size={14} color={colors.text.primary}>
                  {type.name}
                </Text>
                {balance && (
                  <Text variant="regular" size={11} color={colors.text.muted}>
                    {balance.remaining} of {balance.totalAllocated} days left
                  </Text>
                )}
              </View>
            </View>
            {isSelected && (
              <View style={[styles.checkCircle, { backgroundColor: typeColor }]}>
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </Pressable>
        );
      })}

      {isExtraLeave() && (
        <View style={styles.extraWarning}>
          <AlertTriangle size={16} color={colors.error} />
          <Text variant="medium" size={12} color={colors.error} style={styles.extraWarningText}>
            This will be marked as extra leave (insufficient balance)
          </Text>
        </View>
      )}
    </View>
  );

  const renderReasonInput = () => (
    <View style={styles.reasonContainer}>
      <Text variant="semibold" size={15} color={colors.text.primary} style={styles.sectionLabel}>
        Reason for Leave
      </Text>
      <TextInput
        style={styles.reasonInput}
        placeholder="Enter your reason..."
        placeholderTextColor={colors.text.muted}
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );

  const getStepTitle = () => {
    if (step === 'date') return 'Apply Leave';
    if (step === 'type') return 'Select Leave Type';
    return 'Add Reason';
  };

  const canProceed = () => {
    if (step === 'date') return !!selectedRange.end;
    if (step === 'type') return !!selectedLeaveType;
    return reason.trim().length > 0;
  };

  const handleNext = () => {
    if (step === 'date') setStep('type');
    else if (step === 'type') setStep('reason');
  };

  const handleBack = () => {
    if (step === 'reason') setStep('type');
    else if (step === 'type') {
      setSelectedLeaveType(null);
      setStep('date');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={getStepTitle()}
        onBack={handleBack}
      />

      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step === 'date' && styles.stepDotActive]} />
        <View style={[styles.stepLine, step !== 'date' && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 'type' && styles.stepDotActive, step !== 'date' && styles.stepDotActive]} />
        <View style={[styles.stepLine, step === 'reason' && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 'reason' && styles.stepDotActive]} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 'date' && renderCalendar()}
          {step === 'type' && renderLeaveTypeSelection()}
          {step === 'reason' && renderReasonInput()}

          <View style={styles.summaryCard}>
            <Text variant="semibold" size={13} color={colors.text.muted} style={styles.summaryTitle}>
              SUMMARY
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="regular" size={13} color={colors.text.secondary}>Duration</Text>
              <Text variant="semibold" size={13} color={colors.text.primary}>
                {selectedRange.start && selectedRange.end
                  ? `${getSelectedDaysCount()} day${getSelectedDaysCount() > 1 ? 's' : ''}`
                  : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="regular" size={13} color={colors.text.secondary}>Type</Text>
              <Text variant="semibold" size={13} color={colors.text.primary}>
                {selectedLeaveType
                  ? leaveTypes.find(t => t.id === selectedLeaveType)?.name
                  : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="regular" size={13} color={colors.text.secondary}>Status</Text>
              <Text variant="semibold" size={13} color={isExtraLeave() ? colors.error : colors.success}>
                {isExtraLeave() ? 'Extra Leave' : 'Regular Leave'}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button
          title={step === 'reason' ? (submitting ? 'Submitting...' : 'Submit Request') : 'Next'}
          variant="secondary"
          size="md"
          onPress={step === 'reason' ? handleSubmit : handleNext}
          disabled={!canProceed() || submitting}
          style={styles.submitButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.secondary,
    width: 24,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    backgroundColor: colors.secondary,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNav: {
    padding: 8,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  disabledDay: {
    backgroundColor: '#F3F4F6',
  },
  holidayDay: {
    backgroundColor: '#FEF3C7',
  },
  existingLeaveDay: {
    backgroundColor: '#FEE2E2',
  },
  todayCell: {
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  selectedDay: {
    backgroundColor: colors.secondary,
  },
  rangeStart: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  rangeEnd: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  inRangeDay: {
    backgroundColor: colors.secondary + '20',
  },
  calendarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionText: {
    marginLeft: 4,
  },
  daysCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaveTypeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    color: colors.text.muted,
  },
  leaveTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leaveTypeItemSelected: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.secondary,
  },
  leaveTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaveTypeIcon: {
    fontSize: 20,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  extraWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  extraWarningText: {
    flex: 1,
  },
  reasonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.primary,
    backgroundColor: '#FAFAFA',
    minHeight: 100,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  summaryTitle: {
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#F5F5F7',
  },
  submitButton: {
    borderRadius: 14,
    height: 50,
  },
});
