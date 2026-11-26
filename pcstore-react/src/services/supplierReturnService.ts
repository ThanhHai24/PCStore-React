import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import { adminSupplierService } from './adminSupplierService';
import { productService } from './productService';
import { deliveryService } from './deliveryService';
import type { ProductSerialResponse } from '../types/adminGoodsReceipt';
import type {
  SupplierReturnOrder,
  SupplierReturnStatus,
  ReturnResolutionType,
  DefectiveSerialCandidate,
  SupplierReturnItem,
} from '../types/supplierReturn';

interface BackendPurchaseReturnItem {
  id: number;
  purchaseReturnId: number;
  productSerialId: number;
  serialNumber: string;
  productId: number;
  productCode: string;
  productName: string;
  unitCost: number;
  receiptCode?: string | null;
  receiptDate?: string | null;
}

interface BackendPurchaseReturnResponse {
  id: number;
  code: string;
  name?: string | null;
  supplierId: number;
  supplierCode?: string | null;
  supplierName?: string | null;
  reason?: string | null;
  description?: string | null;
  returnDate?: string | null;
  totalAmount: number;
  totalItems: number;
  status: 'PENDING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | number;
  items?: BackendPurchaseReturnItem[];
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

interface BackendAvailableSerialResponse {
  productSerialId: number;
  serialNumber: string;
  productId: number;
  productCode: string;
  productName: string;
  status: string;
  unitCost: number;
  receiptCode?: string | null;
  receiptDate?: string | null;
}

function mapBackendStatusToUI(status: BackendPurchaseReturnResponse['status']): SupplierReturnStatus {
  const s = String(status).toUpperCase();
  if (s === '1' || s === 'DELIVERING') return 'HANDED_OVER';
  if (s === '2' || s === 'COMPLETED') return 'COMPLETED';
  if (s === '3' || s === 'CANCELLED') return 'CANCELLED';
  if (s === '4' || s === 'RETURNED') return 'DELIVERED_SUPPLIER';
  return 'WAITING_PACK';
}

function mapBackendToUI(raw: BackendPurchaseReturnResponse): SupplierReturnOrder {
  const uiStatus = mapBackendStatusToUI(raw.status);
  const items: SupplierReturnItem[] = (raw.items || []).map((it) => ({
    id: String(it.id),
    serialId: it.productSerialId,
    serialNumber: it.serialNumber,
    productId: it.productId,
    productName: it.productName,
    productCode: it.productCode,
    productPrice: it.unitCost || 0,
    defectReason: raw.reason || 'Lỗi kỹ thuật / hoàn trả NCC',
    goodsReceiptCode: it.receiptCode || undefined,
    isPacked: uiStatus !== 'WAITING_PACK',
  }));

  return {
    id: String(raw.id),
    code: raw.code,
    supplierId: raw.supplierId,
    supplierName: raw.supplierName || `NCC #${raw.supplierId}`,
    supplierCode: raw.supplierCode || `NCC-${raw.supplierId}`,
    supplierPhone: '---',
    supplierEmail: '---',
    status: uiStatus,
    resolution: 'REPLACE',
    returnReasonGeneral: raw.reason || '',
    managerNotes: raw.description || undefined,
    items,
    totalQuantity: raw.totalItems ?? items.length,
    totalEstimatedValue: raw.totalAmount ?? items.reduce((sum, i) => sum + i.productPrice, 0),
    createdByName: raw.createdBy ? `User #${raw.createdBy}` : 'Quản lý',
    createdAt: raw.returnDate || raw.createdDate || new Date().toISOString(),
    history: [
      {
        id: `log-init-${raw.id}`,
        stageNumber: 1,
        stageName: 'GĐ 1: Khởi tạo phiếu hoàn trả',
        title: raw.name || `Tạo phiếu hoàn trả ${raw.code}`,
        actorName: raw.createdBy ? `User #${raw.createdBy}` : 'Hệ thống',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: raw.createdDate || new Date().toISOString(),
        note: raw.reason || undefined,
      },
    ],
  };
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.detail || data?.message || data?.error || `${fallback} (${res.status})`;
}

export const supplierReturnService = {
  /**
   * Lấy danh sách phiếu hoàn hàng từ Backend GET /api/purchase-returns
   */
  async getOrders(): Promise<SupplierReturnOrder[]> {
    const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.PURCHASE_RETURNS}?page=0&size=100&sort=createdDate,DESC`);
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể tải danh sách phiếu hoàn trả'));
    }
    const pageData = await res.json();
    const list: BackendPurchaseReturnResponse[] = pageData?.content || [];
    return list.map(mapBackendToUI);
  },

  /**
   * Lấy chi tiết một phiếu hoàn hàng từ Backend GET /api/purchase-returns/{id}
   */
  async getOrderById(id: string | number): Promise<SupplierReturnOrder> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_RETURN_DETAIL(id));
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không tìm thấy phiếu hoàn trả #${id}`));
    }
    const raw: BackendPurchaseReturnResponse = await res.json();
    return mapBackendToUI(raw);
  },

  /**
   * GIAI ĐOẠN 1: Tạo phiếu hoàn trả mới qua POST /api/purchase-returns
   */
  async createOrder(input: {
    supplierId: number;
    supplierName: string;
    supplierCode: string;
    supplierPhone: string;
    supplierEmail: string;
    supplierAddress?: string;
    resolution: ReturnResolutionType;
    returnReasonGeneral: string;
    managerNotes?: string;
    createdByName: string;
    selectedSerials: DefectiveSerialCandidate[];
  }): Promise<SupplierReturnOrder> {
    const code = `PR-${Date.now().toString().slice(-8)}`;
    const payload = {
      code,
      name: `Hoàn trả hàng ${input.supplierName}`,
      supplierId: input.supplierId,
      reason: input.returnReasonGeneral,
      description: input.managerNotes || undefined,
      returnDate: new Date().toISOString(),
      status: 'PENDING',
      serialNumbers: input.selectedSerials.map((s) => s.serialNumber),
      productSerialIds: input.selectedSerials.map((s) => s.serialId).filter((id) => Boolean(id)),
    };

    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_RETURNS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể tạo phiếu hoàn trả'));
    }
    const created: BackendPurchaseReturnResponse = await res.json();
    return mapBackendToUI(created);
  },

  /**
   * GIAI ĐOẠN 2: Xác nhận đóng gói (giữ trạng thái PENDING ở BE hoặc chuẩn bị bàn giao)
   */
  async confirmPacking(
    orderId: string,
    _input: { warehouseStaff: string; warehouseNotes?: string; packedItemIds: string[] }
  ): Promise<SupplierReturnOrder> {
    return this.getOrderById(orderId);
  },

  /**
   * GIAI ĐOẠN 2 -> 3: Bàn giao cho ĐVVC (PATCH /api/purchase-returns/{id}/status -> DELIVERING)
   */
  async handoverToCarrier(
    orderId: string,
    _input: {
      carrierName: string;
      trackingNumber: string;
      carrierPhone?: string;
      carrierNotes?: string;
      staffName: string;
    }
  ): Promise<SupplierReturnOrder> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_RETURN_STATUS(orderId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DELIVERING' }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể cập nhật bàn giao ĐVVC'));
    }

    // Đồng bộ tạo/cập nhật vận đơn cho phiếu hoàn trả NCC qua /api/deliveries
    try {
      const returnId = Number(orderId);
      const existing = await deliveryService.getDeliveryByResource('PURCHASE_RETURN', returnId);
      if (existing) {
        await deliveryService.updateDeliveryMetadata(existing.id, {
          carrierName: _input.carrierName,
          trackingCode: _input.trackingNumber,
        });
      } else {
        await deliveryService.createDelivery({
          resourceType: 'PURCHASE_RETURN',
          resourceId: returnId,
          carrierName: _input.carrierName,
          trackingCode: _input.trackingNumber,
          shippingFee: 0,
        });
      }
    } catch (e) {
      console.warn('Backend sync delivery for PURCHASE_RETURN warning:', e);
    }

    return mapBackendToUI(await res.json());
  },

  /**
   * GIAI ĐOẠN 3 -> 4: Xác nhận đã giao tới NCC (PATCH /api/purchase-returns/{id}/status -> RETURNED)
   */
  async confirmDeliveredToSupplier(
    orderId: string,
    _input: { receivedByAtSupplier: string; deliveryNotes?: string }
  ): Promise<SupplierReturnOrder> {
    try {
      const existing = await deliveryService.getDeliveryByResource('PURCHASE_RETURN', Number(orderId));
      if (existing && existing.status !== 'DELIVERED') {
        await deliveryService.updateDeliveryStatus(existing.id, 'DELIVERED');
      }
    } catch (e) {
      console.warn('Backend sync delivery DELIVERED for PURCHASE_RETURN warning:', e);
    }

    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_RETURN_STATUS(orderId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RETURNED' }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể cập nhật trạng thái đã giao NCC'));
    }
    return mapBackendToUI(await res.json());
  },

  /**
   * GIAI ĐOẠN 4: Xác nhận hoàn tất (PATCH /api/purchase-returns/{id}/status -> COMPLETED)
   */
  async completeOrder(
    orderId: string,
    _input: { managerName: string; supplierFeedbackNote: string }
  ): Promise<SupplierReturnOrder> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.PURCHASE_RETURN_STATUS(orderId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể hoàn tất phiếu hoàn trả'));
    }
    return mapBackendToUI(await res.json());
  },

  /**
   * Lấy danh sách serial chờ hoàn trả phân trang trực tiếp từ GET /api/product-serials?status=PENDING_RETURN
   */
  async getPendingReturnSerials(params: {
    page?: number;
    size?: number;
    supplierId?: string | number;
    keyword?: string;
    status?: string;
  } = {}): Promise<{
    items: DefectiveSerialCandidate[];
    totalElements: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    query.set('status', params.status || 'PENDING_RETURN');
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 10));
    query.set('sort', 'createdDate,DESC');

    if (params.supplierId && params.supplierId !== 'ALL') {
      query.set('supplierId', String(params.supplierId));
    }
    if (params.keyword && params.keyword.trim()) {
      query.set('keyword', params.keyword.trim());
    }

    const url = `${API_ENDPOINTS.ADMIN.PRODUCT_SERIALS}?${query.toString()}`;
    const [serialRes, prodRes, supRes] = await Promise.all([
      fetchWithAuth(url),
      productService.getProducts({ size: 200 }).catch(() => ({ content: [] })),
      adminSupplierService.getAllSuppliers({ size: 100 }).catch(() => ({ content: [] })),
    ]);

    if (!serialRes.ok) {
      throw new Error(await parseErrorMessage(serialRes, 'Không thể tải danh sách serial chờ hoàn trả'));
    }

    const pageData = await serialRes.json();
    const rawSerials: ProductSerialResponse[] = pageData?.content || [];
    const prodMap = new Map<number, any>();
    (prodRes?.content || []).forEach((p: any) => prodMap.set(p.id, p));

    const supMap = new Map<number, any>();
    (supRes?.content || []).forEach((s: any) => supMap.set(s.id, s));

    const items: DefectiveSerialCandidate[] = rawSerials.map((ser) => {
      const prod = prodMap.get(ser.productId);
      const supId = prod?.supplierId ? Number(prod.supplierId) : (params.supplierId && params.supplierId !== 'ALL' ? Number(params.supplierId) : 0);
      const sup = supId ? supMap.get(supId) : undefined;
      return {
        serialId: ser.id,
        serialNumber: ser.serialNumber,
        productId: ser.productId,
        productName: prod?.name || `Sản phẩm #${ser.productId}`,
        productCode: prod?.code || `SP-${ser.productId}`,
        productPrice: prod?.price || 0,
        supplierId: sup?.id || supId || 0,
        supplierName: sup?.name || (supId ? `NCC #${supId}` : 'Theo phiếu nhập'),
        supplierCode: sup?.code || (supId ? `NCC-${supId}` : '---'),
        defectReason: `Trạng thái kho: ${ser.status}`,
        status: ser.status,
        isInActiveReturnOrder: false,
      };
    });

    return {
      items,
      totalElements: pageData?.totalElements ?? items.length,
      totalPages: pageData?.totalPages ?? 1,
    };
  },

  /**
   * Lấy danh sách serial chờ hoàn trả (dùng cho modal tạo phiếu hoàn hàng)
   */
  async getDefectiveSerialsCandidates(supplierId?: string | number): Promise<DefectiveSerialCandidate[]> {
    const res = await this.getPendingReturnSerials({
      page: 0,
      size: 100,
      supplierId,
      status: 'PENDING_RETURN',
    });
    return res.items;
  },
};
