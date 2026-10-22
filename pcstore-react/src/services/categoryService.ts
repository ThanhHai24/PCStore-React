import { API_ENDPOINTS } from '../config/api';
import type {
  CategoryResponse,
  CategoryTreeResponse,
  PageResponseCategoryResponse,
} from '../types/adminCategory';

export const categoryService = {
  async getCategoryTree(): Promise<CategoryTreeResponse[]> {
    const res = await fetch(API_ENDPOINTS.CATEGORIES.TREE);
    if (!res.ok) {
      throw new Error(`Lỗi tải cây danh mục (${res.status})`);
    }
    return res.json();
  },

  async getCategories(keyword?: string, parentId?: number | string): Promise<PageResponseCategoryResponse> {
    const query = new URLSearchParams();
    if (keyword && keyword.trim()) query.set('keyword', keyword.trim());
    if (parentId !== undefined && parentId !== null) query.set('parentId', String(parentId));
    query.set('size', '100');

    const res = await fetch(`${API_ENDPOINTS.CATEGORIES.LIST}?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải danh mục (${res.status})`);
    }
    return res.json();
  },

  async getCategoryById(id: number | string): Promise<CategoryResponse> {
    const res = await fetch(API_ENDPOINTS.CATEGORIES.DETAIL(id));
    if (!res.ok) {
      throw new Error(`Không tìm thấy danh mục (${res.status})`);
    }
    return res.json();
  },

  async getCategoryBySlug(slug: string): Promise<CategoryResponse> {
    const res = await fetch(API_ENDPOINTS.CATEGORIES.BY_SLUG(slug));
    if (!res.ok) {
      throw new Error(`Không tìm thấy danh mục (${res.status})`);
    }
    return res.json();
  },
};

export default categoryService;
