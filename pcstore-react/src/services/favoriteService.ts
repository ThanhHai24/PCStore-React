import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import { getDefaultImageForProduct } from './productService';
import type { Product } from '../types/product';

export type FavoriteProductStatus = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_STOCK';

export interface FavoriteResponse {
  productId: number;
  name: string;
  code?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
  price: number;
  status?: FavoriteProductStatus | string | null;
  addedAt?: string | null;
}

export interface FavoriteStatusResponse {
  productId: number;
  favorited: boolean;
}

export interface PageResponseFavoriteResponse {
  content: FavoriteResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export class FavoriteApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'FavoriteApiError';
    this.status = status;
  }
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.detail || data?.message || data?.error || `${fallback} (${res.status})`;
}

export function mapFavoriteToProduct(fav: FavoriteResponse): Product {
  const priceNum = fav.price != null ? Number(fav.price) : 0;
  const priceStr = priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : 'Liên hệ';
  const marketPriceNum = priceNum > 0 ? Math.round(priceNum * 1.15) : undefined;
  const marketPriceStr = marketPriceNum ? `${marketPriceNum.toLocaleString('vi-VN')}đ` : undefined;
  const discountStr = priceNum > 0 ? '-13%' : undefined;

  const firstUrl = fav.imageUrl?.split(';')[0]?.trim();
  const image =
    firstUrl && !firstUrl.includes('example.com')
      ? firstUrl
      : getDefaultImageForProduct({ name: fav.name });

  return {
    id: String(fav.productId),
    title: fav.name || `Sản phẩm #${fav.productId}`,
    images: [image],
    thumbnails: [image],
    price: priceStr,
    numericPrice: priceNum,
    marketPrice: marketPriceStr,
    discountPercent: discountStr,
    inStock: fav.status !== 'OUT_OF_STOCK' && fav.status !== 'INACTIVE',
    warrantyInfo: 'Bảo hành chính hãng',
    rating: 5,
    reviewCount: 0,
    viewCount: 0,
    commentCount: 0,
    purchaseCount: 0,
    promotions: [],
    specsTable: [],
  };
}

export const favoriteService = {
  /**
   * GET /api/favorites?page=0&size=100
   */
  async getFavorites(page: number = 0, size: number = 100): Promise<PageResponseFavoriteResponse> {
    const safeSize = Math.min(100, Math.max(1, size));
    const url = `${API_ENDPOINTS.FAVORITES.LIST}?page=${Math.max(0, page)}&size=${safeSize}`;
    const res = await fetchWithAuth(url, { method: 'GET' });
    if (!res.ok) {
      throw new FavoriteApiError(
        await parseErrorMessage(res, 'Không thể tải danh sách sản phẩm yêu thích'),
        res.status
      );
    }
    const data = await res.json();
    return {
      ...data,
      content: Array.isArray(data?.content) ? data.content : [],
    };
  },

  /**
   * GET /api/favorites/{productId}
   */
  async getFavoriteStatus(productId: string | number): Promise<FavoriteStatusResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.FAVORITES.ITEM(productId), { method: 'GET' });
    if (!res.ok) {
      throw new FavoriteApiError(
        await parseErrorMessage(res, 'Không thể kiểm tra trạng thái yêu thích'),
        res.status
      );
    }
    return await res.json();
  },

  /**
   * PUT /api/favorites/{productId}
   */
  async addFavorite(productId: string | number): Promise<FavoriteResponse> {
    const res = await fetchWithAuth(API_ENDPOINTS.FAVORITES.ITEM(productId), {
      method: 'PUT',
    });
    if (!res.ok) {
      throw new FavoriteApiError(
        await parseErrorMessage(res, 'Không thể thêm vào danh sách yêu thích'),
        res.status
      );
    }
    return await res.json();
  },

  /**
   * DELETE /api/favorites/{productId}
   */
  async removeFavorite(productId: string | number): Promise<void> {
    const res = await fetchWithAuth(API_ENDPOINTS.FAVORITES.ITEM(productId), {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      throw new FavoriteApiError(
        await parseErrorMessage(res, 'Không thể gỡ khỏi danh sách yêu thích'),
        res.status
      );
    }
  },
};
