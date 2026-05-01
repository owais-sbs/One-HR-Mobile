import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  LogOut,
  ChevronRight,
  Settings,
  Bell,
  Calendar,
  Award,
  Building2
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { STORAGE_KEYS, API_ENDPOINTS, CACHE_TTL } from '../config/apiConfig';
import apiClient from '../api/apiClient';
import { normalizeEmployeeData } from '../utils/employeeData';

const MenuItem = ({ icon: Icon, label, subtitle, color, action, showChevron = true, destructive = false }: any) => (
  <Pressable
    onPress={action}
    style={({ pressed }) => [
      styles.menuItem,
      pressed && styles.menuItemPressed,
    ]}
  >
    <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
      <Icon size={18} color={destructive ? colors.error : color} strokeWidth={2} />
    </View>
    <View style={styles.menuContent}>
      <Text variant="medium" size={14} color={destructive ? colors.error : colors.text.primary}>
        {label}
      </Text>
      {subtitle && (
        <Text variant="regular" size={12} color={colors.text.muted}>
          {subtitle}
        </Text>
      )}
    </View>
    {showChevron && (
      <ChevronRight size={16} color={colors.text.muted} strokeWidth={2} />
    )}
  </Pressable>
);

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '??';
}

function calculateTenure(joiningDate?: string) {
  if (!joiningDate) return '-';
  const start = new Date(joiningDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (diffYears < 1) {
    const months = Math.round(diffYears * 12);
    return `${months} mos`;
  }
  const years = Math.floor(diffYears);
  const months = Math.round((diffYears - years) * 12);
  return months > 0 ? `${years}.${Math.round(months / 12 * 10) / 1} yrs` : `${years} yrs`;
}

export default function ProfileScreen({ navigation }: any) {
  const [employee, setEmployee] = useState<any>(null);
  const [department, setDepartment] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE_CACHE);
      await AsyncStorage.removeItem(STORAGE_KEYS.DEPARTMENT_CACHE);
    } else {
      setLoading(true);
    }
    try {
      const [rolesJson] = await AsyncStorage.multiGet([
        STORAGE_KEYS.USER_ROLES,
      ]);

      const parsedRoles = rolesJson[1] ? JSON.parse(rolesJson[1]) : [];
      setRoles(parsedRoles);

      if (!forceRefresh) {
        const cachedProfile = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_CACHE);
        if (cachedProfile) {
          const { data, timestamp } = JSON.parse(cachedProfile);
          if (Date.now() - timestamp < CACHE_TTL.PROFILE) {
            const employeeData = normalizeEmployeeData(data);
            setEmployee(employeeData);
            if (employeeData?.departmentId) {
              const cachedDept = await AsyncStorage.getItem(STORAGE_KEYS.DEPARTMENT_CACHE);
              if (cachedDept) {
                const { data: deptData, timestamp: deptTs } = JSON.parse(cachedDept);
                if (Date.now() - deptTs < CACHE_TTL.DEPARTMENT) {
                  setDepartment(deptData);
                }
              }
            }
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }
      }

      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.ME);
      const freshEmployee = normalizeEmployeeData(response.data);
      if (freshEmployee) {
        setEmployee(freshEmployee);
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_CACHE, JSON.stringify({
          data: freshEmployee,
          timestamp: Date.now(),
        }));

        if (freshEmployee.departmentId) {
          const cachedDept = await AsyncStorage.getItem(STORAGE_KEYS.DEPARTMENT_CACHE);
          let useCachedDept = false;
          if (cachedDept) {
            const { data: deptData, timestamp: deptTs } = JSON.parse(cachedDept);
            if (Date.now() - deptTs < CACHE_TTL.DEPARTMENT) {
              setDepartment(deptData);
              useCachedDept = true;
            }
          }
          if (!useCachedDept) {
            try {
              const deptResponse = await apiClient.get(API_ENDPOINTS.DEPARTMENTS.BY_ID(freshEmployee.departmentId));
              if (deptResponse.data?.name) {
                setDepartment(deptResponse.data.name);
                await AsyncStorage.setItem(STORAGE_KEYS.DEPARTMENT_CACHE, JSON.stringify({
                  data: deptResponse.data.name,
                  timestamp: Date.now(),
                }));
              }
            } catch (e) {
              // ignore department fetch errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    loadProfile(true);
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.AUTH_TOKEN,
                STORAGE_KEYS.USER_ID,
                STORAGE_KEYS.USER_DATA,
                STORAGE_KEYS.USER_ROLES,
                STORAGE_KEYS.EMPLOYEE_DATA,
              ]);
              navigation.navigate('Login');
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  const menuSections = [
    {
      title: 'Personal',
      items: [
        {
          icon: User,
          label: 'Personal Information',
          subtitle: 'Update your details',
          color: colors.secondary,
          action: () => navigation.navigate('PersonalInfo'),
        },
        {
          icon: Building2,
          label: 'Company Details',
          subtitle: 'Department, team & role',
          color: '#7c3aed',
          action: () => navigation.navigate('CompanyDetails'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          label: 'Notifications',
          subtitle: 'Manage alerts & sounds',
          color: colors.warning,
          action: () => navigation.navigate('Notifications'),
        },
        {
          icon: Shield,
          label: 'Security',
          subtitle: 'Password & authentication',
          color: colors.success,
          action: () => navigation.navigate('Security'),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: LogOut,
          label: 'Sign Out',
          color: colors.error,
          action: handleSignOut,
          showChevron: false,
          destructive: true,
        },
      ],
    },
  ];

  const fullName = employee
    ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.accountName || 'Employee'
    : '...';

  const displayRole = roles.length > 0 ? roles[0] : 'Employee';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Profile"
        rightAction={
          <Pressable onPress={() => {}} style={styles.settingsBtn}>
            <Settings size={20} color={colors.text.secondary} strokeWidth={2} />
          </Pressable>
        }
      />
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
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text variant="bold" size={24} color="#FFFFFF">
                {getInitials(employee?.firstName, employee?.lastName)}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="bold" size={18} color={colors.text.primary}>
                {fullName}
              </Text>
              <Text variant="regular" size={13} color={colors.text.secondary}>
                {displayRole}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Calendar size={14} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="semibold" size={12} color={colors.text.primary}>
                {calculateTenure(employee?.joiningDate)}
              </Text>
              <Text variant="regular" size={10} color={colors.text.muted}>Tenure</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Building2 size={14} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="semibold" size={12} color={colors.text.primary}>
                {department || '—'}
              </Text>
              <Text variant="regular" size={10} color={colors.text.muted}>Department</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Award size={14} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="semibold" size={12} color={colors.text.primary}>
                {employee?.leaveBalance ?? '—'}
              </Text>
              <Text variant="regular" size={10} color={colors.text.muted}>Leave Balance</Text>
            </View>
          </View>
        </View>

        <View style={styles.contactCard}>
          <Text variant="semibold" size={12} color={colors.text.muted} style={styles.contactTitle}>
            CONTACT
          </Text>
          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}>
                <Mail size={15} color={colors.success} strokeWidth={2} />
              </View>
              <Text variant="regular" size={13} color={colors.text.secondary} style={styles.contactText}>
                {employee?.email || '—'}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
                <Phone size={15} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="regular" size={13} color={colors.text.secondary} style={styles.contactText}>
                {employee?.phone || '—'}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: '#F5F3FF' }]}>
                <MapPin size={15} color="#7c3aed" strokeWidth={2} />
              </View>
              <Text variant="regular" size={13} color={colors.text.secondary} style={styles.contactText}>
                {employee?.address || employee?.nationality || '—'}
              </Text>
            </View>
          </View>
        </View>

        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text variant="semibold" size={12} color={colors.text.muted} style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <MenuItem {...item} />
                  {itemIndex < section.items.length - 1 && <View style={styles.menuDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  settingsBtn: {
    padding: 4,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  statIconWrap: {
    marginBottom: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  contactTitle: {
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  contactRow: {
    gap: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  menuSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuItemPressed: {
    backgroundColor: '#F8F8F8',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F4F4F5',
    marginLeft: 62,
  },
});
