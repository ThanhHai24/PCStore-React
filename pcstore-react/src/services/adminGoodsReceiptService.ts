import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  GoodsReceiptResponse,
  PageResponseGoodsReceiptResponse,
  GoodsReceiptCreateRequest,
  GoodsReceiptUpdateRequest,
  GoodsReceiptStatusUpdateRequest,
  GetGoodsReceiptsParams,
  GoodsReceiptStatus,
  PurchaseOrderItemReceiptInfo,
  ProductSerialResponse,
} from '../types/adminGoodsReceipt';

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
        ? 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại thông tin phiếu nhập và danh sách serial.'
        : res.status === 401
        ? 'Phiên làm việc hết hạn hoặc chưa đăng nhập quản trị viên. Vui lòng đăng nhập lại.'
        : res.status === 403
        ? 'Bạn không có quyền quản trị viên (yêu cầu ADMIN).'
        : res.status === 404
        ? 'Không tìm thấy phiếu nhập hàng trong hệ thống.'
        : res.status === 409
        ? 'Mã phiếu nhập đã tồn tại hoặc trạng thái hiện tại của phiếu không cho phép thực hiện thao tác này.'
        : `Lỗi kết nối máy chủ (${res.status})`);

    throw new Error(errorMsg);
  }

  return data as T;
}

export const adminGoodsReceiptService = {
  /**
   * Lấy danh sách phiếu nhập hàng phân trang & tìm kiếm từ Backend API
   */
  async getAllReceipts(params: GetGoodsReceiptsParams = {}): Promise<PageResponseGoodsReceiptResponse> {
    const query = new URLSearchParams();

    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }
    if (params.status && params.status !== 'ALL') {
      query.set('status', params.status);
    }
    if (params.purchaseOrderId !== undefined && params.purchaseOrderId !== '' && params.purchaseOrderId !== 'ALL') {
      query.set('purchaseOrderId', String(params.purchaseOrderId));
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
    const url = `${API_ENDPOINTS.ADMIN.GOODS_RECEIPTS}${queryString ? `?${queryString}` : ''}`;

    const response = await fetchWithAuth(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PageResponseGoodsReceiptResponse>(response);
  },

  /**
   * Lấy chi tiết phiếu nhập hàng theo ID
   */
  async getReceiptById(id: string | number): Promise<GoodsReceiptResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.GOODS_RECEIPT_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<GoodsReceiptResponse>(response);
  },

  /**
   * Lấy chi tiết phiếu nhập theo Mã code
   */
  async getReceiptByCode(code: string): Promise<GoodsReceiptResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.GOODS_RECEIPT_BY_CODE(code), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<GoodsReceiptResponse>(response);
  },

  /**
   * Tạo mới phiếu nhập hàng (mặc định PENDING hoặc DRAFT)
   */
  async createReceipt(payload: GoodsReceiptCreateRequest): Promise<GoodsReceiptResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.GOODS_RECEIPTS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<GoodsReceiptResponse>(response);
  },

  /**
   * Cập nhật phiếu nhập (Chỉ áp dụng khi phiếu ở trạng thái DRAFT)
   */
  async updateReceipt(id: string | number, payload: GoodsReceiptUpdateRequest): Promise<GoodsReceiptResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.GOODS_RECEIPT_DETAIL(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleResponse<GoodsReceiptResponse>(response);
  },

  /**
   * Cập nhật trạng thái phiếu nhập (DRAFT -> PENDING -> CONFIRMED, hoặc REJECTED, CANCELLED)
   */
  async updateReceiptStatus(id: string | number, status: GoodsReceiptStatus): Promise<GoodsReceiptResponse> {
    const body: GoodsReceiptStatusUpdateRequest = { status };
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.GOODS_RECEIPT_STATUS(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return handleResponse<GoodsReceiptResponse>(response);
  },

  /**
   * Xóa phiếu nhập (Chỉ áp dụng khi phiếu ở trạng thái DRAFT)
   */
  async deleteReceipt(id: string | number): Promise<void> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.GOODS_RECEIPT_DETAIL(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<void>(response);
  },

  /**
   * Lấy danh sách mặt hàng trong đơn đặt hàng PO tương ứng cùng số lượng đã nhận và còn lại
   */
  async getOrderItemsForReceipt(purchaseOrderId: string | number): Promise<PurchaseOrderItemReceiptInfo[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_ORDER_RECEIPT_ITEMS(purchaseOrderId), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<PurchaseOrderItemReceiptInfo[]>(response);
  },

  /**
   * Tra cứu chi tiết một serial theo ID
   */
  async getSerialById(id: string | number): Promise<ProductSerialResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_SERIAL_DETAIL(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<ProductSerialResponse>(response);
  },

  /**
   * Tra cứu chi tiết một serial theo số serial
   */
  async getSerialByNumber(serialNumber: string): Promise<ProductSerialResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_SERIAL_BY_NUMBER(serialNumber), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<ProductSerialResponse>(response);
  },

  /**
   * Lấy danh sách serial còn hiệu lực theo sản phẩm
   */
  async getActiveSerialsByProduct(productId: string | number): Promise<ProductSerialResponse[]> {
    const response = await fetchWithAuth(API_ENDPOINTS.ADMIN.PRODUCT_SERIALS_BY_PRODUCT(productId), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<ProductSerialResponse[]>(response);
  },
};
