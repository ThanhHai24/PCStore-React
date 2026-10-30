// Centralized API Configuration

export const getApiBaseUrl = (): string => {
  const envBase =
    import.meta.env.BASEURL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BASE_URL ||
    import.meta.env.VITE_BASEURL ||
    'http://localhost:8080';

  let cleaned = String(envBase).trim();
  // Remove surrounding quotes if any
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // Prepend http:// if protocol is missing (e.g. "localhost:8080")
  if (cleaned && !/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }

  // Remove trailing slashes
  return cleaned.replace(/\/+$/, '');
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
    ME: `${API_BASE_URL}/api/auth/me`,
  },
  ADMIN: {
    USERS: `${API_BASE_URL}/api/admin/users`,
    USER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/users/${id}`,
    USER_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/users/${id}/status`,
    CATEGORIES: `${API_BASE_URL}/api/admin/categories`,
    CATEGORY_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/categories/${id}`,
    CATEGORY_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/categories/${id}/status`,
    CATEGORY_TREE: `${API_BASE_URL}/api/admin/categories/tree`,
    CATEGORY_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/admin/categories/by-slug/${slug}`,
    BRANDS: `${API_BASE_URL}/api/admin/brands`,
    BRAND_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/brands/${id}`,
    BRAND_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/brands/${id}/status`,
    BRAND_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/admin/brands/by-slug/${slug}`,
    PRODUCTS: `${API_BASE_URL}/api/admin/products`,
    PRODUCT_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/products/${id}`,
    PRODUCT_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/products/${id}/status`,
    PRODUCT_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/admin/products/by-slug/${slug}`,
    SUPPLIERS: `${API_BASE_URL}/api/admin/suppliers`,
    SUPPLIER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/suppliers/${id}`,
    SUPPLIER_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/suppliers/${id}/status`,
    SUPPLIER_BY_CODE: (code: string) => `${API_BASE_URL}/api/admin/suppliers/by-code/${code}`,
    ORDERS: `${API_BASE_URL}/api/orders`,
    ORDER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/orders/${id}`,
    ORDER_STATUS: (id: string | number) => `${API_BASE_URL}/api/orders/${id}/status`,
    ORDER_BY_CODE: (code: string) => `${API_BASE_URL}/api/orders/by-code/${encodeURIComponent(code)}`,
    PURCHASE_ORDERS: `${API_BASE_URL}/api/purchase-orders`,
    PURCHASE_ORDER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/purchase-orders/${id}`,
    PURCHASE_ORDER_STATUS: (id: string | number) => `${API_BASE_URL}/api/purchase-orders/${id}/status`,
    PURCHASE_ORDER_BY_CODE: (code: string) => `${API_BASE_URL}/api/purchase-orders/by-code/${code}`,
    PURCHASE_ORDER_RECEIPT_ITEMS: (id: string | number) => `${API_BASE_URL}/api/goods-receipts/purchase-orders/${id}/order-items`,
    GOODS_RECEIPTS: `${API_BASE_URL}/api/goods-receipts`,
    GOODS_RECEIPT_DETAIL: (id: string | number) => `${API_BASE_URL}/api/goods-receipts/${id}`,
    GOODS_RECEIPT_STATUS: (id: string | number) => `${API_BASE_URL}/api/goods-receipts/${id}/status`,
    GOODS_RECEIPT_BY_CODE: (code: string) => `${API_BASE_URL}/api/goods-receipts/by-code/${encodeURIComponent(code)}`,
    PRODUCT_SERIALS: `${API_BASE_URL}/api/product-serials`,
    PRODUCT_SERIAL_DETAIL: (id: string | number) => `${API_BASE_URL}/api/product-serials/${id}`,
    PRODUCT_SERIAL_BY_NUMBER: (serialNumber: string) => `${API_BASE_URL}/api/product-serials/by-serial/${encodeURIComponent(serialNumber)}`,
    PRODUCT_SERIALS_BY_PRODUCT: (productId: string | number) => `${API_BASE_URL}/api/product-serials/by-product/${productId}`,
  },
  CATEGORIES: {
    LIST: `${API_BASE_URL}/api/categories`,
    DETAIL: (id: string | number) => `${API_BASE_URL}/api/categories/${id}`,
    TREE: `${API_BASE_URL}/api/categories/tree`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/api/categories/by-slug/${slug}`,
  },
  BRANDS: {
    LIST: `${API_BASE_URL}/api/brands`,
    DETAIL: (id: string | number) => `${API_BASE_URL}/api/brands/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/api/brands/by-slug/${slug}`,
    ALL: `${API_BASE_URL}/api/brands/all`,
  },
  PRODUCTS: {
    LIST: `${API_BASE_URL}/api/products`,
    DETAIL: (id: string | number) => `${API_BASE_URL}/api/products/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/api/products/by-slug/${slug}`,
  },
} as const;

export const PROVINCE_API_BASE_URL = 'https://provinces.open-api.vn/api/v2';

export const PROVINCE_API_ENDPOINTS = {
  PROVINCES: `${PROVINCE_API_BASE_URL}/p/`,
  PROVINCE_DETAIL: (code: number, depth: number = 1) =>
    `${PROVINCE_API_BASE_URL}/p/${code}?depth=${depth}`,
  WARDS: (provinceCode?: number, search?: string) => {
    const params = new URLSearchParams();
    if (provinceCode !== undefined) params.set('province', String(provinceCode));
    if (search && search.trim()) params.set('search', search.trim());
    const query = params.toString();
    return `${PROVINCE_API_BASE_URL}/w/${query ? `?${query}` : ''}`;
  },
  WARD_DETAIL: (code: number) => `${PROVINCE_API_BASE_URL}/w/${code}`,
} as const;


