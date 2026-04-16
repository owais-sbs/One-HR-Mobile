import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Shield } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          centerContent
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Shield size={48} color={colors.primary} />
            </View>
            <Text variant="bold" size={32} color={colors.text.primary} style={styles.title}>
              One HR
            </Text>
            <Text variant="regular" size={16} color={colors.text.secondary} align="center">
              Elevate your workforce management with intelligence.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text variant="medium" size={14} color={colors.text.secondary} style={styles.label}>
                Email Address
              </Text>
              <TextInput
                style={styles.input}
                placeholder="john@company.com"
                placeholderTextColor={colors.text.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="medium" size={14} color={colors.text.secondary} style={styles.label}>
                Password
              </Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.forgotContainer}>
              <Text variant="medium" size={14} color={colors.secondary}>
                Forgot Password?
              </Text>
            </View>

            <Button
              onPress={() => navigation.navigate('Main')}
              title="Sign In"
              variant="primary"
              size="lg"
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text variant="regular" size={14} color={colors.text.secondary}>
              Don't have an account? {' '}
              <Text variant="bold" size={14} color={colors.primary}>
                Contact Admin
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    marginBottom: 12,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.primary,
    backgroundColor: '#FFFFFF',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 32,
    marginTop: -8,
  },
  button: {
    borderRadius: 16,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
});
