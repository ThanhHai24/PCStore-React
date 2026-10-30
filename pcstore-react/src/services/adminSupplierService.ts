import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  SupplierResponse,
  PageResponseSupplierResponse,
  SupplierCreateRequest,
  SupplierUpdateRequest,
  GetSuppliersParams,
  BackendSupplierStatus,
} from '../types/adminSupplier';

/**
 * Chuyển đổi trạng thái linh hoạt (number hoặc string) sang BackendSupplierStatus ('ACTIVE' | 'INACTIVE')
 */
export function toBackendStatus(
  status?: BackendSupplierStatus | number | string | null
): BackendSupplierStatus | undefined {
  if (status === undefined || status === null || status === '' || status === 'ALL') {
    return undefined;
  }
  if (status === 1 || status === '1' || status === 'ACTIVE') {
    return 'ACTIVE';
  }
  if (status === 0 || status === '0' || status === 'INACTIVE') {
    return 'INACTIVE';
  }
  return String(status).toUpperCase() as BackendSupplierStatus;
}

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
      (res.status === 400
        ? 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại định dạng mã, email hoặc SĐT.'
        : res.status === 401
          ? 'Phiên làm việc hết hạn hoặc chưa đăng nhập quản trị viên. Vui lòng đăng nhập lại.'
          : res.status === 403
            ? 'Bạn không có quyền quản trị viên (yêu cầu ADMIN).'
            : res.status === 404
              ? 'Không tìm thấy nhà cung cấp trong hệ thống.'
              : res.status === 409
                ? 'Mã nhà cung cấp, email hoặc mã số thuế đã tồn tại trên hệ thống.'
                : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminSupplierService = {
  /**
   * Lấy danh sách nhà cung cấp phân trang & tìm kiếm từ Backend Admin API
   */
  async getAllSuppliers(params: GetSuppliersParams = {}): Promise<PageResponseSupplierResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status && String(params.status).trim() && String(params.status).toUpperCase() !== 'ALL') {
      const formattedStatus = toBackendStatus(params.status);
      if (formattedStatus) {
        query.set('status', formattedStatus);
      }
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
    const url = `${API_ENDPOINTS.ADMIN.SUPPLIERS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponseSupplierResponse>(response);
  },

  /**
   * Lấy thông tin chi tiết một nhà cung cấp theo ID
   */
  async getSupplierById(id: string | number): Promise<SupplierResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.SUPPLIER_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<SupplierResponse>(response);
  },

  /**
   * Lấy thông tin nhà cung cấp theo Mã
   */
  async getSupplierByCode(code: string): Promise<SupplierResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.SUPPLIER_BY_CODE(encodeURIComponent(code)), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<SupplierResponse>(response);
  },

  /**
   * Thêm mới nhà cung cấp
   */
  async createSupplier(payload: SupplierCreateRequest): Promise<SupplierResponse> {
    const body = {
      ...payload,
      status: toBackendStatus(payload.status),
    };

    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.SUPPLIERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return handleResponse<SupplierResponse>(response);
  },

  /**
   * Cập nhật thông tin nhà cung cấp
   */
  async updateSupplier(id: string | number, payload: SupplierUpdateRequest): Promise<SupplierResponse> {
    const body = {
      ...payload,
      status: toBackendStatus(payload.status),
    };

    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.SUPPLIER_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return handleResponse<SupplierResponse>(response);
  },

  /**
   * Cập nhật trạng thái nhà cung cấp (ACTIVE: 1 hoặc INACTIVE: 0)
   */
  async updateSupplierStatus(id: string | number, status: BackendSupplierStatus | number): Promise<SupplierResponse> {
    const body = { status: toBackendStatus(status) };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.SUPPLIER_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return handleResponse<SupplierResponse>(response);
  },

  /**
   * Xóa mềm nhà cung cấp
   */
  async deleteSupplier(id: string | number): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.SUPPLIER_DETAIL(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<void>(response);
  },

  /**
   * Lấy danh sách đơn nhập hàng liên quan của nhà cung cấp
   */
  async getSupplierOrders(supplierId: string | number): Promise<any[]> {
    try {
      const url = `${API_ENDPOINTS.ADMIN.PURCHASE_ORDERS}?supplierId=${supplierId}&page=0&size=20`;
      const response = await fetchWithAuth(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data?.content) ? data.content : [];
    } catch {
      return [];
    }
  },
};
