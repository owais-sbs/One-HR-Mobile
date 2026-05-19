import apiClient from './apiClient';
import { API_CONFIG, API_ENDPOINTS, CACHE_TTL, STORAGE_KEYS } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCachedOrFetch } from '../utils/cache';
import { normalizeEmployeeData } from '../utils/employeeData';

export const getAllEmployees = async () => {
  const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.LIST);
  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
  return response.data;
};

export const getCurrentEmployee = async (options = {}) => {
  const { forceRefresh = false } = options;
  return getCachedOrFetch(
    STORAGE_KEYS.CURRENT_EMPLOYEE_CACHE,
    async () => {
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.ME);
      const data = response.data;
      const normalized = data?.data || data;
      if (normalized) {
        await AsyncStorage.setItem(STORAGE_KEYS.EMPLOYEE_DATA, JSON.stringify(normalized));
      }
      return data;
    },
    {
      ttlMs: CACHE_TTL.EMPLOYEE,
      forceRefresh,
    },
  );
};

export const getEmployeesByDepartment = async (departmentId) => {
  const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_DEPARTMENT(departmentId));
  return response.data;
};

export const createEmployee = async (payload) => {
  const response = await apiClient.post(API_ENDPOINTS.EMPLOYEES.CREATE, payload);
  return response.data;
};

export const updateEmployee = async (id, payload) => {
  const response = await apiClient.put(API_ENDPOINTS.EMPLOYEES.UPDATE(id), payload);
  return response.data;
};

function unwrapApiResponse(data) {
  if (data?.isSuccess === false) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }
  return data?.data || data;
}

export const uploadEmployeeProfileImage = async (id, image) => {
  const formData = new FormData();
  const uriParts = String(image.uri || '').split('.');
  const extension = uriParts.length > 1 ? uriParts[uriParts.length - 1].split('?')[0] : 'jpg';
  const mimeType = image.mimeType || image.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`;

  formData.append('file', {
    uri: image.uri,
    name: image.fileName || `profile-photo.${extension || 'jpg'}`,
    type: mimeType,
  });

  const response = await apiClient.post(API_ENDPOINTS.EMPLOYEES.PROFILE_IMAGE(id), formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return normalizeEmployeeData(unwrapApiResponse(response.data));
};

export const deleteEmployeeProfileImage = async (id) => {
  const response = await apiClient.delete(API_ENDPOINTS.EMPLOYEES.PROFILE_IMAGE(id));
  return normalizeEmployeeData(unwrapApiResponse(response.data));
};

export const getEmployeeProfileImageUrl = (id) => {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  return `${baseUrl}${API_ENDPOINTS.EMPLOYEES.PROFILE_IMAGE(id)}`;
};
