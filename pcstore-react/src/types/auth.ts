export interface User {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  phone?: string | null;
  avatar?: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF' | 'MANAGER' | 'STAFF_WAREHOUSE' | 'STAFF_SALES' | 'STAFF_TECH' | string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  email?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresInMs?: number;
  username: string;
  fullName: string;
  role: string;
  message?: string;
  user?: User;
}

export const AUTH_ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
} as const;
