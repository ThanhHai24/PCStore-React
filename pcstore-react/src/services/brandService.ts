import { API_ENDPOINTS } from '../config/api';
import type {
  BrandResponse,
  PageResponseBrandResponse,
} from '../types/adminBrand';

export const brandService = {
  async getBrands(keyword?: string): Promise<PageResponseBrandResponse> {
    const query = new URLSearchParams();
    if (keyword && keyword.trim()) query.set('keyword', keyword.trim());
    query.set('size', '100');

    const res = await fetch(`${API_ENDPOINTS.BRANDS.LIST}?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải danh sách thương hiệu (${res.status})`);
    }
    return res.json();
  },

  async getBrandById(id: number | string): Promise<BrandResponse> {
    const res = await fetch(API_ENDPOINTS.BRANDS.DETAIL(id));
    if (!res.ok) {
      throw new Error(`Không tìm thấy thương hiệu (${res.status})`);
    }
    return res.json();
  },

  async getBrandBySlug(slug: string): Promise<BrandResponse> {
    const res = await fetch(API_ENDPOINTS.BRANDS.BY_SLUG(slug));
    if (!res.ok) {
      throw new Error(`Không tìm thấy thương hiệu (${res.status})`);
    }
    return res.json();
  },
};

export default brandService;
