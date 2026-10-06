export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatar?: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'STAFF';
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
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
  message: string;
  token?: string;
  user?: User;
}

export const AUTH_ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
} as const;
