import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Flag, Heart } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { STORAGE_KEYS } from '../config/apiConfig';
import { normalizeEmployeeData } from '../utils/employeeData';

export default function PersonalInfoScreen({ navigation }: any) {
  const [employee, setEmployee] = useState<any>(null);

  const loadEmployee = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      if (cached) {
        setEmployee(normalizeEmployeeData(JSON.parse(cached)));
      }
    } catch (error) {
      console.error('PersonalInfo load error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEmployee();
    }, [loadEmployee])
  );

  const fullName = employee
    ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.accountName || '—'
    : '—';

  const infoItems = [
    { icon: User, label: 'Full Name', value: fullName },
    { icon: Mail, label: 'Email Address', value: employee?.email || '—' },
    { icon: Phone, label: 'Phone Number', value: employee?.phone || '—' },
    { icon: MapPin, label: 'Address', value: employee?.address || '—' },
    { icon: Calendar, label: 'Date of Birth', value: employee?.dob || '—' },
    { icon: Flag, label: 'Nationality', value: employee?.nationality || '—' },
    { icon: Heart, label: 'Gender', value: employee?.gender || '—' },
    { icon: Briefcase, label: 'Joining Date', value: employee?.joiningDate || '—' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Personal Information" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {infoItems.map((item, index) => (
            <View key={index} style={[styles.infoItem, index === infoItems.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.iconContainer}>
                <item.icon size={20} color={colors.secondary} />
              </View>
              <View style={styles.itemContent}>
                <Text variant="regular" size={12} color={colors.text.muted} style={styles.label}>
                  {item.label}
                </Text>
                <Text variant="semibold" size={15} color={colors.text.primary}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
  label: {
    marginBottom: 0,
  },
});
