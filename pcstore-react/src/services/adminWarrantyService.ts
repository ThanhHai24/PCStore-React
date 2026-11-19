import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  WarrantyPolicyResponse,
  WarrantyPolicyCreateRequest,
  WarrantyPolicyUpdateRequest,
  WarrantyPolicyFilterParams,
  PageResponse,
  ProductWarrantyItem,
  ProductWarrantyFilterParams,
  WarrantyRequestItem,
  WarrantyRequestFilterParams,
  WarrantyRequestCreateInput,
  TechnicalHandlingUpdateInput,
  SparePartItem,
  WarrantyHistoryRecord,
} from '../types/adminWarranty';

/**
 * Chuẩn hóa trạng thái chính sách bảo hành sang Backend Enum ('ACTIVE' | 'INACTIVE')
 */
function normalizePolicyStatus(status?: number | string | null): 'ACTIVE' | 'INACTIVE' | undefined {
  if (status === undefined || status === null || status === '' || status === 'ALL') {
    return undefined;
  }
  const str = String(status).trim().toUpperCase();
  if (str === '1' || str === 'ACTIVE') return 'ACTIVE';
  if (str === '0' || str === 'INACTIVE') return 'INACTIVE';
  return undefined;
}

/**
 * Chuẩn hóa đối tượng áp dụng chính sách bảo hành sang Backend Enum ('CATEGORY' | 'PRODUCT' | 'BRAND' | null)
 */
function normalizePolicyTargetType(
  targetType?: number | string | null
): 'CATEGORY' | 'PRODUCT' | 'BRAND' | null | undefined {
  if (
    targetType === undefined ||
    targetType === null ||
    targetType === '' ||
    targetType === 'ALL' ||
    targetType === 'GENERAL' ||
    targetType === 'null'
  ) {
    return null;
  }
  const str = String(targetType).trim().toUpperCase();
  if (str === '0' || str === 'CATEGORY') return 'CATEGORY';
  if (str === '1' || str === 'PRODUCT') return 'PRODUCT';
  if (str === '2' || str === 'BRAND') return 'BRAND';
  return null;
}

/**
 * Trích xuất thông điệp lỗi chi tiết từ phản hồi backend
 */
async function handleApiError(res: Response, defaultMessage: string): Promise<never> {
  let message = defaultMessage;
  try {
    const errorData = await res.json();
    if (errorData?.detail) {
      message = errorData.detail;
    } else if (errorData?.message) {
      message = errorData.message;
    } else if (typeof errorData === 'string') {
      message = errorData;
    } else if (errorData?.errors && typeof errorData.errors === 'object') {
      const fieldErrors = Object.values(errorData.errors).flat().join(', ');
      if (fieldErrors) message = `${message}: ${fieldErrors}`;
    }
  } catch {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      // ignore
    }
  }
  throw new Error(message);
}

