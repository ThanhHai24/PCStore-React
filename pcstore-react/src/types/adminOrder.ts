export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderType = 'IN_STORE' | 'ONLINE';

export interface OrderItemRequest {
  productId: number;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
}

export interface OrderItemResponse {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  productImageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  createdDate?: string | null;
  lastModifiedDate?: string | null;
}

export interface OrderResponse {
  id: number;
  code: string;
  userId: number;
  customerUsername?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  recipientName: string;
  recipientPhone: string;
  address: string;
  note?: string | null;
  type: OrderType;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  items: OrderItemResponse[];
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponseOrderResponse {
  content: OrderResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface OrderCreateRequest {
  code?: string;
  userId?: number;
  type?: OrderType;
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  note?: string;
  discountAmount?: number;
  items: OrderItemRequest[];
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
}

export interface GetOrdersParams {
  keyword?: string;
  status?: OrderStatus | '' | 'ALL';
  type?: OrderType | '' | 'ALL';
  userId?: number | string;
  fromDate?: string;
  toDate?: string;
  page?: number; // 0-indexed
  size?: number;
  sort?: string[];
}

