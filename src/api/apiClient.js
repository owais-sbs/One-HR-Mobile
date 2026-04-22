import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../config/apiConfig';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

apiClient.interceptors.request.use(
  async (config) => {
    // Don't send auth token on login requests
    const isLoginRequest = config.url?.includes('/accounts/login');
    if (!isLoginRequest) {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Server responded with a non-2xx status code
      console.error(
        `[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> ${error.response.status}`,
        JSON.stringify(error.response.data)
      );
    } else if (error.request) {
      // Request was made but no response received (network/backend down)
      console.error(
        `[NETWORK ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} -> No response`,
        error.message
      );
    } else {
      // Something else happened
      console.error(`[REQUEST ERROR] ${error.message}`);
    }

    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ROLES,
      ]);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