export const adminWarrantyService = {
  // ==================== 1. WARRANTY POLICIES ====================

  async getAllPolicies(params: WarrantyPolicyFilterParams = {}): Promise<PageResponse<WarrantyPolicyResponse>> {
    const query = new URLSearchParams();
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());

    const normalizedStatus = normalizePolicyStatus(params.status);
    if (normalizedStatus) {
      query.set('status', normalizedStatus);
    }

    const normalizedTargetType = normalizePolicyTargetType(params.targetType);
    if (normalizedTargetType) {
      query.set('targetType', normalizedTargetType);
    }

    if (params.targetId) query.set('targetId', String(params.targetId));
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.WARRANTY_POLICIES}?${query.toString()}`);
    if (!res.ok) {
      return handleApiError(res, 'Không thể tải danh sách chính sách bảo hành');
    }

    const data = await res.json();
    return {
      content: data.content || [],
      totalElements: data.totalElements ?? (data.content?.length || 0),
      totalPages: data.totalPages ?? 1,
      size: data.pageSize ?? data.size ?? (params.size || 10),
      number: data.pageNumber ?? data.number ?? (params.page || 0),
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? (!data.content || data.content.length === 0),
    };
  },

  async getPolicyById(id: number): Promise<WarrantyPolicyResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_POLICY_DETAIL(id));
    if (!res.ok) {
      return handleApiError(res, `Không tìm thấy chính sách bảo hành #${id}`);
    }
    return await res.json();
  },

  async createPolicy(req: WarrantyPolicyCreateRequest): Promise<WarrantyPolicyResponse> {
    const normalizedTargetType = normalizePolicyTargetType(req.targetType);
    const payload = {
      name: req.name.trim(),
      durationDays: Number(req.durationDays),
      description: req.description?.trim() || undefined,
      targetType: normalizedTargetType ?? null,
      targetId: normalizedTargetType ? req.targetId ?? null : null,
      status: normalizePolicyStatus(req.status) ?? 'ACTIVE',
    };

    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_POLICIES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return handleApiError(res, 'Không thể tạo chính sách bảo hành');
    }
    return await res.json();
  },

  async updatePolicy(id: number, req: WarrantyPolicyUpdateRequest): Promise<WarrantyPolicyResponse> {
    const normalizedTargetType = normalizePolicyTargetType(req.targetType);
    const payload = {
      name: req.name.trim(),
      durationDays: Number(req.durationDays),
      description: req.description?.trim() || undefined,
      targetType: normalizedTargetType ?? null,
      targetId: normalizedTargetType ? req.targetId ?? null : null,
      status: normalizePolicyStatus(req.status) ?? 'ACTIVE',
    };

    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_POLICY_DETAIL(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể cập nhật chính sách bảo hành #${id}`);
    }
    return await res.json();
  },

  async updatePolicyStatus(id: number, status: number | string): Promise<WarrantyPolicyResponse> {
    const statusVal = normalizePolicyStatus(status) ?? 'INACTIVE';
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_POLICY_STATUS(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusVal }),
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể cập nhật trạng thái chính sách #${id}`);
    }
    return await res.json();
  },

  async deletePolicy(id: number): Promise<void> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_POLICY_DETAIL(id), {
      method: 'DELETE',
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể xóa chính sách bảo hành #${id}`);
    }
  },

  // ==================== 2. PRODUCT WARRANTIES ====================

  async getAllWarranties(params: ProductWarrantyFilterParams = {}): Promise<PageResponse<ProductWarrantyItem>> {
    const query = new URLSearchParams();
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.serialNumber?.trim()) query.set('serialNumber', params.serialNumber.trim());
    if (params.orderCode?.trim()) query.set('orderCode', params.orderCode.trim());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.WARRANTIES}?${query.toString()}`);
    if (!res.ok) {
      return handleApiError(res, 'Không thể tải danh sách bảo hành sản phẩm');
    }

    const data = await res.json();
    return {
      content: data.content || [],
      totalElements: data.totalElements ?? (data.content?.length || 0),
      totalPages: data.totalPages ?? 1,
      size: data.pageSize ?? data.size ?? (params.size || 10),
      number: data.pageNumber ?? data.number ?? (params.page || 0),
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? (!data.content || data.content.length === 0),
    };
  },

  async getWarrantyById(id: number): Promise<ProductWarrantyItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_DETAIL(id));
    if (!res.ok) {
      return handleApiError(res, `Không tìm thấy thông tin bảo hành #${id}`);
    }
    return await res.json();
  },

  async getWarrantyBySerial(serial: string): Promise<ProductWarrantyItem | null> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_BY_SERIAL(serial));
    if (!res.ok) {
      if (res.status === 404) return null;
      return handleApiError(res, `Không tìm thấy bảo hành cho serial ${serial}`);
    }
    return await res.json();
  },

  async extendWarranty(warrantyId: number, additionalDays: number, note?: string): Promise<ProductWarrantyItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_EXTEND(warrantyId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        additionalDays,
        note: note?.trim() || undefined,
      }),
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể gia hạn bảo hành #${warrantyId}`);
    }
    return await res.json();
  },

  async voidWarranty(warrantyId: number): Promise<ProductWarrantyItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_VOID(warrantyId), {
      method: 'PATCH',
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể hủy hiệu lực bảo hành #${warrantyId}`);
    }
    return await res.json();
  },

  // ==================== 3. WARRANTY REQUESTS (INTAKE & HANDLING) ====================

  async getAllRequests(params: WarrantyRequestFilterParams = {}): Promise<PageResponse<WarrantyRequestItem>> {
    const query = new URLSearchParams();
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.status && params.status !== 'ALL') query.set('status', String(params.status));
    if (params.technicianId) query.set('technicianId', String(params.technicianId));
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.WARRANTY_REQUESTS}?${query.toString()}`);
    if (!res.ok) {
      return handleApiError(res, 'Không thể tải danh sách phiếu bảo hành');
    }

    const data = await res.json();
    return {
      content: data.content || [],
      totalElements: data.totalElements ?? (data.content?.length || 0),
      totalPages: data.totalPages ?? 1,
      size: data.pageSize ?? data.size ?? (params.size || 10),
      number: data.pageNumber ?? data.number ?? (params.page || 0),
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? (!data.content || data.content.length === 0),
    };
  },

  async getRequestById(id: number): Promise<WarrantyRequestItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_REQUEST_DETAIL(id));
    if (!res.ok) {
      return handleApiError(res, `Không tìm thấy phiếu yêu cầu #${id}`);
    }
    return await res.json();
  },

  async createRequest(input: WarrantyRequestCreateInput): Promise<WarrantyRequestItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_REQUESTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return handleApiError(res, 'Không thể tạo phiếu tiếp nhận bảo hành');
    }
    return await res.json();
  },

  async updateTechnicalHandling(input: TechnicalHandlingUpdateInput): Promise<WarrantyRequestItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_REQUEST_TECHNICAL(input.requestId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technicianId: input.technicianId,
        technicianName: input.technicianName,
        inspectionNotes: input.inspectionNotes,
        faultType: input.faultType,
        solution: input.solution,
        status: input.status,
      }),
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể cập nhật xử lý kỹ thuật cho phiếu #${input.requestId}`);
    }
    return await res.json();
  },

  async addPartToRequest(
    requestId: number,
    partData: { productId: number; productName?: string; quantity: number; unitCost: number; serials?: string[] }
  ): Promise<WarrantyRequestItem> {
    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_REQUEST_PARTS(requestId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: partData.productId,
        quantity: partData.quantity,
        unitCost: partData.unitCost,
      }),
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể thêm linh kiện vào phiếu bảo hành #${requestId}`);
    }
    return await res.json();
  },

  // ==================== 4. SPARE PARTS ====================

  async getSparePartsPage(
    params: { keyword?: string; status?: string; page?: number; size?: number } = {}
  ): Promise<PageResponse<SparePartItem>> {
    const query = new URLSearchParams();
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.WARRANTY_PARTS}?${query.toString()}`);
    if (!res.ok) {
      return handleApiError(res, 'Không thể tải danh sách linh kiện bảo hành');
    }

    const data = await res.json();
    const content = Array.isArray(data) ? data : Array.isArray(data.content) ? data.content : [];
    return {
      content,
      totalElements: data.totalElements ?? content.length,
      totalPages: data.totalPages ?? 1,
      size: data.pageSize ?? data.size ?? (params.size || 10),
      number: data.pageNumber ?? data.number ?? (params.page || 0),
      first: data.first ?? true,
      last: data.last ?? true,
      empty: data.empty ?? content.length === 0,
    };
  },

  async getAllSpareParts(params: { keyword?: string; status?: string; page?: number; size?: number } = {}): Promise<SparePartItem[]> {
    const pageRes = await this.getSparePartsPage(params);
    return pageRes.content;
  },

  async updatePartStatus(
    requestIdOrPartId: number,
    partIdOrStatus: any,
    optionalStatus?: any
  ): Promise<SparePartItem> {
    // Hỗ trợ cả 2 chữ ký:
    // (requestId, partId, status) hoặc (partId, status)
    const targetPartId = optionalStatus !== undefined ? Number(partIdOrStatus) : Number(requestIdOrPartId);
    const targetStatus = optionalStatus !== undefined ? optionalStatus : partIdOrStatus;

    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_PART_STATUS(targetPartId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
    });
    if (!res.ok) {
      return handleApiError(res, `Không thể cập nhật trạng thái linh kiện #${targetPartId}`);
    }
    return await res.json();
  },

  // ==================== 5. HISTORY & TIMELINE ====================

  async getWarrantyHistoryBySerial(serial: string): Promise<WarrantyHistoryRecord | null> {
    const cleanSerial = serial.trim();
    if (!cleanSerial) return null;

    const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.WARRANTY_HISTORY(cleanSerial));
    if (!res.ok) {
      if (res.status === 404) return null;
      return handleApiError(res, `Không thể tải lịch sử bảo hành cho serial ${cleanSerial}`);
    }
    return await res.json();
  },
};
