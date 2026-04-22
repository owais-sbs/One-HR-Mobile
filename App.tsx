import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ClipboardList, DollarSign, User, Bell } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  useFonts, 
  Poppins_400Regular, 
  Poppins_500Medium, 
  Poppins_600SemiBold, 
  Poppins_700Bold 
} from '@expo-google-fonts/poppins';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HolidayListScreen from './src/screens/HolidayListScreen';
import AttendanceReportScreen from './src/screens/AttendanceReportScreen';
import SalaryDetailsScreen from './src/screens/SalaryDetailsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PersonalInfoScreen from './src/screens/PersonalInfoScreen';
import CompanyDetailsScreen from './src/screens/CompanyDetailsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ApplyLeaveScreen from './src/screens/ApplyLeaveScreen';
import { colors } from './src/theme/colors';
import { STORAGE_KEYS } from './src/config/apiConfig';

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
    </DashboardStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <ProfileStack.Screen name="CompanyDetails" component={CompanyDetailsScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationScreen} />
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
          fontFamily: 'Poppins_500Medium',
          fontSize: 10,
        }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStackScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceReportScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Salary" 
        component={SalaryDetailsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
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

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const rolesStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLES);
      
      if (token && rolesStr) {
        const roles = JSON.parse(rolesStr);
        if (roles.includes('employee')) {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
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
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isAuthenticated ? 'Main' : 'Login'}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
