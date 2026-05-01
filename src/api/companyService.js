import apiClient from './apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

export const getCompanyById = async (id) => {
  const response = await apiClient.get(API_ENDPOINTS.COMPANIES.BY_ID(id));
  return response.data?.data || response.data;
};
