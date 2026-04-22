import apiClient from './apiClient';
import { API_ENDPOINTS } from '../config/apiConfig';

export const getAllEmployees = async () => {
  const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.LIST);
  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
  return response.data;
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
