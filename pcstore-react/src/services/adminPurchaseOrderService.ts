import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  PurchaseOrderResponse,
  PageResponsePurchaseOrderResponse,
  PurchaseOrderCreateRequest,
  PurchaseOrderUpdateRequest,
  PurchaseOrderStatusUpdateRequest,
  GetPurchaseOrdersParams,
  PurchaseOrderItemReceiptInfo,
  PurchaseOrderStatus,
} from '../types/adminPurchaseOrder';

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
        ? 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại thông tin đơn nhập và danh sách mặt hàng.'
        : res.status === 401
        ? 'Phiên làm việc hết hạn hoặc chưa đăng nhập quản trị viên. Vui lòng đăng nhập lại.'
        : res.status === 403
        ? 'Bạn không có quyền quản trị viên (yêu cầu ADMIN).'
        : res.status === 404
        ? 'Không tìm thấy đơn nhập hàng trong hệ thống.'
        : res.status === 409
        ? 'Mã đơn nhập đã tồn tại hoặc trạng thái hiện tại của đơn không cho phép thực hiện thao tác này.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminPurchaseOrderService = {
  /**
   * Lấy danh sách đơn nhập hàng phân trang & tìm kiếm từ Backend API
   */
  async getAllOrders(params: GetPurchaseOrdersParams = {}): Promise<PageResponsePurchaseOrderResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status && params.status !== 'ALL') {
      query.set('status', params.status);
    }
    if (params.supplierId !== undefined && params.supplierId !== '' && params.supplierId !== 'ALL') {
      query.set('supplierId', String(params.supplierId));
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
      query.set('sort', 'createdDate,DESC');
    }

    const queryString = query.toString();
    const url = `${API_ENDPOINTS.ADMIN.PURCHASE_ORDERS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponsePurchaseOrderResponse>(response);
  },

  /**
   * Lấy chi tiết đơn nhập hàng theo ID
   */
  async getOrderById(id: string | number): Promise<PurchaseOrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PurchaseOrderResponse>(response);
  },

  /**
   * Lấy chi tiết đơn nhập hàng theo Mã đơn
   */
  async getOrderByCode(code: string): Promise<PurchaseOrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_BY_CODE(encodeURIComponent(code)), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PurchaseOrderResponse>(response);
  },

  /**
   * Thêm mới đơn nhập hàng (mặc định trạng thái DRAFT từ backend)
   */
  async createOrder(payload: PurchaseOrderCreateRequest): Promise<PurchaseOrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDERS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<PurchaseOrderResponse>(response);
  },

  /**
   * Cập nhật thông tin đơn nhập (Chỉ áp dụng khi đơn ở trạng thái DRAFT)
   */
  async updateOrder(id: string | number, payload: PurchaseOrderUpdateRequest): Promise<PurchaseOrderResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<PurchaseOrderResponse>(response);
  },

  /**
   * Cập nhật trạng thái đơn nhập (DRAFT -> PENDING -> APPROVED -> RECEIVED hoặc CANCELLED)
   */
  async updateOrderStatus(id: string | number, status: PurchaseOrderStatus): Promise<PurchaseOrderResponse> {
    const body: PurchaseOrderStatusUpdateRequest = { status };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return handleResponse<PurchaseOrderResponse>(response);
  },

  /**
   * Xóa mềm đơn nhập nháp (Chỉ xóa đơn DRAFT chưa phát sinh phiếu nhập)
   */
  async deleteOrder(id: string | number): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_DETAIL(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<void>(response);
  },

  /**
   * Lấy thông tin các dòng mặt hàng dùng cho việc lập phiếu nhập kho
   */
  async getOrderItemsForReceipt(id: string | number): Promise<PurchaseOrderItemReceiptInfo[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_RECEIPT_ITEMS(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PurchaseOrderItemReceiptInfo[]>(response);
  },
};
