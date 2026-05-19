import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Download, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Button } from '../components/ui/Button';
import { CustomLineChart } from '../components/ui/CustomLineChart';
import apiClient from '../api/apiClient';
import { API_ENDPOINTS, STORAGE_KEYS, CACHE_TTL } from '../config/apiConfig';
import { normalizeEmployeeData } from '../utils/employeeData';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency, normalizeCurrencyCode } from '../utils/currency';

function unwrapApiData(response: any) {
  return response?.data?.data ?? response?.data ?? null;
}

function getMonthLabel(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function formatPayrollPeriodLabel(startDate?: string, endDate?: string, fallback?: string) {
  if (!startDate || !endDate) return fallback || '';

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return fallback || '';
  }

  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPositiveNumber(values: unknown[]) {
  return values.map(toNumber).find((value) => value > 0) || 0;
}

function getAbsenceRuleAmount(payrollRules: any) {
  return firstPositiveNumber([
    payrollRules?.absenceDeductionAmountPerDay,
    payrollRules?.deductionAmountPerAbsentDay,
    payrollRules?.absenceAmountPerDay,
    payrollRules?.absentDeductionPerDay,
  ]);
}

type DeductionDisplayItem = {
  label: string;
  amount: number;
  note: string;
  alwaysShow: boolean;
};

export default function SalaryDetailsScreen() {
  const { currency, refreshCurrency } = useCurrency();
  const [employee, setEmployee] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [payrollRules, setPayrollRules] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmployee = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      if (cached) {
        setEmployee(normalizeEmployeeData(JSON.parse(cached)));
      }
    } catch (err) {
      console.error('SalaryDetails load employee error:', err);
    }
  }, []);

  const fetchSalaryDetails = useCallback(async (forceRefresh = false) => {
    if (!employee) return;

    const employeeCandidates = [employee?.id, employee?.employeeId, employee?.employeeToken]
      .filter((value) => value != null && value !== '');

    if (employeeCandidates.length === 0) {
      setError('Employee identifier not found');
      setLoading(false);
      return;
    }

    if (forceRefresh) {
      setRefreshing(true);
      await AsyncStorage.removeItem(`${STORAGE_KEYS.SALARY_DATA_CACHE}_${employeeCandidates[0]}`);
      await AsyncStorage.removeItem(`${STORAGE_KEYS.SALARY_STRUCTURE_CACHE}_${employeeCandidates[0]}`);
      await AsyncStorage.removeItem(`${STORAGE_KEYS.SALARY_HISTORY_CACHE}_${employeeCandidates[0]}`);
    }

    try {
      if (!forceRefresh) {
        setLoading(true);
      }
      setError(null);

      let salaryRecord: any = null;
      let resolvedEmployeeId: number | string | null = null;
      let lastSalaryError: any = null;

      const salaryCacheKey = `${STORAGE_KEYS.SALARY_DATA_CACHE}_${employeeCandidates[0]}`;
      if (!forceRefresh) {
        const cachedSalary = await AsyncStorage.getItem(salaryCacheKey);
        if (cachedSalary) {
          const { data, timestamp } = JSON.parse(cachedSalary);
          if (Date.now() - timestamp < CACHE_TTL.SALARY_DATA) {
            setSalaryData(data);
            salaryRecord = data;
            resolvedEmployeeId = employeeCandidates[0];
          }
        }
      }

      if (!salaryRecord) {
        for (const candidate of employeeCandidates) {
          try {
            const salaryResponse = await apiClient.get(
              API_ENDPOINTS.EMPLOYEE_SALARIES.BY_EMPLOYEE(candidate)
            );
            salaryRecord = unwrapApiData(salaryResponse);
            resolvedEmployeeId = candidate;
            break;
          } catch (candidateError) {
            lastSalaryError = candidateError;
          }
        }

        if (!salaryRecord) {
          throw lastSalaryError || new Error('Failed to load salary data');
        }

        setSalaryData(salaryRecord);
        await AsyncStorage.setItem(salaryCacheKey, JSON.stringify({
          data: salaryRecord,
          timestamp: Date.now(),
        }));
      }

      const salaryStructureId = salaryRecord?.salaryStructureId || employee?.salaryStructureId;
      const companyId = salaryRecord?.companyId || employee?.companyId;
      const structureCacheKey = `${STORAGE_KEYS.SALARY_STRUCTURE_CACHE}_${salaryStructureId || companyId}`;

      if (salaryStructureId || companyId) {
        if (!forceRefresh) {
          const cachedStructure = await AsyncStorage.getItem(structureCacheKey);
          if (cachedStructure) {
            const { data, timestamp } = JSON.parse(cachedStructure);
            if (Date.now() - timestamp < CACHE_TTL.SALARY_STRUCTURE) {
              setSalaryStructure(data);
            } else {
              try {
                if (salaryStructureId) {
                  const structureResponse = await apiClient.get(
                    API_ENDPOINTS.SALARY_STRUCTURES.BY_ID(salaryStructureId)
                  );
                  const structureData = unwrapApiData(structureResponse);
                  setSalaryStructure(structureData);
                  await AsyncStorage.setItem(structureCacheKey, JSON.stringify({
                    data: structureData,
                    timestamp: Date.now(),
                  }));
                } else {
                  const structureResponse = await apiClient.get(
                    API_ENDPOINTS.SALARY_STRUCTURES.ACTIVE_BY_COMPANY(companyId)
                  );
                  const structureData = unwrapApiData(structureResponse);
                  const finalStructure = Array.isArray(structureData) ? structureData[0] || null : structureData;
                  setSalaryStructure(finalStructure);
                  await AsyncStorage.setItem(structureCacheKey, JSON.stringify({
                    data: finalStructure,
                    timestamp: Date.now(),
                  }));
                }
              } catch (structureError) {
                console.error('SalaryDetails structure fetch error:', structureError);
                setSalaryStructure(null);
              }
            }
          } else {
            try {
              if (salaryStructureId) {
                const structureResponse = await apiClient.get(
                  API_ENDPOINTS.SALARY_STRUCTURES.BY_ID(salaryStructureId)
                );
                const structureData = unwrapApiData(structureResponse);
                setSalaryStructure(structureData);
                await AsyncStorage.setItem(structureCacheKey, JSON.stringify({
                  data: structureData,
                  timestamp: Date.now(),
                }));
              } else {
                const structureResponse = await apiClient.get(
                  API_ENDPOINTS.SALARY_STRUCTURES.ACTIVE_BY_COMPANY(companyId)
                );
                const structureData = unwrapApiData(structureResponse);
                const finalStructure = Array.isArray(structureData) ? structureData[0] || null : structureData;
                setSalaryStructure(finalStructure);
                await AsyncStorage.setItem(structureCacheKey, JSON.stringify({
                  data: finalStructure,
                  timestamp: Date.now(),
                }));
              }
            } catch (structureError) {
              console.error('SalaryDetails structure fetch error:', structureError);
              setSalaryStructure(null);
            }
          }
        } else {
          try {
            if (salaryStructureId) {
              const structureResponse = await apiClient.get(
                API_ENDPOINTS.SALARY_STRUCTURES.BY_ID(salaryStructureId)
              );
              const structureData = unwrapApiData(structureResponse);
              setSalaryStructure(structureData);
              await AsyncStorage.setItem(structureCacheKey, JSON.stringify({
                data: structureData,
                timestamp: Date.now(),
              }));
            } else {
              const structureResponse = await apiClient.get(
                API_ENDPOINTS.SALARY_STRUCTURES.ACTIVE_BY_COMPANY(companyId)
              );
              const structureData = unwrapApiData(structureResponse);
              const finalStructure = Array.isArray(structureData) ? structureData[0] || null : structureData;
              setSalaryStructure(finalStructure);
              await AsyncStorage.setItem(structureCacheKey, JSON.stringify({
                data: finalStructure,
                timestamp: Date.now(),
              }));
            }
          } catch (structureError) {
            console.error('SalaryDetails structure fetch error:', structureError);
            setSalaryStructure(null);
          }
        }
      } else {
        setSalaryStructure(null);
      }

      const [payrollSummaryResponse, payrollRulesResponse] = await Promise.all([
        apiClient
          .get(API_ENDPOINTS.PAYROLL.MY_SUMMARY())
          .catch(() => null),
        companyId
          ? apiClient.get(API_ENDPOINTS.PAYROLL_DEDUCTIONS.BY_COMPANY(companyId)).catch(() => null)
          : Promise.resolve(null),
      ]);

      setPayrollSummary(unwrapApiData(payrollSummaryResponse));
      setPayrollRules(unwrapApiData(payrollRulesResponse));

      const historyCacheKey = `${STORAGE_KEYS.SALARY_HISTORY_CACHE}_${resolvedEmployeeId || employeeCandidates[0]}`;
      if (!forceRefresh) {
        const cachedHistory = await AsyncStorage.getItem(historyCacheKey);
        if (cachedHistory) {
          const { data, timestamp } = JSON.parse(cachedHistory);
          if (Date.now() - timestamp < CACHE_TTL.SALARY_HISTORY) {
            setSalaryHistory(data);
          } else {
            try {
              const historyResponse = await apiClient.get(
                API_ENDPOINTS.SALARY_REVISIONS.BY_EMPLOYEE(resolvedEmployeeId || employeeCandidates[0])
              );
              const historyData = unwrapApiData(historyResponse);
              let historyList: any[] = [];
              if (Array.isArray(historyData)) {
                historyList = historyData;
              } else if (historyData && Array.isArray(historyData.content)) {
                historyList = historyData.content;
              }
              setSalaryHistory(historyList);
              await AsyncStorage.setItem(historyCacheKey, JSON.stringify({
                data: historyList,
                timestamp: Date.now(),
              }));
            } catch {
              setSalaryHistory([]);
            }
          }
        } else {
          try {
            const historyResponse = await apiClient.get(
              API_ENDPOINTS.SALARY_REVISIONS.BY_EMPLOYEE(resolvedEmployeeId || employeeCandidates[0])
            );
            const historyData = unwrapApiData(historyResponse);
            let historyList: any[] = [];
            if (Array.isArray(historyData)) {
              historyList = historyData;
            } else if (historyData && Array.isArray(historyData.content)) {
              historyList = historyData.content;
            }
            setSalaryHistory(historyList);
            await AsyncStorage.setItem(historyCacheKey, JSON.stringify({
              data: historyList,
              timestamp: Date.now(),
            }));
          } catch {
            setSalaryHistory([]);
          }
        }
      } else {
        try {
          const historyResponse = await apiClient.get(
            API_ENDPOINTS.SALARY_REVISIONS.BY_EMPLOYEE(resolvedEmployeeId || employeeCandidates[0])
          );
          const historyData = unwrapApiData(historyResponse);
          let historyList: any[] = [];
          if (Array.isArray(historyData)) {
            historyList = historyData;
          } else if (historyData && Array.isArray(historyData.content)) {
            historyList = historyData.content;
          }
          setSalaryHistory(historyList);
          await AsyncStorage.setItem(historyCacheKey, JSON.stringify({
            data: historyList,
            timestamp: Date.now(),
          }));
        } catch {
          setSalaryHistory([]);
        }
      }
    } catch (err: any) {
      console.error('SalaryDetails fetch error:', err);
      setPayrollSummary(null);
      setPayrollRules(null);
      setError(err?.response?.data?.message || 'Failed to load salary details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee]);

  const onRefresh = useCallback(() => {
    fetchSalaryDetails(true);
  }, [fetchSalaryDetails]);

  useFocusEffect(
    useCallback(() => {
      refreshCurrency().catch((error) => {
        console.error('SalaryDetails currency refresh error:', error);
      });
      loadEmployee();
    }, [loadEmployee, refreshCurrency])
  );

  useEffect(() => {
    fetchSalaryDetails();
  }, [fetchSalaryDetails]);

  // Derive earnings breakdown from salary data
  const earnings = React.useMemo(() => {
    const components = salaryData?.components || salaryData?.earnings || salaryData?.salaryComponents || [];
    if (Array.isArray(components) && components.length > 0) {
      return components.map((c: any) => ({
        label: c.label || c.name || c.componentName || 'Component',
        amount: typeof c.amount === 'number' ? c.amount : parseFloat(c.amount || 0),
      }));
    }
    return [];
  }, [salaryData]);

  // Derive deductions from salary data
  const deductions = React.useMemo(() => {
    const deds = salaryData?.deductions || salaryData?.deductionsList || [];
    if (Array.isArray(deds) && deds.length > 0) {
      return deds.map((d: any) => ({
        label: d.label || d.name || d.deductionName || d.componentName || 'Deduction',
        amount: typeof d.amount === 'number' ? d.amount : parseFloat(d.amount || 0),
      }));
    }
    return [];
  }, [salaryData]);

  const structureComponents = React.useMemo(() => {
    const components = salaryStructure?.components;
    if (!Array.isArray(components)) return [];

    return components.map((component: any) => ({
      id: component.id,
      name: component.name || 'Component',
      type: component.type || 'COMPONENT',
      calculationType: component.calculationType || 'FIXED',
      value: typeof component.value === 'number' ? component.value : Number(component.value || 0),
      isTaxable: Boolean(component.isTaxable),
    }));
  }, [salaryStructure]);

  const grossEarnings = React.useMemo(() => {
    if (payrollSummary?.periodBaseSalary != null || payrollSummary?.totalAllowances != null) {
      return Number(payrollSummary?.periodBaseSalary || 0) + Number(payrollSummary?.totalAllowances || 0);
    }
    if (salaryData?.grossSalary != null) return Number(salaryData.grossSalary);
    return earnings.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }, [payrollSummary, salaryData, earnings]);

  const totalDeductions = React.useMemo(() => {
    if (payrollSummary) {
      return (
        Number(payrollSummary.totalDeductions || 0)
        + Number(payrollSummary.extraLeaveDeduction || 0)
        + Number(payrollSummary.lateDeduction || 0)
        + Number(payrollSummary.halfDayDeduction || 0)
        + Number(payrollSummary.absenceDeduction || 0)
      );
    }
    if (salaryData?.totalDeductions != null) return Number(salaryData.totalDeductions);
    return deductions.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }, [payrollSummary, salaryData, deductions]);

  const netSalary = React.useMemo(() => {
    if (payrollSummary?.finalSalary != null) return Number(payrollSummary.finalSalary);
    if (salaryData?.netSalary != null) return Number(salaryData.netSalary);
    return grossEarnings - totalDeductions;
  }, [payrollSummary, salaryData, grossEarnings, totalDeductions]);

  const historyChartData = React.useMemo(() => {
    if (!Array.isArray(salaryHistory) || salaryHistory.length === 0) return [];
    return salaryHistory
      .slice()
      .sort((a: any, b: any) => {
        const dateA = new Date(a.effectiveDate || a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.effectiveDate || b.date || b.createdAt || 0).getTime();
        return dateA - dateB;
      })
      .map((item: any) => {
        const amount = item.newSalary || item.revisedAmount || item.amount || item.salary || 0;
        const label = getMonthLabel(item.effectiveDate || item.date || item.createdAt);
        return {
          value: Number(amount) / 1000,
          label: label || '',
        };
      })
      .filter((d) => d.label);
  }, [salaryHistory]);

  const currentMonthLabel = React.useMemo(() => {
    if (payrollSummary?.periodStartDate && payrollSummary?.periodEndDate) {
      return formatPayrollPeriodLabel(
        payrollSummary.periodStartDate,
        payrollSummary.periodEndDate,
        payrollSummary.payMonthLabel,
      );
    }
    if (salaryData?.salaryMonth && salaryData?.salaryYear) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[salaryData.salaryMonth - 1] || ''} ${salaryData.salaryYear}`.trim();
    }
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [payrollSummary, salaryData]);

  const effectiveCurrency = React.useMemo(() => {
    const candidates = [
      employee?.company?.currency,
      employee?.company?.currencyCode,
      employee?.currency,
      currency,
      salaryStructure?.currency,
      salaryStructure?.currencyCode,
      salaryData?.currency,
      salaryData?.currencyCode,
    ];

    const resolved = candidates.find(
      (value) => typeof value === 'string' && value.trim().length >= 3,
    );

    return normalizeCurrencyCode(resolved || 'USD');
  }, [salaryData, salaryStructure, employee, currency]);

  const lateThreshold = toNumber(payrollRules?.occurrencesBeforeDeduction);
  const lateGraceMinutes = toNumber(payrollRules?.gracePeriodMinutes);
  const lateDeductionAmountPerDay = toNumber(payrollRules?.deductionAmountPerDay);
  const lateCount = toNumber(payrollSummary?.lateCount);
  const deductibleLateDays = toNumber(payrollSummary?.deductibleLateDays ?? Math.max(0, lateCount - lateThreshold));
  const annualSalary = firstPositiveNumber([payrollSummary?.baseSalary, salaryData?.baseSalary, salaryData?.annualSalary]);
  const monthlyGrossSalary = React.useMemo<number>(() => {
    const explicitMonthlyGross = firstPositiveNumber([
      payrollSummary?.monthlyGrossSalary,
      payrollSummary?.grossMonthlySalary,
      payrollSummary?.monthlyGross,
      salaryData?.monthlyGrossSalary,
      salaryData?.grossMonthlySalary,
    ]);
    if (explicitMonthlyGross > 0 && explicitMonthlyGross !== annualSalary) {
      return explicitMonthlyGross;
    }
    if (annualSalary > 0) {
      return annualSalary / 12;
    }
    return firstPositiveNumber([salaryData?.grossSalary, payrollSummary?.periodBaseSalary]);
  }, [annualSalary, payrollSummary, salaryData]);
  const currentMonthPayable = toNumber(payrollSummary?.finalSalary ?? netSalary);
  const approvedLeaveDays = toNumber(payrollSummary?.approvedLeaveDays);
  const deductibleLeaveDays = toNumber(payrollSummary?.leaveDays);
  const absentDays = toNumber(payrollSummary?.absentDays);
  const absenceRuleAmount = getAbsenceRuleAmount(payrollRules);
  const halfDayCount = toNumber(payrollSummary?.halfDayCount);
  const workingDaysCount = toNumber(payrollSummary?.workingDaysCount);
  const presentDays = toNumber(payrollSummary?.presentDays);

  const displayedEarnings = React.useMemo(() => (
    earnings.length > 0
      ? earnings
      : [
        { label: 'Prorated Base Salary', amount: Number(payrollSummary?.periodBaseSalary || 0) },
        { label: 'Allowances', amount: Number(payrollSummary?.totalAllowances || 0) },
      ].filter((item) => item.amount > 0)
  ), [earnings, payrollSummary]);

  const monthlyPayrollDeductions = React.useMemo<DeductionDisplayItem[]>(() => {
    if (!payrollSummary) return [];

    const items: DeductionDisplayItem[] = [
      {
        label: 'Structure Deductions',
        amount: toNumber(payrollSummary.totalDeductions),
        note: 'Recurring salary deductions configured on the salary structure.',
        alwaysShow: false,
      },
      {
        label: 'Late Arrival',
        amount: toNumber(payrollSummary.lateDeduction),
        note: lateThreshold > 0
          ? `Configured: first ${lateThreshold} late arrival${lateThreshold === 1 ? '' : 's'} free, ${formatCurrency(lateDeductionAmountPerDay, effectiveCurrency)} per charged late day after ${lateGraceMinutes} min grace. Calculated: ${lateCount} late arrival${lateCount === 1 ? '' : 's'}, ${deductibleLateDays} charged.`
          : `Configured: deduct immediately after ${lateGraceMinutes} min grace at ${formatCurrency(lateDeductionAmountPerDay, effectiveCurrency)} per charged late day. Calculated: ${lateCount} late arrival${lateCount === 1 ? '' : 's'}, ${deductibleLateDays} charged.`,
        alwaysShow: true,
      },
      {
        label: 'Half Day',
        amount: toNumber(payrollSummary.halfDayDeduction),
        note: `${halfDayCount} half day${halfDayCount === 1 ? '' : 's'} recorded this month.`,
        alwaysShow: false,
      },
      {
        label: 'Leave Deduction',
        amount: toNumber(payrollSummary.extraLeaveDeduction),
        note: `${deductibleLeaveDays} deductible leave day${deductibleLeaveDays === 1 ? '' : 's'} in this payroll period. Approved leave is excluded from absence deductions.`,
        alwaysShow: false,
      },
      {
        label: 'Absence Deduction',
        amount: toNumber(payrollSummary.absenceDeduction),
        note: absenceRuleAmount > 0
          ? `Configured: ${formatCurrency(absenceRuleAmount, effectiveCurrency)} per absent working day. Calculated: ${absentDays} absent working day${absentDays === 1 ? '' : 's'} with no attendance and no approved leave.`
          : `Configured: calculated by payroll policy. Calculated: ${absentDays} absent working day${absentDays === 1 ? '' : 's'} with no attendance and no approved leave.`,
        alwaysShow: true,
      },
    ];

    return items.filter((item) => item.alwaysShow || item.amount > 0);
  }, [
    absenceRuleAmount,
    absentDays,
    deductibleLateDays,
    deductibleLeaveDays,
    effectiveCurrency,
    halfDayCount,
    lateCount,
    lateDeductionAmountPerDay,
    lateGraceMinutes,
    lateThreshold,
    payrollSummary,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Salary Details" />
        <View style={styles.loadingWrap}>
          <View style={styles.loadingHero}>
            <View style={styles.loadingMonth} />
            <View style={styles.loadingAmount} />
            <View style={styles.loadingCaption} />
            <View style={styles.loadingButton} />
          </View>
          <View style={styles.loadingBlock}>
            <View style={styles.loadingBlockTitle} />
            <View style={styles.loadingChart} />
          </View>
          <View style={styles.loadingBlock}>
            <View style={styles.loadingBlockTitle} />
            <View style={styles.loadingRow} />
            <View style={styles.loadingRow} />
            <View style={styles.loadingRowShort} />
          </View>
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="medium" size={13} color={colors.text.secondary} style={styles.loadingText}>
              Loading salary structure...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Salary Details" />
        <Text variant="semibold" size={16} color={colors.error} style={{ marginBottom: 8 }}>
          Error
        </Text>
        <Text variant="regular" size={14} color={colors.text.secondary} style={{ textAlign: 'center', paddingHorizontal: 32 }}>
          {error}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Salary Details" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.mainCard}>
          <Text variant="medium" size={12} color="rgba(255,255,255,0.6)" style={styles.cardMonth}>
            {currentMonthLabel}
          </Text>
          <Text variant="bold" size={42} color="#FFFFFF" style={styles.netAmount}>
            {formatCurrency(currentMonthPayable, effectiveCurrency)}
          </Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)" style={styles.netLabel}>
            CURRENT MONTH PAYABLE
          </Text>

          <Button
            onPress={() => {}}
            title="Download Payslip"
            variant="secondary"
            size="sm"
            icon={<Download size={16} color="#FFFFFF" />}
            style={styles.actionBtn}
          />
        </View>

        {historyChartData.length > 0 && (
          <CustomLineChart
            title="Salary History"
            data={historyChartData}
            yAxisSuffix="k"
            lineColor={colors.success}
            style={styles.chartContainer}
          />
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="semibold" size={15} color={colors.text.primary} style={styles.sectionTitle}>
              Salary Structure
            </Text>
          </View>
          <View style={styles.structureCard}>
            <View style={styles.structureHeader}>
              <View style={styles.structureTitleWrap}>
                <Text variant="bold" size={16} color={colors.text.primary}>
                  {salaryStructure?.name || 'Active Salary Structure'}
                </Text>
                <Text variant="regular" size={12} color={colors.text.secondary}>
                  {salaryStructure?.description || 'Structure details for this employee'}
                </Text>
              </View>
              <View style={styles.structureBadge}>
                <Text variant="semibold" size={10} color={colors.success}>
                  {salaryStructure?.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                </Text>
              </View>
            </View>

            <View style={styles.structureMetaRow}>
              <View style={styles.structureMetaItem}>
                <Text variant="regular" size={11} color={colors.text.muted}>
                  Yearly Salary
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {annualSalary > 0 ? formatCurrency(annualSalary, effectiveCurrency) : '—'}
                </Text>
              </View>
              <View style={styles.structureMetaItem}>
                <Text variant="regular" size={11} color={colors.text.muted}>
                  Monthly Gross
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {monthlyGrossSalary > 0 ? formatCurrency(monthlyGrossSalary, effectiveCurrency) : '—'}
                </Text>
              </View>
              <View style={styles.structureMetaItem}>
                <Text variant="regular" size={11} color={colors.text.muted}>
                  Payable After Deductions
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {currentMonthPayable > 0 ? formatCurrency(currentMonthPayable, effectiveCurrency) : '—'}
                </Text>
              </View>
            </View>

            {structureComponents.length > 0 ? (
              <View style={styles.structureList}>
                {structureComponents.map((component: any, index: number) => (
                  <View
                    key={component.id || `${component.name}-${index}`}
                    style={[
                      styles.structureItem,
                      index === structureComponents.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.structureItemText}>
                      <Text variant="medium" size={13} color={colors.text.primary}>
                        {component.name}
                      </Text>
                      <Text variant="regular" size={11} color={colors.text.muted}>
                        {component.type} · {component.calculationType}
                        {component.calculationType === 'PERCENTAGE'
                          ? ` · ${component.value}%`
                          : ` · ${formatCurrency(component.value, effectiveCurrency)}`}
                        {component.isTaxable ? ' · taxable' : ''}
                      </Text>
                    </View>
                    <Text variant="semibold" size={13} color={colors.text.primary}>
                      {component.calculationType === 'PERCENTAGE'
                        ? `${component.value}%`
                        : formatCurrency(component.value, effectiveCurrency)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text variant="regular" size={12} color={colors.text.muted} style={{ marginTop: 12 }}>
                No salary structure components were returned for this employee.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.success} />
            <Text variant="semibold" size={15} color={colors.text.primary} style={styles.sectionTitle}>
              Earnings
            </Text>
          </View>
          <View style={styles.listCard}>
            {displayedEarnings.map((item: any, index: number) => (
              <View key={index} style={[styles.listItem, index === displayedEarnings.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="regular" size={13} color={colors.text.secondary}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {formatCurrency(item.amount, effectiveCurrency)}
                </Text>
              </View>
            ))}
            <View style={[styles.listItem, styles.totalItem]}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                Gross Earnings
              </Text>
              <Text variant="bold" size={14} color={colors.success}>
                {formatCurrency(grossEarnings, effectiveCurrency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          {payrollSummary && (
            <View style={styles.infoCard}>
              <Text variant="semibold" size={12} color={colors.text.primary}>
                Attendance summary
              </Text>
              <Text variant="regular" size={12} color={colors.text.secondary} style={styles.infoCardText}>
                {`${presentDays}/${workingDaysCount} working days present, ${approvedLeaveDays} approved leave, ${absentDays} absences, ${lateCount} late arrivals, ${halfDayCount} half days.`}
              </Text>
            </View>
          )}
          <View style={styles.sectionHeader}>
            <TrendingDown size={18} color={colors.error} />
            <Text variant="semibold" size={15} color={colors.error} style={styles.sectionTitle}>
              Deductions
            </Text>
          </View>
          {payrollRules && (
            <View style={styles.infoCard}>
              <Text variant="semibold" size={12} color={colors.text.primary}>
                Current late rule
              </Text>
              <Text variant="regular" size={12} color={colors.text.secondary} style={styles.infoCardText}>
                {lateThreshold > 0
                  ? `After ${lateThreshold} late arrival${lateThreshold === 1 ? '' : 's'} in a month, ${formatCurrency(lateDeductionAmountPerDay, effectiveCurrency)} is deducted per charged late day after a ${lateGraceMinutes} minute grace period.`
                  : `Late arrivals start deducting immediately after the ${lateGraceMinutes} minute grace period at ${formatCurrency(lateDeductionAmountPerDay, effectiveCurrency)} per charged late day.`}
              </Text>
            </View>
          )}
          <View style={styles.listCard}>
            {monthlyPayrollDeductions.map((item: any, index: number) => (
              <View key={item.label} style={[styles.listItemTall, index === monthlyPayrollDeductions.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.listItemTextWrap}>
                  <Text variant="regular" size={13} color={colors.text.secondary}>
                    {item.label}
                  </Text>
                  <Text variant="regular" size={11} color={colors.text.muted} style={styles.listItemNote}>
                    {item.note}
                  </Text>
                </View>
                <Text variant="semibold" size={13} color={colors.error}>
                  {formatCurrency(item.amount, effectiveCurrency)}
                </Text>
              </View>
            ))}
            {monthlyPayrollDeductions.length === 0 && (
              <Text variant="regular" size={12} color={colors.text.muted}>
                No deductions were recorded for this month.
              </Text>
            )}
            <View style={[styles.listItem, styles.totalItem]}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                Total Deductions
              </Text>
              <Text variant="bold" size={14} color={colors.error}>
                {formatCurrency(totalDeductions, effectiveCurrency)}
              </Text>
            </View>
          </View>
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
    padding: 14,
    paddingTop: 6,
    paddingBottom: 32,
  },
  mainCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  cardMonth: {
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netAmount: {
    marginBottom: 4,
    lineHeight: 44,
  },
  netLabel: {
    marginBottom: 16,
    letterSpacing: 0.6,
  },
  actionBtn: {
    minWidth: 150,
    height: 40,
    borderRadius: 10,
  },
  chartContainer: {
    marginBottom: 14,
  },
  loadingWrap: {
    padding: 14,
    paddingTop: 6,
  },
  loadingHero: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  loadingMonth: {
    width: 92,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  loadingAmount: {
    width: '72%',
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginBottom: 10,
  },
  loadingCaption: {
    width: 136,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginBottom: 18,
  },
  loadingButton: {
    width: 148,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  loadingBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 16,
    marginBottom: 14,
  },
  loadingBlockTitle: {
    width: 128,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#ECECEC',
    marginBottom: 14,
  },
  loadingChart: {
    height: 220,
    borderRadius: 16,
    backgroundColor: '#F6F6F6',
  },
  loadingRow: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    marginBottom: 10,
  },
  loadingRowShort: {
    width: '74%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  loadingText: {
    marginLeft: 10,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionTitle: {
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 14,
    marginBottom: 10,
  },
  infoCardText: {
    marginTop: 6,
    lineHeight: 18,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  structureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 14,
  },
  structureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  structureTitleWrap: {
    flex: 1,
  },
  structureBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F8EF',
  },
  structureMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  structureMetaItem: {
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 10,
  },
  structureList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  structureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  structureItemText: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemTall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  listItemTextWrap: {
    flex: 1,
  },
  listItemNote: {
    marginTop: 4,
    lineHeight: 16,
  },
  totalItem: {
    borderBottomWidth: 0,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
