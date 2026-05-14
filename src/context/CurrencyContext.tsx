import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/apiConfig';
import { getCompanyById } from '../api/companyService';
import { getCurrentEmployee } from '../api/employeeService';
import { normalizeEmployeeData } from '../utils/employeeData';
import { getCurrencySymbol, normalizeCurrencyCode } from '../utils/currency';

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  isLoading: boolean;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  currencySymbol: '$',
  isLoading: true,
  refreshCurrency: async () => {},
});

function resolveCurrencyCode(source: any): string | null {
  const raw = source?.currency || source?.currencyCode || null;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return normalizeCurrencyCode(raw);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrency = useCallback(async () => {
    try {
      const cachedCurrency = await AsyncStorage.getItem(STORAGE_KEYS.CURRENCY_DATA);
      if (cachedCurrency) {
        try {
          const parsedCurrency = JSON.parse(cachedCurrency);
          const resolvedCurrency = resolveCurrencyCode(parsedCurrency);
          if (resolvedCurrency) {
            setCurrency(resolvedCurrency);
            setCurrencySymbol(
              parsedCurrency?.currencySymbol || getCurrencySymbol(resolvedCurrency),
            );
          }
        } catch {
          // ignore malformed currency cache
        }
      }

      let employee = null;
      const cachedEmployee = await AsyncStorage.getItem(STORAGE_KEYS.EMPLOYEE_DATA);
      if (cachedEmployee) {
        employee = normalizeEmployeeData(JSON.parse(cachedEmployee));
      }

      const companyCacheKeys = employee?.companyId
        ? [
            `${STORAGE_KEYS.COMPANY_DATA}_${employee.companyId}`,
            STORAGE_KEYS.COMPANY_DATA,
          ]
        : [STORAGE_KEYS.COMPANY_DATA];

      for (const cacheKey of companyCacheKeys) {
        const cachedCompany = await AsyncStorage.getItem(cacheKey);
        if (!cachedCompany) continue;

        const companyData = JSON.parse(cachedCompany);
        const resolvedCurrency = resolveCurrencyCode(companyData);

        if (resolvedCurrency) {
          setCurrency(resolvedCurrency);
          setCurrencySymbol(companyData?.currencySymbol || getCurrencySymbol(resolvedCurrency));
          await AsyncStorage.setItem(
            STORAGE_KEYS.CURRENCY_DATA,
            JSON.stringify({
              currency: resolvedCurrency,
              currencySymbol: companyData?.currencySymbol || getCurrencySymbol(resolvedCurrency),
              timestamp: Date.now(),
            }),
          );
          break;
        }
      }

      if (!employee?.companyId) {
        try {
          const empResponse = await getCurrentEmployee();
          employee = normalizeEmployeeData(empResponse);
        } catch (err) {
          console.error('Failed to fetch employee for currency:', err);
        }
      }

      if (employee?.companyId) {
        const companyData = await getCompanyById(employee.companyId);
        const resolvedCurrency = resolveCurrencyCode(companyData);
        if (resolvedCurrency) {
          const resolvedSymbol = companyData?.currencySymbol || getCurrencySymbol(resolvedCurrency);
          setCurrency(resolvedCurrency);
          setCurrencySymbol(resolvedSymbol);
          await AsyncStorage.multiSet([
            [STORAGE_KEYS.COMPANY_DATA, JSON.stringify(companyData)],
            [`${STORAGE_KEYS.COMPANY_DATA}_${employee.companyId}`, JSON.stringify(companyData)],
            [
              STORAGE_KEYS.CURRENCY_DATA,
              JSON.stringify({
                currency: resolvedCurrency,
                currencySymbol: resolvedSymbol,
                timestamp: Date.now(),
              }),
            ],
          ]);
        }
      }
    } catch (error) {
      console.error('Currency load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrency();
  }, [loadCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol,
        isLoading,
        refreshCurrency: loadCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export { CurrencyContext };
