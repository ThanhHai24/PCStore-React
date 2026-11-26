import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';

export type BackendPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface BackendPaymentMethodResponse {
  id: number;
  code: string;
  name: string;
  type: 'CASH' | 'ONLINE' | string;
  bankName?: string | null;
  accountNumber?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
}

export interface BackendPaymentResponse {
  id: number;
  orderId: number;
  orderCode?: string | null;
  paymentMethodId?: number | null;
  paymentMethodCode: string;
  paymentMethodName?: string | null;
  amount: number;
  transactionCode?: string | null;
  status: BackendPaymentStatus | string;
  paidAt?: string | null;
  createdDate?: string | null;
  lastModifiedDate?: string | null;
}

export interface ZaloPayCreateRequest {
  orderId: number;
  bankCode?: string;
  redirectUrl?: string;
}

export interface ZaloPayCreateResponse {
  paymentId: number;
  orderId: number;
  orderCode?: string | null;
  appTransId: string;
  amount: number;
  orderUrl: string;
  zpTransToken?: string | null;
  qrCode?: string | null;
  returnCode?: number | null;
  returnMessage?: string | null;
}

export interface ZaloPayStatusResponse {
  paymentId?: number | null;
  orderId?: number | null;
  orderCode?: string | null;
  appTransId?: string | null;
  zpTransId?: number | null;
  amount?: number | null;
  paymentStatus?: BackendPaymentStatus | string | null;
  returnCode?: number | null;
  returnMessage?: string | null;
  processing: boolean;
  checksumValid?: boolean | null;
  paid: boolean;
  paidAt?: string | null;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.detail || data?.message || data?.error || `${fallback} (${res.status})`;
}

export const paymentService = {
  /**
   * GET /api/payments/methods
   */
  async getActiveMethods(): Promise<BackendPaymentMethodResponse[]> {
    const res = await fetchWithAuth(API_ENDPOINTS.PAYMENTS.METHODS);
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể tải danh sách phương thức thanh toán'));
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  /**
   * POST /api/payments/cod
   */
  async createCodPayment(orderId: number): Promise<BackendPaymentResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.PAYMENTS.COD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể đăng ký thanh toán COD'));
    }
    return res.json();
  },

  /**
   * POST /api/payments/{orderId}/cod/confirm
   */
  async confirmCodPayment(orderId: number | string): Promise<BackendPaymentResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.PAYMENTS.COD_CONFIRM(orderId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể xác nhận đã thu tiền mặt COD'));
    }
    return res.json();
  },

  /**
   * POST /api/payments/zalopay/create
   */
  async createZaloPayOrder(payload: ZaloPayCreateRequest): Promise<ZaloPayCreateResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.PAYMENTS.ZALOPAY_CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể tạo giao dịch ZaloPay'));
    }
    return res.json();
  },

  /**
   * GET /api/payments/zalopay/return
   */
  async handleZaloPayReturn(queryParams: Record<string, string>): Promise<ZaloPayStatusResponse> {
    const query = new URLSearchParams(queryParams);
    const res = await fetchWithAuth(`${API_ENDPOINTS.PAYMENTS.ZALOPAY_RETURN}?${query.toString()}`);
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể xác thực kết quả trả về từ ZaloPay'));
    }
    return res.json();
  },

  /**
   * GET /api/payments/zalopay/status/{appTransId}
   */
  async queryZaloPayStatus(appTransId: string): Promise<ZaloPayStatusResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.PAYMENTS.ZALOPAY_STATUS(appTransId));
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể truy vấn trạng thái giao dịch ZaloPay'));
    }
    return res.json();
  },

  /**
   * GET /api/payments/order/{orderId}
   */
  async getPaymentsByOrder(orderId: number | string): Promise<BackendPaymentResponse[]> {
    const res = await fetchWithAuth(API_ENDPOINTS.PAYMENTS.BY_ORDER(orderId));
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không thể tải lịch sử thanh toán của đơn #${orderId}`));
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
};
