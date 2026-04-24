import { NativeModules } from 'react-native';

// IMPORTANT:
// - `localhost` works only on simulators/emulators, not on a physical phone.
// - If Expo is running on the same machine as the backend, we can usually reuse
//   the Expo packager host and just swap the port to 8080.
// - You can always override this with EXPO_PUBLIC_API_BASE_URL.
const FALLBACK_DEV_BASE_URL = 'http://192.168.1.33:8080/api';

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function getPackagerHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL || typeof scriptURL !== 'string') {
    return null;
  }

  try {
    const url = new URL(scriptURL);
    return url.hostname || null;
  } catch {
    return null;
  }
}

function isLoopbackHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function getDevBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const host = getPackagerHost();
  if (host && !isLoopbackHost(host)) {
    return `http://${host}:8080/api`;
  }

  return FALLBACK_DEV_BASE_URL;
}

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? getDevBaseUrl()
    : 'https://api.onehr.com/api',
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/accounts/login',
    LOGOUT: '/accounts/logout',
    REFRESH_TOKEN: '/accounts/refresh',
  },
  EMPLOYEES: {
    LIST: '/employee',
    BY_ID: (id) => `/employee/${id}`,
    ME: '/employee/me',
    BY_DEPARTMENT: (departmentId) => `/employee/department/${departmentId}`,
    CREATE: '/employee',
    UPDATE: (id) => `/employee/${id}`,
  },
  DEPARTMENTS: {
    LIST: '/departments',
    BY_ID: (id) => `/departments/${id}`,
    CREATE: '/departments',
    UPDATE: (id) => `/departments/${id}`,
    SET_MANAGER: (id) => `/departments/${id}/manager`,
    ACTIVATE: (id) => `/departments/${id}/activate`,
    INACTIVATE: (id) => `/departments/${id}/inactivate`,
    DELETE: (id) => `/departments/${id}`,
  },
  USERS: {
    CREATE_COMPANY_ADMIN: '/users/company-admin',
    BY_COMPANY: (companyId) => `/users/by-company?companyId=${companyId}`,
    BY_ROLES: (params) => `/users/by-roles?${params}`,
    UPDATE_STATUS: (id, active) => `/users/${id}/status?active=${active}`,
  },
  ROLES: {
    LIST: '/roles',
  },
  SALARY_STRUCTURES: {
    LIST: '/salary-structures',
    BY_COMPANY: (companyId) => `/salary-structures/company/${companyId}`,
    ACTIVE_BY_COMPANY: (companyId) => `/salary-structures/company/${companyId}/active`,
    BY_ID: (id) => `/salary-structures/${id}`,
    CREATE: '/salary-structures',
    UPDATE: (id) => `/salary-structures/${id}`,
    DELETE: (id) => `/salary-structures/${id}`,
  },
  EMPLOYEE_SALARIES: {
    CREATE: '/employee-salaries',
    REVISE: (employeeId) => `/employee-salaries/${employeeId}/revise`,
    BY_EMPLOYEE: (employeeId) => `/employee-salaries/employee/${employeeId}`,
    BY_COMPANY: (companyId) => `/employee-salaries/company/${companyId}`,
    LIST: '/employee-salaries',
  },
  SALARY_REVISIONS: {
    BY_EMPLOYEE: (employeeId) => `/salary-revisions/employee/${employeeId}`,
    BY_COMPANY: (companyId) => `/salary-revisions/company/${companyId}`,
    BY_EMPLOYEE_AND_COMPANY: (employeeId, companyId) => 
      `/salary-revisions/employee/${employeeId}/company/${companyId}`,
    BY_ID: (id) => `/salary-revisions/${id}`,
  },
  COMPANIES: {
    LIST: '/companies',
    BY_ID: (id) => `/companies/${id}`,
    CREATE: '/companies',
    UPDATE: (id) => `/companies/${id}`,
    UPDATE_STATUS: (id) => `/companies/${id}/status`,
  },
  COUNTRIES: {
    LIST: '/countries',
    BY_ID: (id) => `/countries/${id}`,
    CREATE: '/countries',
    UPDATE: (id) => `/countries/${id}`,
    DELETE: (id) => `/countries/${id}`,
  },
  SUBSCRIPTIONS: {
    PLANS: '/subscriptions/plans',
    COMPANY_SUBSCRIPTIONS: '/subscriptions/company',
  },
  WORKING_HOURS: {
    LIST: '/working-hours',
    UPDATE: '/working-hours',
    BY_COMPANY: (companyId) => `/working-hours/company/${companyId}`,
  },
  ATTENDANCE: {
    CLOCK_IN: '/attendance/me/clock-in',
    CLOCK_OUT: '/attendance/me/clock-out',
    TODAY: '/attendance/me/today',
    HISTORY: '/attendance/me',
  },
  SUPER_ADMINS: {
    LIST: '/super-admins',
    CREATE: '/super-admins',
  },
  LEAVE: {
    REQUEST: '/leave/request',
    MY_LEAVES: (employeeId) => `/leave/my-leaves?employeeId=${employeeId}`,
    MY_LEAVES_BY_STATUS: (employeeId, status) => `/leave/my-leaves/status?employeeId=${employeeId}&status=${status}`,
    TEAM_LEAVES: (supervisorId) => `/leave/team-leaves?supervisorId=${supervisorId}`,
    TEAM_LEAVES_BY_STATUS: (supervisorId, status) => `/leave/team-leaves/status?supervisorId=${supervisorId}&status=${status}`,
    COMPANY_LEAVES: (companyId) => `/leave/company-leaves?companyId=${companyId}`,
    COMPANY_LEAVES_BY_STATUS: (companyId, status) => `/leave/company-leaves/status?companyId=${companyId}&status=${status}`,
    APPROVE: (id) => `/leave/${id}/approve`,
    REJECT: (id) => `/leave/${id}/reject`,
    BALANCES: (employeeId) => `/leave/balances?employeeId=${employeeId}`,
    BY_ID: (id) => `/leave/${id}`,
  },
  LEAVE_TYPES: {
    LIST: '/leave-type',
  },
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_ID: 'userId',
  USER_DATA: 'userData',
  USER_ROLES: 'userRoles',
  EMPLOYEE_DATA: 'employeeData',
  LOCATION_PERMISSION: 'locationPermission',
};
