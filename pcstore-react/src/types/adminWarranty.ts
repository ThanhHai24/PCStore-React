// TypeScript types for Admin Warranty & Technical Service Module

export type WarrantyPolicyTargetType = 0 | 1 | 2 | 'CATEGORY' | 'PRODUCT' | 'BRAND' | null;
export type WarrantyPolicyStatus = 0 | 1 | 'INACTIVE' | 'ACTIVE';

export interface WarrantyPolicyResponse {
  id: number;
  name: string;
  durationDays: number;
  description?: string | null;
  targetType?: WarrantyPolicyTargetType;
  targetId?: number | null;
  targetName?: string | null;
  status: WarrantyPolicyStatus;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface WarrantyPolicyCreateRequest {
  name: string;
  durationDays: number;
  description?: string;
  targetType?: WarrantyPolicyTargetType;
  targetId?: number | null;
  status?: WarrantyPolicyStatus;
}

export interface WarrantyPolicyUpdateRequest {
  name: string;
  durationDays: number;
  description?: string;
  targetType?: WarrantyPolicyTargetType;
  targetId?: number | null;
  status?: WarrantyPolicyStatus;
}

export interface WarrantyPolicyFilterParams {
  keyword?: string;
  status?: WarrantyPolicyStatus | string;
  targetType?: WarrantyPolicyTargetType | string;
  targetId?: number;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

// Product Warranty Item (Bảo hành sản phẩm / Serial đã kích hoạt)
export type ProductWarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export interface ProductWarrantyItem {
  id: number;
  orderItemId?: number;
  orderId?: number;
  orderCode?: string;
  productSerialId: number;
  serialNumber: string;
  productId?: number;
  productName?: string;
  productCode?: string;
  productImage?: string;
  brandName?: string;
  categoryName?: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  warrantyPolicyId: number;
  policyName?: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  active: boolean;
  status: ProductWarrantyStatus;
  remainingDays: number;
  note?: string;
  requestsCount?: number;
}

export interface ProductWarrantyFilterParams {
  keyword?: string;
  serialNumber?: string;
  orderCode?: string;
  status?: ProductWarrantyStatus | 'ALL';
  page?: number;
  size?: number;
}

// Warranty Request & Technical Handling (Phiếu tiếp nhận & Xử lý kỹ thuật)
export type WarrantyRequestStatus = 0 | 1 | 2 | 3 | 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'COMPLETED';
export type WarrantyPartStatus = 0 | 1 | 2 | 3 | 4 | 'PENDING' | 'RESERVED' | 'INSTALLED' | 'RETURNED' | 'CANCELLED';

export interface WarrantyRequestPartItem {
  id: number;
  warrantyRequestId: number;
  productId: number;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitCost: number;
  status: WarrantyPartStatus;
  productSerialIds?: number[];
  serialNumbers?: string[];
}

export interface WarrantyRequestItem {
  id: number;
  requestCode: string;
  warrantyId: number;
  serialNumber: string;
  productId?: number;
  productName: string;
  productCode?: string;
  orderCode?: string;
  orderId?: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  technicianId?: number | null;
  technicianName?: string | null;
  technicianPhone?: string | null;
  issueDescription: string;
  intakeAccessories?: string; // Phụ kiện nhận kèm (sạc, cáp, hộp...)
  deviceCondition?: string; // Tình trạng ngoại quan
  inspectionNotes?: string | null; // Ghi chú giám định kỹ thuật
  faultType?: 'MANUFACTURER' | 'USER_DAMAGE' | 'SOFTWARE' | 'OTHER'; // Phân loại lỗi
  solution?: string | null; // Biện pháp xử lý
  status: WarrantyRequestStatus;
  completedAt?: string | null;
  createdDate: string;
  lastModifiedDate?: string;
  parts: WarrantyRequestPartItem[];
}

export interface WarrantyRequestCreateInput {
  warrantyId: number;
  customerId: number;
  issueDescription: string;
  intakeAccessories?: string;
  deviceCondition?: string;
  parts?: Array<{
    productId: number;
    quantity: number;
    unitCost?: number;
    productSerialIds?: number[];
  }>;
}

export interface WarrantyRequestFilterParams {
  keyword?: string;
  status?: WarrantyRequestStatus | 'ALL';
  technicianId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

// Technical Handling Update
export interface TechnicalHandlingUpdateInput {
  requestId: number;
  technicianId?: number;
  technicianName?: string;
  inspectionNotes?: string;
  faultType?: 'MANUFACTURER' | 'USER_DAMAGE' | 'SOFTWARE' | 'OTHER';
  solution?: string;
  status: WarrantyRequestStatus;
  resolutionType?: 'REPAIRED' | 'PARTS_REPLACED' | 'NEW_EXCHANGE' | 'REJECTED';
}

// Spare Parts Item
export interface SparePartItem {
  id: number;
  warrantyRequestId: number;
  requestCode: string;
  productId: number;
  productName: string;
  productCode: string;
  productCategory?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: WarrantyPartStatus;
  serialNumbers: string[];
  assignedTechnician?: string;
  createdDate: string;
  lastModifiedDate?: string;
}

// Timeline History Item
export interface WarrantyTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  type: 'SALE' | 'WARRANTY_ACTIVE' | 'INTAKE' | 'INSPECTION' | 'PARTS' | 'REPAIR' | 'COMPLETE' | 'REJECT';
  badgeColor?: string;
  metadata?: Record<string, any>;
}

export interface WarrantyHistoryRecord {
  serialNumber: string;
  productName: string;
  productCode: string;
  customerName: string;
  customerPhone: string;
  orderCode: string;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  policyName: string;
  status: ProductWarrantyStatus;
  totalRequests: number;
  timeline: WarrantyTimelineEvent[];
}

