import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { colors } from "../theme/colors";
import { Text } from "../components/ui/Typography";
import { Button } from "../components/ui/Button";
import { STORAGE_KEYS, API_ENDPOINTS } from "../config/apiConfig";
import apiClient from "../api/apiClient";
import { getCurrentEmployee } from "../api/employeeService";
import { getCompanyById } from "../api/companyService";
import { normalizeEmployeeData } from "../utils/employeeData";
import { getCurrencySymbol, normalizeCurrencyCode } from "../utils/currency";
import { useCurrency } from "../context/CurrencyContext";
import logo from "../assets/onehr-logo.png";

export default function LoginScreen({ navigation }: any) {
  const { refreshCurrency } = useCurrency();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getCompanyIdFromToken = (jwtToken?: string) => {
    if (!jwtToken) return null;
    try {
      const [, payload] = jwtToken.split(".");
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const decoded = JSON.parse(globalThis.atob(padded));
      const companyId = decoded?.companyId;
      return companyId != null ? String(companyId) : null;
    } catch {
      return null;
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (response.data?.isSuccess === false) {
        Alert.alert(
          "Error",
          response.data?.error || response.data?.message || "Login failed",
        );
        setLoading(false);
        return;
      }

      const loginData = response.data?.data;

      if (!loginData || !loginData.token) {
        Alert.alert("Error", "Invalid login response from server");
        setLoading(false);
        return;
      }

      const { userId, token, roles } = loginData;

      const hasEmployeeRole =
        roles && roles.some((r: string) => r.toLowerCase() === "employee");

      if (!hasEmployeeRole) {
        Alert.alert(
          "Error",
          "Access denied. You do not have the required employee role.",
        );
        setLoading(false);
        return;
      }

      // Clear company cache keys from previous user, but preserve notification
      // state (already scoped by employeeId, so no leakage between users)
      const allKeys = await AsyncStorage.getAllKeys();
      const companyCacheKeys = allKeys.filter((k) =>
        k.startsWith(STORAGE_KEYS.COMPANY_DATA),
      );
      await AsyncStorage.multiRemove([
        ...companyCacheKeys,
        STORAGE_KEYS.EMPLOYEE_DATA,
        STORAGE_KEYS.CURRENCY_DATA,
        STORAGE_KEYS.ATTENDANCE_CACHE,
        STORAGE_KEYS.PROFILE_CACHE,
        STORAGE_KEYS.DEPARTMENT_CACHE,
        STORAGE_KEYS.SALARY_DATA_CACHE,
        STORAGE_KEYS.SALARY_STRUCTURE_CACHE,
        STORAGE_KEYS.SALARY_HISTORY_CACHE,
      ]);

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, token],
        [STORAGE_KEYS.USER_ID, userId],
        [STORAGE_KEYS.USER_ROLES, JSON.stringify(roles)],
      ]);

      try {
        const employeeResponse = await getCurrentEmployee();
        const employeeData = normalizeEmployeeData(employeeResponse);

        if (employeeData) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.EMPLOYEE_DATA,
            JSON.stringify(employeeData),
          );

          const resolvedCompanyId =
            employeeData.companyId || getCompanyIdFromToken(token);

          if (resolvedCompanyId) {
            const companyData = await getCompanyById(resolvedCompanyId);
            const resolvedCurrency = normalizeCurrencyCode(
              companyData?.currency || companyData?.currencyCode || "",
            );

            const cacheEntries: [string, string][] = [
              [STORAGE_KEYS.COMPANY_DATA, JSON.stringify(companyData)],
              [
                `${STORAGE_KEYS.COMPANY_DATA}_${resolvedCompanyId}`,
                JSON.stringify(companyData),
              ],
            ];

            if (resolvedCurrency) {
              cacheEntries.push([
                STORAGE_KEYS.CURRENCY_DATA,
                JSON.stringify({
                  currency: resolvedCurrency,
                  currencySymbol:
                    companyData?.currencySymbol ||
                    getCurrencySymbol(resolvedCurrency),
                  timestamp: Date.now(),
                }),
              ]);
            }

            await AsyncStorage.multiSet(cacheEntries);
          }
        }
      } catch (bootstrapError) {
        console.error("Login bootstrap data error:", bootstrapError);
      }

      await refreshCurrency();

      const existingPermission = await Location.getForegroundPermissionsAsync();
      if (existingPermission.status !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, status);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, "granted");
      }

      navigation.navigate("Main");
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Login failed. Please try again.";
      if (error?.response) {
        const serverData = error.response.data;
        if (typeof serverData === "string") {
          message = serverData;
        } else {
          message =
            serverData?.error ||
            serverData?.message ||
            `Server error: ${error.response.status}`;
        }
      } else if (error?.request) {
        message =
          "Cannot reach server. Please check your network connection and ensure the backend is running.";
      } else if (error?.message) {
        message = error.message;
      }
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text
              variant="regular"
              size={13}
              color={colors.text.secondary}
              align="center"
              style={styles.tagline}
            >
              Sign in to access your One HR workspace.
            </Text>
          </View>

          <View style={styles.form}>
            <Text
              variant="medium"
              size={12}
              color={colors.text.secondary}
              style={styles.sectionLabel}
            >
              Work Account
            </Text>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldRow}>
                <Text
                  variant="medium"
                  size={12}
                  color={colors.text.secondary}
                  style={styles.label}
                >
                  Work Email
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor={colors.text.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldRow}>
                <Text
                  variant="medium"
                  size={12}
                  color={colors.text.secondary}
                  style={styles.label}
                >
                  Password
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={colors.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <Text
              variant="medium"
              size={13}
              color={colors.secondary}
              style={styles.forgotText}
            >
              Forgot Password?
            </Text>

            <Button
              onPress={handleSignIn}
              title={loading ? "Signing In..." : "Sign In"}
              variant="primary"
              size="lg"
              style={styles.button}
              disabled={loading}
            />
            {loading && (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f6",
  },
  inner: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    paddingHorizontal: 26,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 34,
  },
  logoContainer: {
    width: "100%",
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logo: {
    width: 276,
    height: 118,
    tintColor: "#09090b",
  },
  tagline: {
    maxWidth: 250,
    lineHeight: 20,
  },
  form: {
    width: "100%",
  },
  sectionLabel: {
    marginBottom: 12,
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldGroup: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ece9e2",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 1,
  },
  fieldRow: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  label: {
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0ede7",
    marginLeft: 18,
  },
  input: {
    width: "100%",
    height: 26,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: colors.text.primary,
    backgroundColor: "transparent",
  },
  forgotText: {
    width: "100%",
    textAlign: "right",
    marginTop: 14,
    marginBottom: 24,
    paddingRight: 4,
  },
  button: {
    width: "100%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  loader: {
    marginTop: 12,
  },
  demoButton: {
    width: "100%",
    marginTop: 10,
  },
});
