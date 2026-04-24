import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Download, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Button } from '../components/ui/Button';
import { CustomLineChart } from '../components/ui/CustomLineChart';
import { CustomRadarChart } from '../components/ui/CustomRadarChart';
import apiClient from '../api/apiClient';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/apiConfig';
import { normalizeEmployeeData } from '../utils/employeeData';

function unwrapApiData(response: any) {
  return response?.data?.data ?? response?.data ?? null;
}

function formatCurrency(amount?: number, currency = 'USD') {
  if (amount == null || isNaN(amount)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function getMonthLabel(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export default function SalaryDetailsScreen() {
  const [employee, setEmployee] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchSalaryDetails = useCallback(async () => {
    if (!employee) return;

    const employeeCandidates = [employee?.id, employee?.employeeId, employee?.employeeToken]
      .filter((value) => value != null && value !== '');

    if (employeeCandidates.length === 0) {
      setError('Employee identifier not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let salaryRecord: any = null;
      let resolvedEmployeeId: number | string | null = null;
      let lastSalaryError: any = null;

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

      const salaryStructureId = salaryRecord?.salaryStructureId || employee?.salaryStructureId;
      const companyId = salaryRecord?.companyId || employee?.companyId;

      if (salaryStructureId) {
        try {
          const structureResponse = await apiClient.get(
            API_ENDPOINTS.SALARY_STRUCTURES.BY_ID(salaryStructureId)
          );
          setSalaryStructure(unwrapApiData(structureResponse));
        } catch (structureError) {
          console.error('SalaryDetails structure fetch error:', structureError);
          setSalaryStructure(null);
        }
      } else if (companyId) {
        try {
          const structureResponse = await apiClient.get(
            API_ENDPOINTS.SALARY_STRUCTURES.ACTIVE_BY_COMPANY(companyId)
          );
          const structureData = unwrapApiData(structureResponse);
          setSalaryStructure(Array.isArray(structureData) ? structureData[0] || null : structureData);
        } catch (structureError) {
          console.error('SalaryDetails active structure fetch error:', structureError);
          setSalaryStructure(null);
        }
      } else {
        setSalaryStructure(null);
      }

      // Fetch salary history / revisions
      try {
        const historyResponse = await apiClient.get(
          API_ENDPOINTS.SALARY_REVISIONS.BY_EMPLOYEE(resolvedEmployeeId || employeeCandidates[0])
        );
        const historyData = unwrapApiData(historyResponse);
        if (Array.isArray(historyData)) {
          setSalaryHistory(historyData);
        } else if (historyData && Array.isArray(historyData.content)) {
          setSalaryHistory(historyData.content);
        } else {
          setSalaryHistory([]);
        }
      } catch {
        // If history fetch fails, just set empty history so chart is hidden
        setSalaryHistory([]);
      }
    } catch (err: any) {
      console.error('SalaryDetails fetch error:', err);
      setError(err?.response?.data?.message || 'Failed to load salary details');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useFocusEffect(
    useCallback(() => {
      loadEmployee();
    }, [loadEmployee])
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
    // Fallback to static data if API doesn't return components yet
    return [
      { label: 'Basic Salary', amount: 4500 },
      { label: 'House Rent', amount: 1200 },
      { label: 'Conveyance', amount: 300 },
      { label: 'Medical', amount: 200 },
      { label: 'Special', amount: 500 },
    ];
  }, [salaryData]);

  // Derive deductions from salary data
  const deductions = React.useMemo(() => {
    const deds = salaryData?.deductions || [];
    if (Array.isArray(deds) && deds.length > 0) {
      return deds.map((d: any) => ({
        label: d.label || d.name || d.deductionName || 'Deduction',
        amount: typeof d.amount === 'number' ? d.amount : parseFloat(d.amount || 0),
      }));
    }
    return [
      { label: 'Provident Fund', amount: 450 },
      { label: 'Professional Tax', amount: 20 },
      { label: 'Income Tax', amount: 300 },
    ];
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
    if (salaryData?.grossSalary != null) return Number(salaryData.grossSalary);
    return earnings.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }, [salaryData, earnings]);

  const totalDeductions = React.useMemo(() => {
    if (salaryData?.totalDeductions != null) return Number(salaryData.totalDeductions);
    return deductions.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }, [salaryData, deductions]);

  const netSalary = React.useMemo(() => {
    if (salaryData?.netSalary != null) return Number(salaryData.netSalary);
    return grossEarnings - totalDeductions;
  }, [salaryData, grossEarnings, totalDeductions]);

  const radarData = React.useMemo(() => {
    return earnings.map((e: any) => ({
      label: e.label.substring(0, 5),
      value: e.amount || 0,
      max: Math.max(e.amount * 1.2, 1000),
    }));
  }, [earnings]);

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
    if (salaryData?.salaryMonth && salaryData?.salaryYear) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[salaryData.salaryMonth - 1] || ''} ${salaryData.salaryYear}`.trim();
    }
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [salaryData]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Salary Details" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="medium" size={14} color={colors.text.secondary} style={{ marginTop: 12 }}>
          Loading salary details...
        </Text>
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text variant="medium" size={12} color="rgba(255,255,255,0.6)" style={styles.cardMonth}>
            {currentMonthLabel}
          </Text>
          <Text variant="bold" size={42} color="#FFFFFF" style={styles.netAmount}>
            {formatCurrency(netSalary)}
          </Text>
          <Text variant="medium" size={11} color="rgba(255,255,255,0.6)" style={styles.netLabel}>
            NET SALARY PAYABLE
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

        <CustomRadarChart
          title="Salary Component Analysis"
          data={radarData}
          style={styles.chartContainer}
        />

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
                  Base Amount
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {salaryStructure?.baseAmount != null ? `${salaryStructure.baseAmount}%` : '—'}
                </Text>
              </View>
              <View style={styles.structureMetaItem}>
                <Text variant="regular" size={11} color={colors.text.muted}>
                  Components
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {structureComponents.length}
                </Text>
              </View>
              <View style={styles.structureMetaItem}>
                <Text variant="regular" size={11} color={colors.text.muted}>
                  Structure ID
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {salaryData?.salaryStructureId || salaryStructure?.id || '—'}
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
                          : ` · ${formatCurrency(component.value, salaryData?.currency || 'USD')}`}
                        {component.isTaxable ? ' · taxable' : ''}
                      </Text>
                    </View>
                    <Text variant="semibold" size={13} color={colors.text.primary}>
                      {component.calculationType === 'PERCENTAGE'
                        ? `${component.value}%`
                        : formatCurrency(component.value, salaryData?.currency || 'USD')}
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
            {earnings.map((item: any, index: number) => (
              <View key={index} style={[styles.listItem, index === earnings.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="regular" size={13} color={colors.text.secondary}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
            <View style={[styles.listItem, styles.totalItem]}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                Gross Earnings
              </Text>
              <Text variant="bold" size={14} color={colors.success}>
                {formatCurrency(grossEarnings)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingDown size={18} color={colors.error} />
            <Text variant="semibold" size={15} color={colors.error} style={styles.sectionTitle}>
              Deductions
            </Text>
          </View>
          <View style={styles.listCard}>
            {deductions.map((item: any, index: number) => (
              <View key={index} style={[styles.listItem, index === deductions.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="regular" size={13} color={colors.text.secondary}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={13} color={colors.error}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
            <View style={[styles.listItem, styles.totalItem]}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                Total Deductions
              </Text>
              <Text variant="bold" size={14} color={colors.error}>
                {formatCurrency(totalDeductions)}
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
  totalItem: {
    borderBottomWidth: 0,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
