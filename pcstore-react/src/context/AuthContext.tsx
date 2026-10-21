import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  User,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from '../types/auth';
import { authService, mapAuthResponseToUser, parseJwt } from '../services/authService';
import { refreshAccessToken } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  refreshSession: () => Promise<string | null>;
}

const STORAGE_USER_KEY = 'pcstore_user';
const STORAGE_TOKEN_KEY = 'pcstore_token';
const STORAGE_REFRESH_TOKEN_KEY = 'pcstore_refresh_token';

// Clean up legacy mock data keys
try {
  localStorage.removeItem('pcstore_mock_user');
  localStorage.removeItem('pcstore_mock_token');
} catch {
  // Ignore in SSR / restricted environments
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const savedRefresh = localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
      if (!savedToken) return null;

      // Check if token expired
      const jwt = parseJwt(savedToken);
      if (jwt?.exp && jwt.exp * 1000 < Date.now()) {
        // If refresh token exists, do NOT clear yet - allow refresh attempt
        if (!savedRefresh) {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          localStorage.removeItem(STORAGE_USER_KEY);
          return null;
        }
      }
      return savedToken;
    } catch {
      return null;
    }
  });

  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_USER_KEY);
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (!savedToken || !savedUser) return null;
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
    }
  }, [refreshToken]);

  // Synchronize with background token refresh and session expiry events
  useEffect(() => {
    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (data?.accessToken) {
        setToken(data.accessToken);
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
        }
        const updatedUser = mapAuthResponseToUser(data);
        setUser(updatedUser);
      }
    };

    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
      setRefreshToken(null);
    };

    window.addEventListener('auth:token_refreshed', handleTokenRefreshed);
    window.addEventListener('auth:session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('auth:token_refreshed', handleTokenRefreshed);
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, []);

  // On mount: if access token expired or missing but refresh token exists, attempt silent refresh
  useEffect(() => {
    const tryRecoverSession = async () => {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const savedRefresh = localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);

      if (!savedRefresh) return;

      let needRefresh = false;
      if (!savedToken) {
        needRefresh = true;
      } else {
        const jwt = parseJwt(savedToken);
        if (jwt?.exp && jwt.exp * 1000 < Date.now()) {
          needRefresh = true;
        }
      }

      if (needRefresh) {
        try {
          await refreshAccessToken();
        } catch {
          // If refresh fails, clear
          logout();
        }
      }
    };

    tryRecoverSession();
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    setLoading(true);
    try {
      const loginUsername = payload.username || payload.email || '';
      const response = await authService.login({
        username: loginUsername.trim(),
        password: payload.password,
      });

      const loggedUser = mapAuthResponseToUser(response);

      setToken(response.accessToken);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      setUser(loggedUser);

      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const response = await authService.register(payload);
      if (response.accessToken) {
        const loggedUser = mapAuthResponseToUser(response);
        setToken(response.accessToken);
        if (response.refreshToken) {
          setRefreshToken(response.refreshToken);
        }
        setUser(loggedUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const currentRefresh = refreshToken;
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);

    if (currentRefresh) {
      authService.logout(currentRefresh).catch(() => {});
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
    if (!user) throw new Error('Chưa đăng nhập');
    const updatedUser: User = {
      ...user,
      fullName: payload.fullName ?? user.fullName,
      phone: payload.phone ?? user.phone,
      avatar: payload.avatar ?? user.avatar,
    };
    setUser(updatedUser);
    return updatedUser;
  };

  const changePassword = async (_payload: ChangePasswordPayload): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  };

  const refreshSession = async (): Promise<string | null> => {
    return await refreshAccessToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
