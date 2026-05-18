import apiClient from './apiClient';
import { API_ENDPOINTS, CACHE_TTL, STORAGE_KEYS } from '../config/apiConfig';
import { getCachedOrFetch } from '../utils/cache';

export const getCompanyById = async (id, options = {}) => {
  const { forceRefresh = false } = options;
  return getCachedOrFetch(
    `${STORAGE_KEYS.COMPANY_DATA}_${id}`,
    async () => {
      const response = await apiClient.get(API_ENDPOINTS.COMPANIES.BY_ID(id));
      return response.data?.data || response.data;
    },
    {
      ttlMs: CACHE_TTL.COMPANY,
      forceRefresh,
    },
  );
};
