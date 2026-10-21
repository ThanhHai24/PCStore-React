export type BackendCategoryStatus = 0 | 1;

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status: number; // 0 = INACTIVE, 1 = ACTIVE
  parentId?: number | null;
  parentName?: string | null;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface CategoryTreeResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status: number;
  parentId?: number | null;
  children?: CategoryTreeResponse[];
}

export interface PageResponseCategoryResponse {
  content: CategoryResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CategoryCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  status?: number;
  parentId?: number | null;
}

export interface CategoryUpdateRequest {
  name: string;
  slug?: string;
  description?: string;
  status?: number;
  parentId?: number | null;
}

export interface CategoryStatusUpdateRequest {
  status: number;
}

export interface GetCategoriesParams {
  keyword?: string;
  status?: number | string; // 0, 1, or 'ALL'
  parentId?: number | string | null;
  page?: number; // 0-based
  size?: number;
  sort?: string[];
}
