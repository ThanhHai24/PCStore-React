import { API_ENDPOINTS } from '../config/api';
import type { AuthResponse } from '../types/auth';
import { systemLogService } from './systemLogService';
import type { SystemLogModule, SystemLogAction, SystemLogLevel } from '../types/systemLog';

const STORAGE_TOKEN_KEY = 'pcstore_token';
const STORAGE_REFRESH_TOKEN_KEY = 'pcstore_refresh_token';
const STORAGE_USER_KEY = 'pcstore_user';

function autoLogApiCall(
  method: string,
  url: string,
  status: number,
  executionTimeMs: number,
  body?: BodyInit | null
) {
  // Only auto-log state mutations (POST, PUT, PATCH, DELETE) or failures (status >= 400)
  if (method === 'GET' && status < 400) return;

  setTimeout(() => {
    try {
      let currentUser = {
        id: '1',
        username: 'admin',
        fullName: 'Quản trị viên',
        role: 'ADMIN',
      };
      try {
        const rawUser = localStorage.getItem(STORAGE_USER_KEY);
        if (rawUser) {
          const u = JSON.parse(rawUser);
          currentUser = {
            id: String(u.id || '1'),
            username: u.username || 'user',
            fullName: u.fullName || u.username || 'Người dùng',
            role: u.role || 'STAFF',
          };
        }
      } catch {
        // ignore
      }

      let moduleName: SystemLogModule = 'SYSTEM';
      let actionName: SystemLogAction = 'UPDATE';
      let targetEntity = 'Tài nguyên';

      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('/auth/login')) {
        moduleName = 'AUTH';
        actionName = 'LOGIN';
        targetEntity = 'Phiên làm việc';
      } else if (lowerUrl.includes('/auth/register')) {
        moduleName = 'AUTH';
        actionName = 'CREATE';
        targetEntity = 'Tài khoản người dùng';
      } else if (lowerUrl.includes('/product')) {
        moduleName = 'PRODUCT';
        targetEntity = 'Sản phẩm';
      } else if (lowerUrl.includes('/categor')) {
        moduleName = 'CATEGORY';
        targetEntity = 'Danh mục';
      } else if (lowerUrl.includes('/brand')) {
        moduleName = 'BRAND';
        targetEntity = 'Thương hiệu';
      } else if (lowerUrl.includes('/order')) {
        moduleName = 'ORDER';
        targetEntity = 'Đơn hàng';
      } else if (lowerUrl.includes('/warehouse') || lowerUrl.includes('/goods-receipt') || lowerUrl.includes('/supplier')) {
        moduleName = 'WAREHOUSE';
        targetEntity = 'Kho vận';
      } else if (lowerUrl.includes('/warranty')) {
        moduleName = 'WARRANTY';
        targetEntity = 'Bảo hành';
      } else if (lowerUrl.includes('/user')) {
        moduleName = 'USER';
        targetEntity = 'Tài khoản';
      } else if (lowerUrl.includes('/review') || lowerUrl.includes('/comment')) {
        moduleName = 'REVIEW';
        targetEntity = 'Đánh giá & Bình luận';
      } else if (lowerUrl.includes('/payment') || lowerUrl.includes('/vnpay')) {
        moduleName = 'PAYMENT';
        actionName = 'PAYMENT_PROCESS';
        targetEntity = 'Giao dịch thanh toán';
      }

      if (actionName !== 'LOGIN' && actionName !== 'PAYMENT_PROCESS') {
        if (method === 'POST') actionName = 'CREATE';
        else if (method === 'PUT' || method === 'PATCH') actionName = 'UPDATE';
        else if (method === 'DELETE') actionName = 'DELETE';
      }

      let level: SystemLogLevel = 'SUCCESS';
      if (status >= 500) level = 'ERROR';
      else if (status >= 400) level = 'WARNING';

      let requestPayload: unknown;
      if (typeof body === 'string') {
        try {
          requestPayload = JSON.parse(body);
        } catch {
          requestPayload = body;
        }
      }

      const path = url.replace(/^https?:\/\/[^/]+/, '');
      const actionVerb =
        actionName === 'CREATE'
          ? 'Tạo mới'
          : actionName === 'DELETE'
          ? 'Xóa bỏ'
          : actionName === 'LOGIN'
          ? 'Đăng nhập'
          : actionName === 'PAYMENT_PROCESS'
          ? 'Xử lý thanh toán'
          : 'Cập nhật';

      systemLogService.addLog({
        actor: {
          id: currentUser.id,
          username: currentUser.username,
          fullName: currentUser.fullName,
          role: currentUser.role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=2563eb&color=fff&bold=true`,
        },
        action: actionName,
        actionTitle: `${actionVerb} ${targetEntity} qua API`,
        module: moduleName,
        level: level,
        description: `Gửi yêu cầu ${method} tới endpoint ${path} (Mã trạng thái phản hồi: ${status}).`,
        targetEntity: targetEntity,
        targetId: path.split('/').pop()?.split('?')[0] || undefined,
        ipAddress: '127.0.0.1 (Client)',
        userAgent: navigator.userAgent || 'Chrome / Windows',
        endpoint: path,
        httpMethod: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        statusCode: status,
        executionTimeMs: executionTimeMs,
        requestPayload: requestPayload,
      });
    } catch {
      // Ignore background logging errors
    }
  }, 0);
}

// Mutex promise to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<string | null> | null = null;

/**
 * Xóa session đăng nhập khi token hết hạn hoàn toàn
 */
export function handleSessionPurge() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
  localStorage.removeItem('pcstore_user_profiles_cache_v1');
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

  const startTime = Date.now();
  const method = (init.method || 'GET').toUpperCase();
  const response = await fetch(input, modifiedInit);
  const duration = Date.now() - startTime;
  autoLogApiCall(method, currentUrl, response.status, duration, init.body);

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
