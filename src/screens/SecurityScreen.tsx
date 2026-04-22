import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { ShieldCheck, Eye, EyeOff, Fingerprint, Smartphone } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Button } from '../components/ui/Button';

export default function SecurityScreen({ navigation }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Security" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <ShieldCheck size={32} color={colors.success} />
          </View>
          <View style={styles.bannerText}>
            <Text variant="bold" size={16} color={colors.text.primary}>Your account is secure</Text>
            <Text variant="medium" size={12} color={colors.text.secondary}>Last changed 3 months ago</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="bold" size={16} color={colors.text.primary} style={styles.sectionTitle}>
            Update Password
          </Text>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text variant="medium" size={12} color={colors.text.secondary} style={styles.label}>
                Current Password
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPass}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                />
                <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeIcon}>
                  {showPass ? <EyeOff size={18} color={colors.text.muted} /> : <Eye size={18} color={colors.text.muted} />}
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text variant="medium" size={12} color={colors.text.secondary} style={styles.label}>
                New Password
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPass}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                />
              </View>
            </View>

            <Button
              onPress={() => {}}
              title="Change Password"
              variant="primary"
              style={styles.updateButton}
            />
          </View>
        </View>

        <Text variant="bold" size={16} color={colors.text.primary} style={styles.sectionTitle}>
          More Options
        </Text>
        
        <View style={styles.optionCard}>
          <View style={styles.optionItem}>
            <View style={[styles.iconBox, { backgroundColor: colors.accent.blue }]}>
              <Fingerprint size={20} color={colors.secondary} />
            </View>
            <View style={styles.optionContent}>
              <Text variant="bold" size={14} color={colors.text.primary}>Biometric Login</Text>
              <Text variant="medium" size={11} color={colors.text.secondary}>Use FaceID or Fingerprint</Text>
            </View>
            <View style={styles.toggleActive} />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.optionItem}>
            <View style={[styles.iconBox, { backgroundColor: colors.accent.amber }]}>
              <Smartphone size={20} color={colors.warning} />
            </View>
            <View style={styles.optionContent}>
              <Text variant="bold" size={14} color={colors.text.primary}>Two-Factor Auth</Text>
              <Text variant="medium" size={11} color={colors.text.secondary}>Secure with SMS or Email</Text>
            </View>
            <Pressable style={styles.setupBtn}>
              <Text variant="bold" size={11} color={colors.secondary}>SETUP</Text>
            </Pressable>
          </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.green,
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  bannerText: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    marginLeft: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    height: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.text.primary,
  },
  eyeIcon: {
    padding: 12,
  },
  updateButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
  },
  optionCard: {
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
  toggleActive: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.success,
  },
  setupBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.accent.blue,
  }
});
