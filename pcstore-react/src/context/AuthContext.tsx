import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  User,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
}

const STORAGE_USER_KEY = 'pcstore_mock_user';
const STORAGE_TOKEN_KEY = 'pcstore_mock_token';

const DEFAULT_MOCK_USER: User = {
  id: 'user-1',
  username: 'demo_user',
  email: 'demo@pcstore.vn',
  fullName: 'Nguyễn Văn Demo',
  phone: '0987654321',
  role: 'CUSTOMER',
  status: 'ACTIVE',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN_KEY));
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

  const login = async (payload: LoginPayload): Promise<User> => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const loggedUser: User = {
      ...DEFAULT_MOCK_USER,
      email: payload.email || DEFAULT_MOCK_USER.email,
      username: payload.username || payload.email?.split('@')[0] || DEFAULT_MOCK_USER.username,
    };
    const mockToken = `mock-token-${Date.now()}`;
    setUser(loggedUser);
    setToken(mockToken);
    setLoading(false);
    return loggedUser;
  };

  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const newUser: User = {
      id: `user-${Date.now()}`,
      username: payload.username,
      email: payload.email,
      fullName: payload.fullName,
      phone: payload.phone || null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };
    const mockToken = `mock-token-${Date.now()}`;
    setUser(newUser);
    setToken(mockToken);
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      loading: false,
      isAuthenticated: false,
      login: async () => DEFAULT_MOCK_USER,
      register: async () => {},
      logout: () => {},
      updateProfile: async () => DEFAULT_MOCK_USER,
      changePassword: async () => {},
    };
  }
  return context;
};
