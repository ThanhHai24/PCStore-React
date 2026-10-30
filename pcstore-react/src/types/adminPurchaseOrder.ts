export type PurchaseOrderStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItemRequest {
  productId: number;
  quantityOrder: number;
  unitCost: number;
}

export interface PurchaseOrderItemResponse {
  id: number;
  productId: number;
  quantityOrder: number;
  unitCost: number;
  quantityReceived: number;
  subtotal: number;
}

export interface PurchaseOrderResponse {
  id: number;
  code: string;
  name?: string | null;
  supplierId: number;
  orderDate?: string | null;
  expectedDate?: string | null;
  status: PurchaseOrderStatus;
  description?: string | null;
  totalAmount: number;
  items: PurchaseOrderItemResponse[];
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponsePurchaseOrderResponse {
  content: PurchaseOrderResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PurchaseOrderCreateRequest {
  code: string;
  name?: string;
  supplierId: number;
  orderDate?: string;
  expectedDate?: string;
  description?: string;
  items?: PurchaseOrderItemRequest[];
}

export interface PurchaseOrderUpdateRequest {
  code: string;
  name?: string;
  supplierId: number;
  orderDate?: string;
  expectedDate?: string;
  description?: string;
  items?: PurchaseOrderItemRequest[];
}

export interface PurchaseOrderStatusUpdateRequest {
  status: PurchaseOrderStatus;
}

export interface GetPurchaseOrdersParams {
  keyword?: string;
  status?: PurchaseOrderStatus | '' | 'ALL';
  supplierId?: number | string;
  fromDate?: string;
  toDate?: string;
  page?: number; // 0-indexed
  size?: number;
  sort?: string[];
}

export interface PurchaseOrderItemReceiptInfo {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  quantityOrder: number;
  quantityReceived: number;
  remainingQuantity: number;
  unitCost: number;
}
