import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

// IMPORTANT:
// - Physical devices on Wi-Fi cannot call `localhost` on your laptop.
// - When Expo serves the app from a LAN host, we reuse that host and swap in
//   the backend port so everyone on the same network can hit the same server.
// - For emulators/simulators, we fall back to loopback-friendly hosts.
// - You can always override this with EXPO_PUBLIC_API_BASE_URL.
const ANDROID_EMULATOR_BASE_URL = "http://10.0.2.2:8080/api";
const IOS_SIMULATOR_BASE_URL = "http://localhost:8080/api";

function normalizeHost(host) {
  return host?.replace(/:\d+$/, "").trim() || null;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

function isLoopbackHost(host) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function isPrivateIpv4Host(host) {
  return /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(
    host
  );
}

function getHostFromUrl(urlLike) {
  if (!urlLike || typeof urlLike !== "string") {
    return null;
  }

  try {
    const url = new URL(urlLike.includes("://") ? urlLike : `http://${urlLike}`);
    return normalizeHost(url.hostname);
  } catch {
    return normalizeHost(urlLike.split("/")[0]);
  }
}

function getPackagerHost() {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    NativeModules?.SourceCode?.scriptURL,
  ];

  for (const candidate of hostCandidates) {
    const host = getHostFromUrl(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

function getLoopbackDevBaseUrl() {
  return Platform.OS === "android"
    ? ANDROID_EMULATOR_BASE_URL
    : IOS_SIMULATOR_BASE_URL;
}

function getDevBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const host = getPackagerHost();
  if (host) {
    if (isLoopbackHost(host)) {
      return getLoopbackDevBaseUrl();
    }

    if (isPrivateIpv4Host(host)) {
      return `http://${host}:8080/api`;
    }
  }

  return getLoopbackDevBaseUrl();
}

const DEV_BASE_URL = getDevBaseUrl();

if (__DEV__) {
  console.info(`[API CONFIG] Base URL: ${DEV_BASE_URL}`);
}

export const API_CONFIG = {
  BASE_URL: __DEV__ ? DEV_BASE_URL : "https://api.onehr.com/api",
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/accounts/login",
    LOGOUT: "/accounts/logout",
    REFRESH_TOKEN: "/accounts/refresh",
  },
  EMPLOYEES: {
    LIST: "/employee",
    BY_ID: (id) => `/employee/${id}`,
    ME: "/employee/me",
    BY_DEPARTMENT: (departmentId) => `/employee/department/${departmentId}`,
    CREATE: "/employee",
    UPDATE: (id) => `/employee/${id}`,
  },
  DEPARTMENTS: {
    LIST: "/departments",
    BY_ID: (id) => `/departments/${id}`,
    CREATE: "/departments",
    UPDATE: (id) => `/departments/${id}`,
    SET_MANAGER: (id) => `/departments/${id}/manager`,
    ACTIVATE: (id) => `/departments/${id}/activate`,
    INACTIVATE: (id) => `/departments/${id}/inactivate`,
    DELETE: (id) => `/departments/${id}`,
  },
  USERS: {
    CREATE_COMPANY_ADMIN: "/users/company-admin",
    BY_COMPANY: (companyId) => `/users/by-company?companyId=${companyId}`,
    BY_ROLES: (params) => `/users/by-roles?${params}`,
    UPDATE_STATUS: (id, active) => `/users/${id}/status?active=${active}`,
  },
  ROLES: {
    LIST: "/roles",
  },
  SALARY_STRUCTURES: {
    LIST: "/salary-structures",
    BY_COMPANY: (companyId) => `/salary-structures/company/${companyId}`,
    ACTIVE_BY_COMPANY: (companyId) =>
      `/salary-structures/company/${companyId}/active`,
    BY_ID: (id) => `/salary-structures/${id}`,
    CREATE: "/salary-structures",
    UPDATE: (id) => `/salary-structures/${id}`,
    DELETE: (id) => `/salary-structures/${id}`,
  },
  EMPLOYEE_SALARIES: {
    CREATE: "/employee-salaries",
    REVISE: (employeeId) => `/employee-salaries/${employeeId}/revise`,
    BY_EMPLOYEE: (employeeId) => `/employee-salaries/employee/${employeeId}`,
    BY_COMPANY: (companyId) => `/employee-salaries/company/${companyId}`,
    LIST: "/employee-salaries",
  },
  SALARY_REVISIONS: {
    BY_EMPLOYEE: (employeeId) => `/salary-revisions/employee/${employeeId}`,
    BY_COMPANY: (companyId) => `/salary-revisions/company/${companyId}`,
    BY_EMPLOYEE_AND_COMPANY: (employeeId, companyId) =>
      `/salary-revisions/employee/${employeeId}/company/${companyId}`,
    BY_ID: (id) => `/salary-revisions/${id}`,
  },
  COMPANIES: {
    LIST: "/companies",
    BY_ID: (id) => `/companies/${id}`,
    CREATE: "/companies",
    UPDATE: (id) => `/companies/${id}`,
    UPDATE_STATUS: (id) => `/companies/${id}/status`,
  },
  COUNTRIES: {
    LIST: "/countries",
    BY_ID: (id) => `/countries/${id}`,
    CREATE: "/countries",
    UPDATE: (id) => `/countries/${id}`,
    DELETE: (id) => `/countries/${id}`,
  },
  SUBSCRIPTIONS: {
    PLANS: "/subscriptions/plans",
    COMPANY_SUBSCRIPTIONS: "/subscriptions/company",
  },
  WORKING_HOURS: {
    LIST: "/working-hours",
    UPDATE: "/working-hours",
    BY_COMPANY: (companyId) => `/working-hours/company/${companyId}`,
  },
  ATTENDANCE: {
    CLOCK_IN: "/attendance/me/clock-in",
    CLOCK_OUT: "/attendance/me/clock-out",
    TODAY: "/attendance/me/today",
    HISTORY: "/attendance/me",
  },
  SUPER_ADMINS: {
    LIST: "/super-admins",
    CREATE: "/super-admins",
  },
  LEAVE: {
    REQUEST: "/leave/request",
    MY_LEAVES: (employeeId) => `/leave/my-leaves?employeeId=${employeeId}`,
    MY_LEAVES_BY_STATUS: (employeeId, status) =>
      `/leave/my-leaves/status?employeeId=${employeeId}&status=${status}`,
    TEAM_LEAVES: (supervisorId) =>
      `/leave/team-leaves?supervisorId=${supervisorId}`,
    TEAM_LEAVES_BY_STATUS: (supervisorId, status) =>
      `/leave/team-leaves/status?supervisorId=${supervisorId}&status=${status}`,
    COMPANY_LEAVES: (companyId) =>
      `/leave/company-leaves?companyId=${companyId}`,
    COMPANY_LEAVES_BY_STATUS: (companyId, status) =>
      `/leave/company-leaves/status?companyId=${companyId}&status=${status}`,
    APPROVE: (id) => `/leave/${id}/approve`,
    REJECT: (id) => `/leave/${id}/reject`,
    BALANCES: (employeeId) => `/leave/balances?employeeId=${employeeId}`,
    BY_ID: (id) => `/leave/${id}`,
  },
  LEAVE_TYPES: {
    LIST: "/leave-type",
    BY_COMPANY: (companyId) => `/leave-type/company/${companyId}`,
  },
  HOLIDAYS: {
    BY_COMPANY: (companyId) => `/holiday/${companyId}`,
  },
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  USER_DATA: "userData",
  USER_ROLES: "userRoles",
  EMPLOYEE_DATA: "employeeData",
  COMPANY_DATA: "companyData",
  ATTENDANCE_CACHE: "attendanceCache",
  SALARY_STRUCTURE_CACHE: "salaryStructureCache",
  SALARY_DATA_CACHE: "salaryDataCache",
  SALARY_HISTORY_CACHE: "salaryHistoryCache",
  PROFILE_CACHE: "profileCache",
  DEPARTMENT_CACHE: "departmentCache",
  LOCATION_PERMISSION: "locationPermission",
};

export const CACHE_TTL = {
  ATTENDANCE: 5 * 60 * 1000, // 5 minutes
  SALARY_STRUCTURE: 30 * 60 * 1000, // 30 minutes
  SALARY_DATA: 5 * 60 * 1000, // 5 minutes
  SALARY_HISTORY: 10 * 60 * 1000, // 10 minutes
  PROFILE: 10 * 60 * 1000, // 10 minutes
  DEPARTMENT: 15 * 60 * 1000, // 15 minutes
};
