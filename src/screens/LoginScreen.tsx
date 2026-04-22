import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { Shield } from 'lucide-react-native';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { STORAGE_KEYS, API_ENDPOINTS } from '../config/apiConfig';
import apiClient from '../api/apiClient';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (response.data?.isSuccess === false) {
        Alert.alert('Error', response.data?.error || response.data?.message || 'Login failed');
        setLoading(false);
        return;
      }

      const loginData = response.data?.data;

      if (!loginData || !loginData.token) {
        Alert.alert('Error', 'Invalid login response from server');
        setLoading(false);
        return;
      }

      const { userId, token, roles } = loginData;

      const hasEmployeeRole = roles && roles.some((r: string) => r.toLowerCase() === 'employee');

      if (!hasEmployeeRole) {
        Alert.alert('Error', 'Access denied. You do not have the required employee role.');
        setLoading(false);
        return;
      }

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, token],
        [STORAGE_KEYS.USER_ID, userId],
        [STORAGE_KEYS.USER_ROLES, JSON.stringify(roles)],
      ]);

      const existingPermission = await Location.getForegroundPermissionsAsync();
      if (existingPermission.status !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, status);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, 'granted');
      }

      navigation.navigate('Main');
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Login failed. Please try again.';
      if (error?.response) {
        const serverData = error.response.data;
        if (typeof serverData === 'string') {
          message = serverData;
        } else {
          message = serverData?.error || serverData?.message || `Server error: ${error.response.status}`;
        }
      } else if (error?.request) {
        message = 'Cannot reach server. Please check your network connection and ensure the backend is running.';
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

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
              onPress={handleSignIn}
              title={loading ? 'Signing In...' : 'Sign In'}
              variant="primary"
              size="lg"
              style={styles.button}
              disabled={loading}
            />
            {loading && <ActivityIndicator style={styles.loader} color={colors.primary} />}

            <Button
              onPress={() => {
                setEmail('employee@onehr.com');
                setPassword('employee123');
              }}
              title="Use Demo Account"
              variant="ghost"
              size="sm"
              style={styles.demoButton}
            />
          </View>

          <View style={styles.footer}>
            <Text variant="regular" size={14} color={colors.text.secondary}>
              Don&apos;t have an account? {' '}
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
  loader: {
    marginTop: 16,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  demoButton: {
    marginTop: 12,
  },
});
