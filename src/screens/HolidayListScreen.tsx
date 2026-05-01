import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { Calendar } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { getCompanyHolidays } from '../api/holidayService';
import { STORAGE_KEYS } from '../config/apiConfig';
import { getCurrentEmployee } from '../api/employeeService';
import { normalizeEmployeeData } from '../utils/employeeData';

function formatHolidayDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return { day: '—', month: '—', year: '' };
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = date.getFullYear().toString();
  return { day, month, year };
}

function getHolidayWeekday(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

type HolidayItem = {
  id: string;
  name: string;
  date: string;
  day: string;
  dayNum: string;
  month: string;
};

export default function HolidayListScreen({ navigation }: any) {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      let emp = cached ? normalizeEmployeeData(JSON.parse(cached)) : null;

      if (!emp) {
        const response = await getCurrentEmployee();
        emp = normalizeEmployeeData(response);
        if (emp) {
          await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEE_DATA, JSON.stringify(emp));
        }
      }

      if (!emp?.companyId) {
        setHolidays([]);
        return;
      }

      const data = await getCompanyHolidays(emp.companyId);
      const list = Array.isArray(data) ? data : [];

      const mapped: HolidayItem[] = list
        .filter((h: any) => !h.isdeleted && h.isactive !== false)
        .map((h: any) => {
          const dateValue = h.date || h.startDate;
          const { day, month, year: y } = formatHolidayDate(dateValue);
          return {
            id: String(h.id),
            name: h.name || 'Holiday',
            date: `${day} ${month} ${y}`,
            day: getHolidayWeekday(dateValue),
            dayNum: day,
            month,
          };
        })
        .sort((a, b) => {
          const da = new Date(a.date).getTime();
          const db = new Date(b.date).getTime();
          return da - db;
        });

      setHolidays(mapped);

      const years = new Set(mapped.map((h) => {
        const d = new Date(h.date);
        return Number.isNaN(d.getTime()) ? '' : d.getFullYear().toString();
      }));
      const currentYear = new Date().getFullYear().toString();
      setYear(years.has(currentYear) ? currentYear : years.values().next().value || currentYear);
    } catch (error) {
      console.error('Load holidays error:', error);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const renderItem = ({ item }: { item: HolidayItem }) => (
    <View style={styles.holidayItem}>
      <View style={styles.dateContainer}>
        <Text variant="bold" size={18} color={colors.secondary}>
          {item.dayNum}
        </Text>
        <Text variant="semibold" size={12} color={colors.secondary} style={styles.monthText}>
          {item.month}
        </Text>
      </View>
      <View style={styles.holidayInfo}>
        <Text variant="semibold" size={16} color={colors.text.primary}>
          {item.name}
        </Text>
        <Text variant="regular" size={14} color={colors.text.secondary}>
          {item.day}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title={`Holidays ${year}`} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={holidays}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No holidays listed"
              message="There are no upcoming holidays for the current year."
              icon={<Calendar size={48} color={colors.text.muted} />}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dateContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.accent.blue,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  monthText: {
    textTransform: 'uppercase',
  },
  holidayInfo: {
    flex: 1,
  },
});
