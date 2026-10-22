export type ProductType = 'COMPONENT' | 'LAPTOP' | 'PC';
export type BackendProductStatus = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_STOCK';

export interface ProductResponse {
  id: number;
  name: string;
  code: string;
  slug: string;
  description?: string | null;
  specification?: string | null;
  productType?: ProductType | string;
  status: BackendProductStatus | string;
  imageUrl?: string | null;
  brandId?: number | null;
  categoryIds?: number[];
  primaryCategoryId?: number | null;
  price?: number | null;
  priceId?: number | null;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponseProductResponse {
  content: ProductResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ProductCreateRequest {
  name: string;
  code: string;
  price?: number | null;
  slug?: string;
  description?: string;
  specification?: string;
  productType?: ProductType;
  status?: BackendProductStatus;
  imageUrl?: string;
  brandId?: number | null;
  categoryIds?: number[];
  primaryCategoryId?: number | null;
}

export interface ProductUpdateRequest {
  name: string;
  code: string;
  price?: number | null;
  slug?: string;
  description?: string;
  specification?: string;
  productType?: ProductType;
  status?: BackendProductStatus;
  imageUrl?: string;
  brandId?: number | null;
  categoryIds?: number[];
  primaryCategoryId?: number | null;
}

export interface ProductStatusUpdateRequest {
  status: BackendProductStatus;
}

export interface GetProductsParams {
  keyword?: string;
  status?: string;
  productType?: string;
  brandId?: number | string;
  categoryId?: number | string;
  page?: number;
  size?: number;
  sort?: string[];
}
