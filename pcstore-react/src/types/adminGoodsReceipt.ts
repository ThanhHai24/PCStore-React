export type GoodsReceiptStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export type ProductSerialStatus =
  | 'GOOD_CONDITION'
  | 'DEFECTIVE'
  | 'IN_STOCK'
  | 'PENDING_RETURN'
  | 'RETURNING'
  | 'RETURNED'
  | 'PACKING'
  | 'DELIVERING'
  | 'SOLD'
  | 'USING_BY_TECHNICAL';

export interface ProductSerialRequest {
  serialNumber: string;
  status: ProductSerialStatus;
}

export interface ProductSerialResponse {
  id: number;
  productId: number;
  receiptItemId: number;
  serialNumber: string;
  status: ProductSerialStatus;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
  terminated?: boolean;
  isTerminated?: boolean;
}

export interface ReceiptItemRequest {
  purchaseOrderItemId: number;
  actualUnitCost: number;
  productSerials?: ProductSerialRequest[];
}

export interface ReceiptItemResponse {
  id: number;
  goodsReceiptId: number;
  purchaseOrderItemId: number;
  actualUnitCost: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityDefective: number;
  productSerials: ProductSerialResponse[];
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface GoodsReceiptResponse {
  id: number;
  code: string;
  name?: string | null;
  purchaseOrderId: number;
  receivedAt?: string | null;
  receivedBy?: number | null;
  status: GoodsReceiptStatus;
  items: ReceiptItemResponse[];
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponseGoodsReceiptResponse {
  content: GoodsReceiptResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface GoodsReceiptCreateRequest {
  code: string;
  name?: string;
  purchaseOrderId: number;
  receivedAt?: string;
  status?: GoodsReceiptStatus;
  items?: ReceiptItemRequest[];
}

export interface GoodsReceiptUpdateRequest {
  code: string;
  name?: string;
  receivedAt?: string;
  items?: ReceiptItemRequest[];
}

export interface GoodsReceiptStatusUpdateRequest {
  status: GoodsReceiptStatus;
}

export interface GetGoodsReceiptsParams {
  keyword?: string;
  status?: GoodsReceiptStatus | '' | 'ALL';
  purchaseOrderId?: number | string;
  fromDate?: string;
  toDate?: string;
  page?: number;
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
