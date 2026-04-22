import apiClient from './apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

export const login = async (credentials) => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
  return response.data;
};

export const logout = async () => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  return response.data;
};

export const refreshToken = async (refreshToken) => {
  const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken });
  return response.data;
};
