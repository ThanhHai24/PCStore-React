import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  BrandResponse,
  PageResponseBrandResponse,
  BrandCreateRequest,
  BrandUpdateRequest,
  BrandStatusUpdateRequest,
  GetBrandsParams,
} from '../types/adminBrand';

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
        ? 'Không tìm thấy thương hiệu trong hệ thống.'
        : res.status === 409
        ? 'Tên hoặc đường dẫn slug của thương hiệu đã tồn tại.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminBrandService = {
  /**
   * Lấy danh sách thương hiệu phân trang & tìm kiếm từ Backend Admin API
   */
  async getAllBrands(params: GetBrandsParams = {}): Promise<PageResponseBrandResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status !== undefined && params.status !== '' && params.status !== 'ALL') {
      query.set('status', String(params.status));
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
    const url = `${API_ENDPOINTS.ADMIN.BRANDS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponseBrandResponse>(response);
  },

  /**
   * Lấy thông tin chi tiết một thương hiệu theo ID
   */
  async getBrandById(id: string | number): Promise<BrandResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.BRAND_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<BrandResponse>(response);
  },

  /**
   * Lấy thông tin chi tiết thương hiệu theo Slug
   */
  async getBrandBySlug(slug: string): Promise<BrandResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.BRAND_BY_SLUG(slug), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<BrandResponse>(response);
  },

  /**
   * Lấy tất cả thương hiệu đang hoạt động (Public / Dropdowns)
   */
  async getAllActiveBrands(): Promise<BrandResponse[]> {
    const response = await fetch(API_ENDPOINTS.BRANDS.ALL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<BrandResponse[]>(response);
  },

  /**
   * Thêm mới thương hiệu
   */
  async createBrand(payload: BrandCreateRequest): Promise<BrandResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.BRANDS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<BrandResponse>(response);
  },

  /**
   * Cập nhật thông tin thương hiệu
   */
  async updateBrand(id: string | number, payload: BrandUpdateRequest): Promise<BrandResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.BRAND_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<BrandResponse>(response);
  },

  /**
   * Chuyển trạng thái thương hiệu (ACTIVE: 1, INACTIVE: 0)
   */
  async updateBrandStatus(id: string | number, status: number): Promise<BrandResponse> {
    const payload: BrandStatusUpdateRequest = { status };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.BRAND_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<BrandResponse>(response);
  },

  /**
   * Xóa mềm thương hiệu
   */
  async deleteBrand(id: string | number): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.BRAND_DETAIL(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    await handleResponse<void>(response);
  },

  /**
   * Lấy danh sách sản phẩm thuộc một thương hiệu cụ thể
   */
  async getProductsByBrand(brandId: string | number, page: number = 0, size: number = 10): Promise<any> {
    const url = `${API_ENDPOINTS.PRODUCTS.LIST}?brandId=${brandId}&page=${page}&size=${size}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<any>(response);
  },
};
