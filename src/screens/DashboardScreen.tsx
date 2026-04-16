import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import {
  Calendar,
  ChevronRight,
  LogIn,
  LogOut,
  TrendingUp,
  UserCheck
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { LeaveCard } from '../components/ui/LeaveCard';
import { CustomBarChart } from '../components/ui/CustomBarChart';
import { CustomPieChart } from '../components/ui/CustomPieChart';

export default function DashboardScreen({ navigation }: any) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const leaveBalances = [
    { type: 'Annual Leave', left: 8, total: 12, color: colors.secondary },
    { type: 'Sick Leave', left: 8, total: 10, color: colors.success },
    { type: 'Casual Leave', left: 4, total: 5, color: colors.warning },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text variant="medium" size={10} color={colors.text.muted} style={styles.greetingLabel}>
              Good Morning
            </Text>
            <Text variant="bold" size={18} color={colors.text.primary}>
              Kiran Loka
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            style={({ pressed }) => [
              styles.avatar,
              { opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Text variant="semibold" size={12} color={colors.text.primary}>KL</Text>
          </Pressable>
        </View>

        <View style={styles.clockCard}>
          <View style={styles.dateBadge}>
            <Calendar size={11} color="rgba(255,255,255,0.7)" />
            <Text variant="regular" size={10} color="rgba(255,255,255,0.7)" style={styles.dateText}>
              {dateStr}
            </Text>
          </View>
          <Text variant="bold" size={32} color="#FFFFFF" style={styles.timeText}>
            {timeStr}
          </Text>

          <Button
            onPress={() => setIsClockedIn(!isClockedIn)}
            title={isClockedIn ? "Clock Out" : "Clock In"}
            variant={isClockedIn ? "danger" : "secondary"}
            size="sm"
            icon={isClockedIn ? <LogOut size={14} color="#fff" /> : <LogIn size={14} color="#fff" />}
            style={styles.clockButton}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <StatCard
              label="On Leave"
              value="8 Days"
              description="This year total"
              color={colors.secondary}
              icon={<TrendingUp size={16} color={colors.secondary} />}
            />
          </View>
          <View style={styles.statGap} />
          <View style={styles.statItem}>
            <StatCard
              label="Present"
              value="22 Days"
              description="Current month"
              color={colors.success}
              icon={<UserCheck size={16} color={colors.success} />}
            />
          </View>
        </View>

        <View style={styles.chartsSection}>
          <CustomPieChart
            title="Leave Distribution"
            data={[
              { value: 12, color: colors.secondary, label: 'Annual' },
              { value: 8, color: colors.success, label: 'Sick' },
              { value: 4, color: colors.warning, label: 'Casual' },
            ]}
          />

          <CustomBarChart
            title="Weekly Activity"
            data={[
              { value: 8, label: "Mon" },
              { value: 9, label: "Tue" },
              { value: 8.5, label: "Wed" },
              { value: 9.8, label: "Thu" },
              { value: 7.5, label: "Fri" },
            ]}
            yAxisSuffix="h"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="semibold" size={14} color={colors.text.primary}>
              Leave Balances
            </Text>
            <Pressable onPress={() => navigation.navigate('ApplyLeave')}>
              <Text variant="medium" size={11} color={colors.secondary}>
                + Apply Leave
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {leaveBalances.map((leave, index) => (
              <LeaveCard
                key={index}
                label={leave.type}
                left={leave.left}
                total={leave.total}
                color={leave.color}
                style={index < leaveBalances.length - 1 ? styles.leaveCardMargin : undefined}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="semibold" size={14} color={colors.text.primary}>
              Upcoming Holidays
            </Text>
            <Pressable onPress={() => navigation.navigate('HolidayList')}>
              <Text variant="medium" size={11} color={colors.secondary}>
                See All
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.holidayItem,
              pressed && styles.holidayItemPressed
            ]}
            onPress={() => navigation.navigate('HolidayList')}
          >
            <View style={[styles.holidayIcon, { backgroundColor: colors.accent.blue }]}>
              <Calendar size={16} color={colors.secondary} />
            </View>
            <View style={styles.itemContent}>
              <Text variant="semibold" size={13} color={colors.text.primary}>
                New Year's Eve
              </Text>
              <Text variant="regular" size={11} color={colors.text.secondary}>
                31 Dec 2024
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.muted} />
          </Pressable>
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
    padding: 12,
    paddingTop: 6,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: {
    gap: 1,
  },
  greetingLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  clockCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dateText: {
    letterSpacing: 0.2,
  },
  timeText: {
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  clockButton: {
    width: '100%',
    borderRadius: 10,
    height: 40,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statGap: {
    width: 10,
  },
  chartsSection: {
    gap: 10,
    marginBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalScroll: {
    paddingRight: 12,
  },
  leaveCardMargin: {
    marginRight: 10,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  holidayItemPressed: {
    backgroundColor: '#F8F8F8',
  },
  holidayIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
  },
});
