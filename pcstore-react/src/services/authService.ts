import { API_ENDPOINTS } from '../config/api';
import type { LoginPayload, AuthResponse, RegisterPayload, User } from '../types/auth';

/**
 * Decode JWT token payload safely
 */
export function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Convert backend AuthResponse to frontend User model
 */
export function mapAuthResponseToUser(data: AuthResponse): User {
  const jwtPayload = parseJwt(data.accessToken);
  const uid = jwtPayload?.uid ? String(jwtPayload.uid) : '1';

  return {
    id: uid,
    username: data.username,
    fullName: data.fullName,
    role: data.role || jwtPayload?.role || 'CUSTOMER',
    status: 'ACTIVE',
    email: jwtPayload?.sub?.includes('@') ? jwtPayload.sub : `${data.username}@pcstore.vn`,
  };
}

export const authService = {
  /**
   * Login with username and password
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: payload.username,
        password: payload.password,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.detail ||
        data?.message ||
        data?.error ||
        (response.status === 401
          ? 'Sai tên đăng nhập hoặc mật khẩu!'
          : 'Đăng nhập không thành công, vui lòng thử lại');
      throw new Error(errorMessage);
    }

    return data as AuthResponse;
  },

  /**
   * Register a new user
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.detail ||
        data?.message ||
        data?.error ||
        'Đăng ký không thành công, vui lòng thử lại';
      throw new Error(errorMessage);
    }

    return data as AuthResponse;
  },

  /**
   * Logout from backend session
   */
  async logout(refreshToken?: string | null): Promise<void> {
    if (!refreshToken) return;
    try {
      await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore network errors on logout
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.detail ||
        data?.message ||
        data?.error ||
        (response.status === 401
          ? 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Làm mới token không thành công.');
      throw new Error(errorMessage);
    }

    return data as AuthResponse;
  },

  /**
   * Fetch current authenticated user info
   */
  async getMe(accessToken: string): Promise<any> {
    const response = await fetch(API_ENDPOINTS.AUTH.ME, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Phiên đăng nhập đã hết hạn');
    }

    return await response.json();
  },
};
