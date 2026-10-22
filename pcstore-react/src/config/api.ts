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

