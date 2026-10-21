import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  CategoryResponse,
  CategoryTreeResponse,
  PageResponseCategoryResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryStatusUpdateRequest,
  GetCategoriesParams,
} from '../types/adminCategory';

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
        ? 'Không tìm thấy danh mục trong hệ thống.'
        : res.status === 409
        ? 'Tên hoặc đường dẫn slug của danh mục đã tồn tại.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminCategoryService = {
  /**
   * Lấy danh sách danh mục phân trang & tìm kiếm từ Backend Admin API
   */
  async getAllCategories(params: GetCategoriesParams = {}): Promise<PageResponseCategoryResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status !== undefined && params.status !== '' && params.status !== 'ALL') {
      query.set('status', String(params.status));
    }
    if (params.parentId !== undefined && params.parentId !== '' && params.parentId !== 'ALL') {
      query.set('parentId', String(params.parentId));
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
    const url = `${API_ENDPOINTS.ADMIN.CATEGORIES}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponseCategoryResponse>(response);
  },

  /**
   * Lấy thông tin chi tiết một danh mục theo ID
   */
  async getCategoryById(id: string | number): Promise<CategoryResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.CATEGORY_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<CategoryResponse>(response);
  },

  /**
   * Lấy toàn bộ cây phân cấp danh mục
   */
  async getCategoryTree(): Promise<CategoryTreeResponse[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.CATEGORY_TREE, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<CategoryTreeResponse[]>(response);
  },

  /**
   * Thêm mới danh mục
   */
  async createCategory(payload: CategoryCreateRequest): Promise<CategoryResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.CATEGORIES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<CategoryResponse>(response);
  },

  /**
   * Cập nhật thông tin danh mục
   */
  async updateCategory(id: string | number, payload: CategoryUpdateRequest): Promise<CategoryResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.CATEGORY_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<CategoryResponse>(response);
  },

  /**
   * Chuyển trạng thái danh mục (ACTIVE: 1, INACTIVE: 0)
   */
  async updateCategoryStatus(id: string | number, status: number): Promise<CategoryResponse> {
    const payload: CategoryStatusUpdateRequest = { status };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.CATEGORY_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<CategoryResponse>(response);
  },

  /**
   * Xóa mềm danh mục
   */
  async deleteCategory(id: string | number): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.CATEGORY_DETAIL(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await handleResponse<void>(response);
  },

  /**
   * Lấy danh sách sản phẩm thuộc một danh mục cụ thể
   */
  async getProductsByCategory(categoryId: string | number, page: number = 0, size: number = 10): Promise<any> {
    const url = `${API_ENDPOINTS.PRODUCTS.LIST}?categoryId=${categoryId}&page=${page}&size=${size}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any>(response);
  },
};
