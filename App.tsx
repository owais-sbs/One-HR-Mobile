import React, { useEffect, useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  ClipboardList,
  DollarSign,
  User,
  Bell,
} from "lucide-react-native";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Calendar } from "lucide-react-native";
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
import { STORAGE_KEYS } from "./src/config/apiConfig";
import { initializeNotificationSystem } from "./src/services/notificationService";
import { getCurrentEmployee } from "./src/api/employeeService";
import { normalizeEmployeeData } from "./src/utils/employeeData";
import {
  formatJoiningDate,
  hasEmployeeJoined,
} from "./src/utils/employmentDates";
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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        headerShown: false,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 10,
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
          tabBarIcon: ({ color, size }) => (
            <DollarSign size={size} color={color} />
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

function JoiningPendingScreen({ employee }: { employee: any }) {
  return (
    <View style={styles.pendingContainer}>
      <View style={styles.pendingIconWrap}>
        <Calendar size={28} color="#FFFFFF" />
      </View>
      <Text
        variant="bold"
        size={30}
        color="#000000"
        style={styles.pendingTitle}
      >
        Joining Pending
      </Text>
      <Text
        variant="medium"
        size={15}
        color={colors.text.secondary}
        style={styles.pendingText}
      >
        Your account is active, but app access will be available after your
        joining date.
      </Text>
      <View style={styles.pendingDateCard}>
        <Text variant="medium" size={12} color={colors.text.secondary}>
          Joining Date
        </Text>
        <Text
          variant="bold"
          size={22}
          color="#000000"
          style={styles.pendingDateValue}
        >
          {formatJoiningDate(employee)}
        </Text>
      </View>
    </View>
  );
}

function MainEntryScreen() {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [employeeHasJoined, setEmployeeHasJoined] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadEmployee = async () => {
      try {
        const response = await getCurrentEmployee();
        const data = normalizeEmployeeData(response);

        if (!mounted) return;

        setEmployee(data);
        setEmployeeHasJoined(hasEmployeeJoined(data));

        if (data) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.EMPLOYEE_DATA,
            JSON.stringify(data),
          );
        }
      } catch (error) {
        console.error("Main entry employee check error:", error);
        if (!mounted) return;
        setEmployee(null);
        setEmployeeHasJoined(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEmployee();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!employeeHasJoined) {
    return <JoiningPendingScreen employee={employee} />;
  }

  return <MainTabs />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    initializeNotificationSystem().catch((error) => {
      console.error("Notification setup error:", error);
    });
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const rolesStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLES);

      if (token && rolesStr) {
        const roles = JSON.parse(rolesStr);
        if (roles.includes("employee")) {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsReady(true);
    }
  };

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && isReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady]);

  if (!fontsLoaded || !isReady) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={isAuthenticated ? "Main" : "Login"}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainEntryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
  },
  pendingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 24,
  },
  pendingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pendingTitle: {
    textAlign: "center",
    marginBottom: 10,
  },
  pendingText: {
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 22,
  },
  pendingDateCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  pendingDateValue: {
    marginTop: 6,
  },
});
