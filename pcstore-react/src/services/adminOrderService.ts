import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  OrderResponse,
  PageResponseOrderResponse,
  OrderCreateRequest,
  OrderStatusUpdateRequest,
  GetOrdersParams,
  OrderStatus,
} from '../types/adminOrder';

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
        ? 'Phiên làm việc hết hạn hoặc chưa đăng nhập quản trị viên. Vui lòng đăng nhập lại.'
        : res.status === 403
        ? 'Bạn không có quyền quản trị viên hoặc nhân viên để thao tác đơn hàng.'
        : res.status === 404
        ? 'Không tìm thấy đơn hàng trong hệ thống.'
        : res.status === 409
        ? 'Mã đơn hàng đã tồn tại hoặc trạng thái hiện tại không cho phép thao tác này.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminOrderService = {
  /**
   * Lấy danh sách đơn hàng phân trang & tìm kiếm từ Backend API
   */
  async getAllOrders(params: GetOrdersParams = {}): Promise<PageResponseOrderResponse> {
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
    if (params.userId !== undefined && params.userId !== '' && params.userId !== 'ALL') {
      query.set('userId', String(params.userId));
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
   * Tra cứu đơn hàng theo mã (code)
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
   * Tạo đơn hàng mới (bán lẻ tại quầy hoặc tạo hộ khách hàng)
   */
  async createOrder(data: OrderCreateRequest): Promise<OrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse<OrderResponse>(response);
  },

  /**
   * Cập nhật trạng thái đơn hàng (PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED, RETURNED, REJECTED)
   */
  async updateOrderStatus(id: number | string, status: OrderStatus): Promise<OrderResponse> {
    const payload: OrderStatusUpdateRequest = { status };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDER_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<OrderResponse>(response);
  },

  /**
   * Xóa đơn hàng (soft delete)
   */
  async deleteOrder(id: number | string): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.ORDER_DETAIL(id), {
      method: 'DELETE',
    });

    return handleResponse<void>(response);
  },
};

