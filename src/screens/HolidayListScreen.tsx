import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Calendar } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';

export default function HolidayListScreen({ navigation }: any) {
  const holidays = [
    { name: "New Year's Day", date: "01 Jan 2024", day: "Monday" },
    { name: "Martin Luther King Jr. Day", date: "15 Jan 2024", day: "Monday" },
    { name: "Presidents' Day", date: "19 Feb 2024", day: "Monday" },
    { name: "Memorial Day", date: "27 May 2024", day: "Monday" },
    { name: "Independence Day", date: "04 Jul 2024", day: "Thursday" },
    { name: "Labor Day", date: "02 Sep 2024", day: "Monday" },
    { name: "Veterans Day", date: "11 Nov 2024", day: "Monday" },
    { name: "Thanksgiving Day", date: "28 Nov 2024", day: "Thursday" },
    { name: "Christmas Day", date: "25 Dec 2024", day: "Wednesday" },
    { name: "New Year's Eve", date: "31 Dec 2024", day: "Tuesday" },
  ];

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.holidayItem}>
      <View style={styles.dateContainer}>
        <Text variant="bold" size={18} color={colors.secondary}>
          {item.date.split(' ')[0]}
        </Text>
        <Text variant="semibold" size={12} color={colors.secondary} style={styles.monthText}>
          {item.date.split(' ')[1]}
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
      <ScreenHeader title="Holidays 2024" onBack={() => navigation.goBack()} />
      <FlatList
        data={holidays}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
