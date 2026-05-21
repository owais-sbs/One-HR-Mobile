import React, { useEffect, useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  ClipboardList,
  User,
  Bell,
} from "lucide-react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
// Import Screens
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import HolidayListScreen from "./src/screens/HolidayListScreen";
import AttendanceReportScreen from "./src/screens/AttendanceReportScreen";
import SalaryDetailsScreen from "./src/screens/SalaryDetailsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import PersonalInfoScreen from "./src/screens/PersonalInfoScreen";
import CompanyDetailsScreen from "./src/screens/CompanyDetailsScreen";
import SecurityScreen from "./src/screens/SecurityScreen";
import NotificationScreen from "./src/screens/NotificationScreen";
import ApplyLeaveScreen from "./src/screens/ApplyLeaveScreen";
import LeaveHistoryScreen from "./src/screens/LeaveHistoryScreen";
import TeamLeavesScreen from "./src/screens/TeamLeavesScreen";
import { colors } from "./src/theme/colors";
import { initializeNotificationSystem } from "./src/services/notificationService";
import { CurrencyProvider, useCurrency } from "./src/context/CurrencyContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { Text } from "./src/components/ui/Typography";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen name="HolidayList" component={HolidayListScreen} />
      <DashboardStack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
      <DashboardStack.Screen
        name="LeaveHistory"
        component={LeaveHistoryScreen}
      />
      <DashboardStack.Screen name="TeamLeaves" component={TeamLeavesScreen} />
    </DashboardStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <ProfileStack.Screen
        name="CompanyDetails"
        component={CompanyDetailsScreen}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationScreen}
      />
      <ProfileStack.Screen name="Security" component={SecurityScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  const { currencySymbol } = useCurrency();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        headerShown: false,
        tabBarStyle: {
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 4,
          height: 56 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Salary"
        component={SalaryDetailsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <View style={styles.currencyTabIcon}>
              <Text
                variant="bold"
                size={18}
                color={color}
                style={styles.currencyTabSymbol}
              >
                {currencySymbol || "$"}
              </Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function MainEntryScreen() {
  return <MainTabs />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [authReady, setAuthReady] = useState(false);
  const handleAuthReady = useCallback(() => {
    setAuthReady(true);
  }, []);

  useEffect(() => {
    initializeNotificationSystem().catch((error) => {
      console.error("Notification setup error:", error);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && authReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authReady]);

  return (
    <AuthProvider onReady={handleAuthReady}>
      <AppShell fontsLoaded={fontsLoaded} />
    </AuthProvider>
  );
}

function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <CurrencyProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              <Stack.Screen name="Main" component={MainEntryScreen} />
            ) : (
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} />}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </CurrencyProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  currencyTabIcon: {
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyTabSymbol: {
    lineHeight: 20,
  },
});
