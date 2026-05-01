import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Briefcase, Building2, Globe, Users, Calendar, Clock, CreditCard } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { STORAGE_KEYS } from '../config/apiConfig';
import { normalizeEmployeeData } from '../utils/employeeData';
import { getCurrentEmployee } from '../api/employeeService';
import { getCompanyById } from '../api/companyService';

const WORKING_DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

function formatTime(value?: string) {
  if (!value) return '—';
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function CompanyDetailsScreen({ navigation }: any) {
  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  const loadData = useCallback(async () => {
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

      if (!emp) return;

      setEmployee(emp);

      if (emp.companyId) {
        const companyData = await getCompanyById(emp.companyId);
        setCompany(companyData);
      }
    } catch (error) {
      console.error('CompanyDetails load error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const workingDays = company?.workingDays
    ? Object.entries(company.workingDays)
        .filter(([, enabled]) => enabled)
        .map(([day]) => WORKING_DAY_LABELS[day.toLowerCase()] || day.toUpperCase())
    : [];

  const companyInfo = [
    { icon: Building2, label: 'Company', value: company?.name || '—' },
    { icon: Briefcase, label: 'Company Code', value: company?.code || '—' },
    { icon: Globe, label: 'Country', value: company?.country || '—' },
    { icon: Users, label: 'Employees', value: company?.employees != null ? String(company.employees) : '—' },
    { icon: Calendar, label: 'Working Days', value: workingDays.length > 0 ? workingDays.join(', ') : '—' },
    { icon: Clock, label: 'Hours', value: company?.startTime && company?.endTime ? `${formatTime(company.startTime)} - ${formatTime(company.endTime)}` : '—' },
    { icon: CreditCard, label: 'Payroll', value: company?.salaryCycle ? `${company.salaryCycle}${company.payday ? ` | Payday: ${company.payday}` : ''}` : '—' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Company Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Building2 size={32} color={colors.secondary} />
          </View>
          <Text variant="bold" size={20} color={colors.text.primary}>{company?.name || 'Company Details'}</Text>
          <Text variant="medium" size={14} color={colors.text.secondary}>
            {company?.country || 'Employment Information'}
          </Text>
        </View>

        <View style={styles.card}>
          {companyInfo.map((item, index) => (
            <View key={index} style={[styles.infoItem, index === companyInfo.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.iconContainer}>
                <item.icon size={18} color={colors.secondary} />
              </View>
              <View style={styles.itemContent}>
                <Text variant="regular" size={11} color={colors.text.muted}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={14} color={colors.text.primary}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.scheduleCard}>
          <Text variant="semibold" size={14} color={colors.text.primary} style={styles.sectionTitle}>
            Working Schedule
          </Text>
          <View style={styles.dayRow}>
            {workingDays.length > 0 ? workingDays.map((day) => (
              <View key={day} style={styles.dayChip}>
                <Text variant="semibold" size={10} color={colors.secondary}>
                  {day}
                </Text>
              </View>
            )) : (
              <Text variant="medium" size={12} color={colors.text.muted}>No working days configured</Text>
            )}
          </View>
          <Text variant="medium" size={12} color={colors.text.secondary} style={styles.scheduleText}>
            Break: {company?.breakDuration || 0} min
          </Text>
          <Text variant="medium" size={12} color={colors.text.secondary} style={styles.scheduleText}>
            Grace period: {company?.gracePeriod || 0} min
          </Text>
          <Text variant="medium" size={12} color={colors.text.secondary} style={styles.scheduleText}>
            Timezone: {company?.timezone || 'Not set'}
          </Text>
        </View>

        <View style={styles.noticeBox}>
          <Text variant="medium" size={12} color={colors.text.secondary} style={styles.noticeText}>
            Company settings shown here are fetched live from your tenant profile. Contact HR for any record corrections.
          </Text>
        </View>

        {employee?.departmentId && (
          <View style={styles.noticeBox}>
            <Text variant="medium" size={12} color={colors.text.secondary} style={styles.noticeText}>
              Your current department ID is {String(employee.departmentId)}.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: colors.accent.blue,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  scheduleCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent.blue,
  },
  scheduleText: {
    marginTop: 4,
  },
  noticeBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  noticeText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
