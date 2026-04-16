import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Briefcase, Building2, MapPin, Globe, Users, Calendar } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';

export default function CompanyDetailsScreen({ navigation }: any) {
  const companyInfo = [
    { icon: Building2, label: 'Company Name', value: 'OnePath Innovations' },
    { icon: Briefcase, label: 'Department', value: 'Engineering' },
    { icon: Users, label: 'Manager', value: 'Sarah Johnson' },
    { icon: MapPin, label: 'Work Location', value: 'New York HQ' },
    { icon: Globe, label: 'Company Website', value: 'www.onepath.com' },
    { icon: Calendar, label: 'Employment Type', value: 'Full-time' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Company Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Building2 size={32} color={colors.secondary} />
          </View>
          <Text variant="bold" size={20} color={colors.text.primary}>OnePath Innovations</Text>
          <Text variant="medium" size={14} color={colors.text.secondary}>Software & Technology</Text>
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

        <View style={styles.noticeBox}>
          <Text variant="medium" size={12} color={colors.text.secondary} style={styles.noticeText}>
            For any changes in company records, please contact the HR department.
          </Text>
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
