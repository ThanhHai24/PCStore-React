export type BackendBrandStatus = 0 | 1;

export interface BrandResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status: number; // 0 = INACTIVE, 1 = ACTIVE
  isDeleted?: boolean | number;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponseBrandResponse {
  content: BrandResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface BrandCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  status?: number; // 0 = INACTIVE, 1 = ACTIVE
}

export interface BrandUpdateRequest {
  name: string;
  slug?: string;
  description?: string;
  status?: number;
}

export interface BrandStatusUpdateRequest {
  status: number;
}

export interface GetBrandsParams {
  keyword?: string;
  status?: number | string; // 0, 1, or 'ALL'
  page?: number; // 0-based
  size?: number;
  sort?: string[];
}
