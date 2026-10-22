import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  ProductResponse,
  PageResponseProductResponse,
  ProductCreateRequest,
  ProductUpdateRequest,
  BackendProductStatus,
  GetProductsParams,
} from '../types/adminProduct';

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
            ? 'Không tìm thấy sản phẩm trong hệ thống.'
            : res.status === 409
              ? 'Mã hoặc đường dẫn slug của sản phẩm đã tồn tại.'
              : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminProductService = {

  async getAllProducts(params: GetProductsParams = {}): Promise<PageResponseProductResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status !== undefined && params.status !== '' && params.status !== 'ALL') {
      query.set('status', String(params.status));
    }
    if (params.productType !== undefined && params.productType !== '' && params.productType !== 'ALL') {
      query.set('productType', String(params.productType));
    }
    if (params.brandId !== undefined && params.brandId !== '' && params.brandId !== 'ALL') {
      query.set('brandId', String(params.brandId));
    }
    if (params.categoryId !== undefined && params.categoryId !== '' && params.categoryId !== 'ALL') {
      query.set('categoryId', String(params.categoryId));
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
    const url = `${API_ENDPOINTS.ADMIN.PRODUCTS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
    });

    return handleResponse<PageResponseProductResponse>(response);
  },

  async getProductById(id: number | string): Promise<ProductResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_DETAIL(id), {
      method: 'GET',
    });

    return handleResponse<ProductResponse>(response);
  },

  async getProductBySlug(slug: string): Promise<ProductResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_BY_SLUG(slug), {
      method: 'GET',
    });

    return handleResponse<ProductResponse>(response);
  },

  async createProduct(data: ProductCreateRequest): Promise<ProductResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCTS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<ProductResponse>(response);
  },

  async updateProduct(id: number | string, data: ProductUpdateRequest): Promise<ProductResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<ProductResponse>(response);
  },

  async updateProductStatus(id: number | string, status: BackendProductStatus): Promise<ProductResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    return handleResponse<ProductResponse>(response);
  },

  async deleteProduct(id: number | string): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_DETAIL(id), {
      method: 'DELETE',
    });

    return handleResponse<void>(response);
  },
};
