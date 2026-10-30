import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  OrderCreateRequest,
  OrderResponse,
  PageResponseOrderResponse,
  GetOrdersParams,
  OrderStatusUpdateRequest,
} from '../types/order';

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
        ? 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại thông tin đơn hàng.'
        : res.status === 401
        ? 'Vui lòng đăng nhập để thực hiện đặt hàng.'
        : res.status === 403
        ? 'Bạn không có quyền thao tác trên đơn hàng này.'
        : res.status === 404
        ? 'Không tìm thấy thông tin đơn hàng hoặc sản phẩm.'
        : res.status === 409
        ? 'Đơn hàng không thể thực hiện do xung đột dữ liệu hoặc trạng thái không hợp lệ.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const orderService = {
  /**
   * Tạo đơn hàng mới từ giỏ hàng (Áp dụng COD / ONLINE)
   */
  async createOrder(payload: OrderCreateRequest): Promise<OrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<OrderResponse>(response);
  },

  /**
   * Lấy danh sách đơn hàng của người dùng hiện tại
   */
  async getMyOrders(params: GetOrdersParams = {}): Promise<PageResponseOrderResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status && params.status !== 'ALL') {
      query.set('status', params.status);
    }
    if (params.type && params.type !== 'ALL') {
      query.set('type', params.type);
    }
    if (params.fromDate && params.fromDate.trim()) {
      query.set('fromDate', params.fromDate.trim());
    }
    if (params.toDate && params.toDate.trim()) {
      query.set('toDate', params.toDate.trim());
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
      query.set('sort', 'createdDate,desc');
    }

    const queryString = query.toString();
    const url = `${API_ENDPOINTS.ADMIN.ORDERS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponseOrderResponse>(response);
  },

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  async getOrderById(id: number | string): Promise<OrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDER_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<OrderResponse>(response);
  },

  /**
   * Tra cứu đơn hàng theo mã đơn (code)
   */
  async getOrderByCode(code: string): Promise<OrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDER_BY_CODE(code), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<OrderResponse>(response);
  },

  /**
   * Khách hàng hủy đơn hàng khi đơn còn ở trạng thái PENDING
   */
  async cancelOrder(id: number | string): Promise<OrderResponse> {
    const payload: OrderStatusUpdateRequest = { status: 'CANCELLED' };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDER_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<OrderResponse>(response);
  },
};

