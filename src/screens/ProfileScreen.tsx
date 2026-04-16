import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Clock,
  Award,
  Building2
} from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { StatCard } from '../components/ui/StatCard';

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  subtitle?: string;
  color: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}

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

export default function ProfileScreen({ navigation }: any) {
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
          action: () => navigation.navigate('Login'),
          showChevron: false,
          destructive: true,
        },
      ],
    },
  ];

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text variant="bold" size={24} color="#FFFFFF">KL</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text variant="bold" size={18} color={colors.text.primary}>
                Kiran Loka
              </Text>
              <Text variant="regular" size={13} color={colors.text.secondary}>
                Senior Software Engineer
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Calendar size={14} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="semibold" size={12} color={colors.text.primary}>2.5 yrs</Text>
              <Text variant="regular" size={10} color={colors.text.muted}>Tenure</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Building2 size={14} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="semibold" size={12} color={colors.text.primary}>Engineering</Text>
              <Text variant="regular" size={10} color={colors.text.muted}>Department</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Award size={14} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="semibold" size={12} color={colors.text.primary}>Level 3</Text>
              <Text variant="regular" size={10} color={colors.text.muted}>Grade</Text>
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
                kiran.loka@company.com
              </Text>
            </View>
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
                <Phone size={15} color={colors.secondary} strokeWidth={2} />
              </View>
              <Text variant="regular" size={13} color={colors.text.secondary} style={styles.contactText}>
                +1 (555) 000-1234
              </Text>
            </View>
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: '#F5F3FF' }]}>
                <MapPin size={15} color="#7c3aed" strokeWidth={2} />
              </View>
              <Text variant="regular" size={13} color={colors.text.secondary} style={styles.contactText}>
                New York, USA
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
