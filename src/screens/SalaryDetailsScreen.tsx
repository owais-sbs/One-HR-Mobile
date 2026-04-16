import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Download, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Button } from '../components/ui/Button';
import { CustomLineChart } from '../components/ui/CustomLineChart';
import { CustomRadarChart } from '../components/ui/CustomRadarChart';

export default function SalaryDetailsScreen() {
  const breakdown = [
    { label: 'Basic Salary', value: '$4,500.00', amount: 4500 },
    { label: 'House Rent', value: '$1,200.00', amount: 1200 },
    { label: 'Conveyance', value: '$300.00', amount: 300 },
    { label: 'Medical', value: '$200.00', amount: 200 },
    { label: 'Special', value: '$500.00', amount: 500 },
  ];

  const radarData = [
    { label: 'Basic', value: 4500, max: 5000 },
    { label: 'HRA', value: 1200, max: 2000 },
    { label: 'Conv.', value: 300, max: 500 },
    { label: 'Medical', value: 200, max: 500 },
    { label: 'Special', value: 500, max: 1000 },
  ];

  const deductions = [
    { label: 'Provident Fund', value: '$450.00' },
    { label: 'Professional Tax', value: '$20.00' },
    { label: 'Income Tax', value: '$300.00' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Salary Details" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text variant="medium" size={12} color="rgba(255,255,255,0.6)" style={styles.cardMonth}>
            April 2024
          </Text>
          <Text variant="bold" size={42} color="#FFFFFF" style={styles.netAmount}>
            $5,930.00
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

        <CustomLineChart
          title="Salary History"
          data={[
            { value: 5.2, label: "Dec" },
            { value: 5.5, label: "Jan" },
            { value: 5.8, label: "Feb" },
            { value: 5.7, label: "Mar" },
            { value: 5.93, label: "Apr" },
          ]}
          yAxisSuffix="k"
          lineColor={colors.success}
          style={styles.chartContainer}
        />

        <CustomRadarChart
          title="Salary Component Analysis"
          data={radarData}
          style={styles.chartContainer}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.success} />
            <Text variant="semibold" size={15} color={colors.text.primary} style={styles.sectionTitle}>
              Earnings
            </Text>
          </View>
          <View style={styles.listCard}>
            {breakdown.map((item, index) => (
              <View key={index} style={[styles.listItem, index === breakdown.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="regular" size={13} color={colors.text.secondary}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={13} color={colors.text.primary}>
                  {item.value}
                </Text>
              </View>
            ))}
            <View style={[styles.listItem, styles.totalItem]}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                Gross Earnings
              </Text>
              <Text variant="bold" size={14} color={colors.success}>
                $6,700.00
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
            {deductions.map((item, index) => (
              <View key={index} style={[styles.listItem, index === deductions.length - 1 && { borderBottomWidth: 0 }]}>
                <Text variant="regular" size={13} color={colors.text.secondary}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={13} color={colors.error}>
                  {item.value}
                </Text>
              </View>
            ))}
            <View style={[styles.listItem, styles.totalItem]}>
              <Text variant="semibold" size={14} color={colors.text.primary}>
                Total Deductions
              </Text>
              <Text variant="bold" size={14} color={colors.error}>
                $770.00
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
});
