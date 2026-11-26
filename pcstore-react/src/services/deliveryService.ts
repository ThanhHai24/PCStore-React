import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';

export type DeliveryResourceType = 'ORDER' | 'PURCHASE_RETURN';

export type DeliveryStatus = 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';

export interface DeliveryResponse {
  id: number;
  resourceType: DeliveryResourceType;
  resourceId: number;
  resourceCode?: string | null;
  trackingCode?: string | null;
  carrierName?: string | null;
  shippingFee: number;
  status: DeliveryStatus;
  createdBy?: number | null;
  createdDate?: string | null;
  lastModifiedBy?: number | null;
  lastModifiedDate?: string | null;
}

export interface DeliveryCreateRequest {
  resourceType: DeliveryResourceType;
  resourceId: number;
  carrierName?: string;
  trackingCode?: string;
  shippingFee?: number;
}

export interface DeliveryMetadataUpdateRequest {
  trackingCode?: string;
  carrierName?: string;
  shippingFee?: number;
}

export interface DeliveryFilterParams {
  resourceType?: DeliveryResourceType;
  status?: DeliveryStatus;
  carrierName?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface DeliveryPageResponse {
  content: DeliveryResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.detail || data?.message || data?.error || `${fallback} (${res.status})`;
}

export const deliveryService = {
  /**
   * POST /api/deliveries
   */
  async createDelivery(payload: DeliveryCreateRequest): Promise<DeliveryResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.DELIVERIES.LIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể tạo vận đơn'));
    }
    return res.json();
  },

  /**
   * GET /api/deliveries
   */
  async getDeliveries(params: DeliveryFilterParams = {}): Promise<DeliveryPageResponse> {
    const query = new URLSearchParams();
    if (params.resourceType) query.set('resourceType', params.resourceType);
    if (params.status) query.set('status', params.status);
    if (params.carrierName?.trim()) query.set('carrierName', params.carrierName.trim());
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 50));
    query.set('sort', params.sort || 'createdDate,DESC');

    const res = await fetchWithAuth(`${API_ENDPOINTS.DELIVERIES.LIST}?${query.toString()}`);
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Không thể tải danh sách vận đơn'));
    }
    const data = await res.json();
    return {
      content: Array.isArray(data?.content) ? data.content : [],
      totalElements: data?.totalElements ?? 0,
      totalPages: data?.totalPages ?? 1,
      size: data?.pageSize ?? data?.size ?? (params.size ?? 50),
      number: data?.pageNumber ?? data?.number ?? (params.page ?? 0),
      first: data?.first ?? true,
      last: data?.last ?? true,
      empty: data?.empty ?? !(data?.content?.length > 0),
    };
  },

  /**
   * GET /api/deliveries/{id}
   */
  async getDeliveryById(id: number | string): Promise<DeliveryResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.DELIVERIES.DETAIL(id));
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không tìm thấy vận đơn #${id}`));
    }
    return res.json();
  },

  /**
   * GET /api/deliveries/by-resource/{resourceType}/{resourceId}
   */
  async getDeliveryByResource(
    resourceType: DeliveryResourceType,
    resourceId: number | string
  ): Promise<DeliveryResponse | null> {
    const res = await fetchWithAuth(API_ENDPOINTS.DELIVERIES.BY_RESOURCE(resourceType, resourceId));
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không thể tra cứu vận đơn cho ${resourceType} #${resourceId}`));
    }
    return res.json();
  },

  /**
   * PATCH /api/deliveries/{id}
   */
  async updateDeliveryMetadata(
    id: number | string,
    payload: DeliveryMetadataUpdateRequest
  ): Promise<DeliveryResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.DELIVERIES.DETAIL(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không thể cập nhật thông tin vận đơn #${id}`));
    }
    return res.json();
  },

  /**
   * PATCH /api/deliveries/{id}/status
   */
  async updateDeliveryStatus(id: number | string, status: DeliveryStatus): Promise<DeliveryResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.DELIVERIES.STATUS(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không thể cập nhật trạng thái vận đơn #${id}`));
    }
    return res.json();
  },
};
