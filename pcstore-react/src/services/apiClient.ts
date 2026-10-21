import { API_ENDPOINTS } from '../config/api';
import type { AuthResponse } from '../types/auth';

const STORAGE_TOKEN_KEY = 'pcstore_token';
const STORAGE_REFRESH_TOKEN_KEY = 'pcstore_refresh_token';
const STORAGE_USER_KEY = 'pcstore_user';

// Mutex promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<string | null> | null = null;

/**
 * Xóa session đăng nhập khi token hết hạn hoàn toàn
 */
export function handleSessionPurge() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
  window.dispatchEvent(new CustomEvent('auth:session_expired'));
}

/**
 * Thực hiện làm mới Access Token bằng Refresh Token (Có khóa Mutex chống gọi trùng lặp)
 */
export async function refreshAccessToken(): Promise<string | null> {
  // Nếu đang có một request refresh token đang chạy, chờ kết quả của request đó
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const storedRefreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      handleSessionPurge();
      return null;
    }

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!response.ok) {
        handleSessionPurge();
        return null;
      }

      const data: AuthResponse = await response.json();
      if (!data?.accessToken) {
        handleSessionPurge();
        return null;
      }

      // Lưu cặp token mới (Áp dụng Refresh Token Rotation - RTR)
      localStorage.setItem(STORAGE_TOKEN_KEY, data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, data.refreshToken);
      }

      // Phát sự kiện để AuthContext và toàn bộ ứng dụng cập nhật state ngay lập tức
      window.dispatchEvent(
        new CustomEvent('auth:token_refreshed', { detail: data })
      );

      return data.accessToken;
    } catch {
      handleSessionPurge();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Fetch wrapper tự động đính kèm Token và tự động Refresh Token + Retry khi gặp lỗi 401
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const currentUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.href
      : input.url;

  // Sao chép headers
  const headers = new Headers(init.headers || {});

  // Đính kèm token hiện tại nếu có
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const modifiedInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await fetch(input, modifiedInit);

  // Kiểm tra nếu là lỗi 401 và không phải là các API auth cơ bản (login, refresh, register)
  const isAuthEndpoint =
    currentUrl.includes('/api/auth/login') ||
    currentUrl.includes('/api/auth/refresh') ||
    currentUrl.includes('/api/auth/register');

  if (response.status === 401 && !isAuthEndpoint) {
    // Thử làm mới token
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Gọi lại request ban đầu với token mới (Seamless Retry)
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);

      return fetch(input, {
        ...init,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
