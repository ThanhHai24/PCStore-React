import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  BackendUserResponse,
  PageResponseUserResponse,
  UserCreateRequest,
  UserUpdateRequest,
  UserStatusUpdateRequest,
  GetUsersParams,
  BackendStatus,
} from '../types/adminUser';


/**
 * Xử lý response từ server, parse lỗi chi tiết
 */
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const errorMsg =
      (typeof data === 'object' && data !== null
        ? data.detail || data.message || data.error
        : typeof data === 'string' && data
        ? data
        : null) ||
      (res.status === 401
        ? 'Phiên làm việc hết hạn hoặc chưa đăng nhập quản trị viên. Vui lòng đăng nhập lại.'
        : res.status === 403
        ? 'Bạn không có quyền quản trị viên (yêu cầu ADMIN).'
        : res.status === 404
        ? 'Không tìm thấy người dùng trong hệ thống.'
        : res.status === 409
        ? 'Tên đăng nhập hoặc email đã tồn tại trong hệ thống.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminUserService = {
  /**
   * Lấy danh sách người dùng phân trang & tìm kiếm từ Backend Admin API
   */
  async getAllUsers(params: GetUsersParams = {}): Promise<PageResponseUserResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.role && params.role !== 'ALL') {
      query.set('role', params.role);
    }
    if (params.status && params.status !== 'ALL') {
      query.set('status', params.status);
    }
    if (params.page !== undefined) {
      query.set('page', String(params.page));
    }
    if (params.size !== undefined) {
      query.set('size', String(params.size));
    }
    if (params.sort && params.sort.length > 0) {
      params.sort.forEach((s) => query.append('sort', s));
    } else {
      query.set('sort', 'createdDate,DESC');
    }

    const queryString = query.toString();
    const url = `${API_ENDPOINTS.ADMIN.USERS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponseUserResponse>(response);
  },

  /**
   * Lấy thông tin chi tiết một người dùng theo ID
   */
  async getUserById(id: string | number): Promise<BackendUserResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.USER_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<BackendUserResponse>(response);
  },

  /**
   * Thêm mới người dùng
   */
  async createUser(payload: UserCreateRequest): Promise<BackendUserResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.USERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<BackendUserResponse>(response);
  },

  /**
   * Cập nhật thông tin người dùng
   */
  async updateUser(id: string | number, payload: UserUpdateRequest): Promise<BackendUserResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.USER_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<BackendUserResponse>(response);
  },

  /**
   * Chuyển trạng thái người dùng (ACTIVE, INACTIVE, BANNED)
   */
  async updateUserStatus(id: string | number, status: BackendStatus): Promise<BackendUserResponse> {
    const payload: UserStatusUpdateRequest = { status };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.USER_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<BackendUserResponse>(response);
  },

  /**
   * Xóa mềm người dùng
   */
  async deleteUser(id: string | number): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.USER_DETAIL(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await handleResponse<void>(response);
  },
};
