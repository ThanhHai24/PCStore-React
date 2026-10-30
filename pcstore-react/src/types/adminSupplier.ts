export type BackendSupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface SupplierResponse {
  id: number;
  code: string;
  name: string;
  contactPerson?: string | null;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
  taxCode?: string | null;
  status: BackendSupplierStatus | string;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponseSupplierResponse {
  content: SupplierResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface SupplierCreateRequest {
  code: string;
  name: string;
  contactPerson?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  taxCode?: string;
  status?: BackendSupplierStatus | number;
}

export interface SupplierUpdateRequest {
  code: string;
  name: string;
  contactPerson?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  taxCode?: string;
  status?: BackendSupplierStatus | number;
}

export interface SupplierStatusUpdateRequest {
  status: BackendSupplierStatus | number;
}

export interface GetSuppliersParams {
  keyword?: string;
  status?: BackendSupplierStatus | number | '' | 'ALL';
  page?: number; // 0-based index
  size?: number;
  sort?: string[];
}
