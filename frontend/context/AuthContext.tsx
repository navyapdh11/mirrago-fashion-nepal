'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: UserProfile; token: string }>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<{ user: UserProfile; token: string }>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'mirrago-token';
const USER_STORAGE_KEY = 'mirrago-user';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setAuthData(token: string, user: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

async function fetchAPI<T>(path: string, options: { method?: string; body?: any; token?: string } = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);

      // Optionally validate token by fetching current user
      fetchAPI<{ user: UserProfile }>(`/auth/me`, { token: storedToken })
        .then((res) => {
          setUser(res.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
        })
        .catch(() => {
          // Token invalid, clear auth
          clearAuthData();
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetchAPI<{ user: UserProfile; token: string }>(`/auth/login`, {
      method: 'POST',
      body: { email, password },
    });

    setToken(response.token);
    setUser(response.user);
    setAuthData(response.token, response.user);

    return response;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; phone?: string }) => {
    const response = await fetchAPI<{ user: UserProfile; token: string }>(`/auth/register`, {
      method: 'POST',
      body: data,
    });

    setToken(response.token);
    setUser(response.user);
    setAuthData(response.token, response.user);

    return response;
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget logout API call
    if (token) {
      fetchAPI(`/auth/logout`, { method: 'POST', token }).catch(() => {});
    }

    clearAuthData();
    setToken(null);
    setUser(null);
    router.push('/');
  }, [token, router]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<UserProfile> => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetchAPI<{ user: UserProfile }>(`/auth/profile`, {
      method: 'PUT',
      body: data,
      token,
    });

    setUser(response.user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

    return response.user;
  }, [token]);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected route helper - call in client components
export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

export default AuthContext;
