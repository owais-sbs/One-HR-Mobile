import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../config/apiConfig";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  markAuthenticated: () => void;
  markUnauthenticated: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  markAuthenticated: () => {},
  markUnauthenticated: () => {},
});

function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .filter((role): role is string => typeof role === "string")
    .map((role) => role.toLowerCase());
}

export function AuthProvider({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady?: () => void;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const rolesStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLES);

        if (!token || !rolesStr) {
          setIsAuthenticated(false);
          return;
        }

        const roles = normalizeRoles(JSON.parse(rolesStr));
        setIsAuthenticated(roles.includes("employee"));
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        onReady?.();
      }
    };

    void checkAuth();
  }, [onReady]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        markAuthenticated: () => setIsAuthenticated(true),
        markUnauthenticated: () => setIsAuthenticated(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };
