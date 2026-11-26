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
    CATEGORY_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/admin/categories/by-slug/${encodeURIComponent(slug)}`,
    BRANDS: `${API_BASE_URL}/api/admin/brands`,
    BRAND_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/brands/${id}`,
    BRAND_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/brands/${id}/status`,
    BRAND_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/admin/brands/by-slug/${encodeURIComponent(slug)}`,
    PRODUCTS: `${API_BASE_URL}/api/admin/products`,
    PRODUCT_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/products/${id}`,
    PRODUCT_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/products/${id}/status`,
    PRODUCT_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/admin/products/by-slug/${encodeURIComponent(slug)}`,
    SUPPLIERS: `${API_BASE_URL}/api/admin/suppliers`,
    SUPPLIER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/suppliers/${id}`,
    SUPPLIER_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/suppliers/${id}/status`,
    SUPPLIER_BY_CODE: (code: string) => `${API_BASE_URL}/api/admin/suppliers/by-code/${encodeURIComponent(code)}`,
    ORDERS: `${API_BASE_URL}/api/orders`,
    ORDER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/orders/${id}`,
    ORDER_STATUS: (id: string | number) => `${API_BASE_URL}/api/orders/${id}/status`,
    ORDER_BY_CODE: (code: string) => `${API_BASE_URL}/api/orders/by-code/${encodeURIComponent(code)}`,
    PURCHASE_ORDERS: `${API_BASE_URL}/api/purchase-orders`,
    PURCHASE_ORDER_DETAIL: (id: string | number) => `${API_BASE_URL}/api/purchase-orders/${id}`,
    PURCHASE_ORDER_STATUS: (id: string | number) => `${API_BASE_URL}/api/purchase-orders/${id}/status`,
    PURCHASE_ORDER_BY_CODE: (code: string) => `${API_BASE_URL}/api/purchase-orders/by-code/${encodeURIComponent(code)}`,
    PURCHASE_ORDER_RECEIPT_ITEMS: (id: string | number) => `${API_BASE_URL}/api/goods-receipts/purchase-orders/${id}/order-items`,
    PURCHASE_RETURNS: `${API_BASE_URL}/api/purchase-returns`,
    PURCHASE_RETURN_DETAIL: (id: string | number) => `${API_BASE_URL}/api/purchase-returns/${id}`,
    PURCHASE_RETURN_STATUS: (id: string | number) => `${API_BASE_URL}/api/purchase-returns/${id}/status`,
    PURCHASE_RETURN_AVAILABLE_SERIALS: `${API_BASE_URL}/api/purchase-returns/available-serials`,
    PURCHASE_RETURN_VALIDATE_SERIAL: `${API_BASE_URL}/api/purchase-returns/validate-serial`,
    GOODS_RECEIPTS: `${API_BASE_URL}/api/goods-receipts`,
    GOODS_RECEIPT_DETAIL: (id: string | number) => `${API_BASE_URL}/api/goods-receipts/${id}`,
    GOODS_RECEIPT_STATUS: (id: string | number) => `${API_BASE_URL}/api/goods-receipts/${id}/status`,
    GOODS_RECEIPT_BY_CODE: (code: string) => `${API_BASE_URL}/api/goods-receipts/by-code/${encodeURIComponent(code)}`,
    PRODUCT_SERIALS: `${API_BASE_URL}/api/product-serials`,
    PRODUCT_SERIAL_DETAIL: (id: string | number) => `${API_BASE_URL}/api/product-serials/${id}`,
    PRODUCT_SERIAL_BY_NUMBER: (serialNumber: string) => `${API_BASE_URL}/api/product-serials/by-serial/${encodeURIComponent(serialNumber)}`,
    PRODUCT_SERIALS_BY_PRODUCT: (productId: string | number) => `${API_BASE_URL}/api/product-serials/by-product/${productId}`,
    WARRANTY_POLICIES: `${API_BASE_URL}/api/admin/warranty-policies`,
    WARRANTY_POLICY_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/warranty-policies/${id}`,
    WARRANTY_POLICY_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/warranty-policies/${id}/status`,
    WARRANTIES: `${API_BASE_URL}/api/admin/warranties`,
    WARRANTY_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/warranties/${id}`,
    WARRANTY_BY_SERIAL: (serial: string) => `${API_BASE_URL}/api/admin/warranties/by-serial/${encodeURIComponent(serial)}`,
    WARRANTY_EXTEND: (id: string | number) => `${API_BASE_URL}/api/admin/warranties/${id}/extend`,
    WARRANTY_VOID: (id: string | number) => `${API_BASE_URL}/api/admin/warranties/${id}/void`,
    WARRANTY_HISTORY: (serial: string) => `${API_BASE_URL}/api/admin/warranties/history/${encodeURIComponent(serial)}`,
    WARRANTY_REQUESTS: `${API_BASE_URL}/api/admin/warranty-requests`,
    WARRANTY_REQUEST_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/warranty-requests/${id}`,
    WARRANTY_REQUEST_TECHNICAL: (id: string | number) => `${API_BASE_URL}/api/admin/warranty-requests/${id}/technical`,
    WARRANTY_REQUEST_PARTS: (id: string | number) => `${API_BASE_URL}/api/admin/warranty-requests/${id}/parts`,
    WARRANTY_PARTS: `${API_BASE_URL}/api/admin/warranty-parts`,
    WARRANTY_PART_STATUS: (id: string | number) => `${API_BASE_URL}/api/admin/warranty-parts/${id}/status`,
    SYSTEM_LOGS: `${API_BASE_URL}/api/admin/logs`,
    SYSTEM_LOG_DETAIL: (id: string | number) => `${API_BASE_URL}/api/admin/logs/${id}`,
  },
  ANALYTICS: {
    DASHBOARD: {
      KPI: `${API_BASE_URL}/api/analytics/dashboard/kpi`,
      TREND: `${API_BASE_URL}/api/analytics/dashboard/revenue-order-trend`,
      BY_CATEGORY: `${API_BASE_URL}/api/analytics/dashboard/revenue-by-category`,
      ORDER_STATUS: `${API_BASE_URL}/api/analytics/dashboard/order-status-distribution`,
    },
    REVENUE: {
      TREND: `${API_BASE_URL}/api/analytics/revenue/trend`,
      COMPARE: `${API_BASE_URL}/api/analytics/revenue/compare`,
      BY_BRAND: `${API_BASE_URL}/api/analytics/revenue/by-brand`,
      BY_PAYMENT_METHOD: `${API_BASE_URL}/api/analytics/revenue/by-payment-method`,
    },
    PRODUCTS: {
      TOP_SELLING: `${API_BASE_URL}/api/analytics/products/top-selling`,
      TOP_PROFIT: `${API_BASE_URL}/api/analytics/products/top-profit`,
      PERFORMANCE_MATRIX: `${API_BASE_URL}/api/analytics/products/performance-matrix`,
    },
    INVENTORY: {
      SUMMARY: `${API_BASE_URL}/api/analytics/inventory/summary`,
      BY_CATEGORY: `${API_BASE_URL}/api/analytics/inventory/by-category`,
      STATUS_DISTRIBUTION: `${API_BASE_URL}/api/analytics/inventory/status-distribution`,
      AGING: `${API_BASE_URL}/api/analytics/inventory/aging`,
      LOW_STOCK_ALERT: `${API_BASE_URL}/api/analytics/inventory/low-stock-alert`,
      SLOW_MOVING: `${API_BASE_URL}/api/analytics/inventory/slow-moving`,
    },
    PURCHASING: {
      TREND: `${API_BASE_URL}/api/analytics/purchasing/trend`,
      BY_SUPPLIER: `${API_BASE_URL}/api/analytics/purchasing/by-supplier`,
      QUALITY_CHECK: `${API_BASE_URL}/api/analytics/purchasing/quality-check`,
      RECEIPT_STATUS: `${API_BASE_URL}/api/analytics/purchasing/receipt-status-distribution`,
    },
    TAX: {
      SUMMARY: `${API_BASE_URL}/api/analytics/tax/summary`,
      QUARTERLY: `${API_BASE_URL}/api/analytics/tax/quarterly-breakdown`,
      INVOICES: `${API_BASE_URL}/api/analytics/tax/invoices`,
      EXPORT_EXCEL: `${API_BASE_URL}/api/analytics/tax/export/excel`,
    },
  },
  CATEGORIES: {
    LIST: `${API_BASE_URL}/api/categories`,
    DETAIL: (id: string | number) => `${API_BASE_URL}/api/categories/${id}`,
    TREE: `${API_BASE_URL}/api/categories/tree`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/api/categories/by-slug/${encodeURIComponent(slug)}`,
  },
  BRANDS: {
    LIST: `${API_BASE_URL}/api/brands`,
    DETAIL: (id: string | number) => `${API_BASE_URL}/api/brands/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/api/brands/by-slug/${encodeURIComponent(slug)}`,
    ALL: `${API_BASE_URL}/api/brands/all`,
  },
  PRODUCTS: {
    LIST: `${API_BASE_URL}/api/products`,
    DETAIL: (id: string | number) => `${API_BASE_URL}/api/products/${id}`,
    BY_SLUG: (slug: string) => `${API_BASE_URL}/api/products/by-slug/${encodeURIComponent(slug)}`,
    REVIEWS: (productId: string | number) => `${API_BASE_URL}/api/products/${productId}/reviews`,
    REVIEW_DETAIL: (productId: string | number, id: string | number) =>
      `${API_BASE_URL}/api/products/${productId}/reviews/${id}`,
    COMMENTS: (productId: string | number) => `${API_BASE_URL}/api/products/${productId}/comments`,
    COMMENT_DETAIL: (productId: string | number, id: string | number) =>
      `${API_BASE_URL}/api/products/${productId}/comments/${id}`,
    COMMENT_REPLIES: (productId: string | number, id: string | number) =>
      `${API_BASE_URL}/api/products/${productId}/comments/${id}/replies`,
  },
  WARRANTIES: {
    PUBLIC_LOOKUP: (serialNumber: string) =>
      `${API_BASE_URL}/api/public/warranties/serials?serialNumber=${encodeURIComponent(serialNumber)}`,
    BY_ORDER: (orderId: string | number) => `${API_BASE_URL}/api/warranties?orderId=${orderId}`,
    REQUESTS: `${API_BASE_URL}/api/warranty-requests`,
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


