import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentEmployee } from '../api/employeeService';
import { STORAGE_KEYS } from '../config/apiConfig';
import { normalizeEmployeeData } from './employeeData';

export async function readCachedEmployeeData() {
  const cached = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
  if (!cached) return null;

  try {
    return normalizeEmployeeData(JSON.parse(cached));
  } catch {
    return null;
  }
}

export async function refreshEmployeeData() {
  const response = await getCurrentEmployee();
  const employee = normalizeEmployeeData(response);

  if (employee) {
    await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEE_DATA, JSON.stringify(employee));
  }

  return employee;
}

export async function getEmployeeData(options = {}) {
  const { forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = await readCachedEmployeeData();
    if (cached) {
      return cached;
    }
  }

  return refreshEmployeeData();
}
