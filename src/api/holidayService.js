import apiClient from './apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

export const getCompanyHolidays = async (companyId) => {
  const response = await apiClient.get(API_ENDPOINTS.HOLIDAYS.BY_COMPANY(companyId));
  return response.data?.data || response.data;
};
