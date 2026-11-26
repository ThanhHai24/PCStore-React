import { API_ENDPOINTS } from '../config/api';
import { getDefaultImageForProduct } from './productService';
import type { Product } from '../types/product';

export interface ProductRecommendationDto {
  productId: number;
  productCode?: string | null;
  productName: string;
  price: number;
  imageUrl?: string | null;
  recommendationReason?: string | null;
  score?: number | null;
  inStock?: boolean | null;
  fallback?: boolean | null;
}

export interface PersonalizedRecommendationResponse {
  customerId?: number | null;
  clusterId?: number | null;
  clusterLabel?: string | null;
  strategy?: string | null;
  isFallback?: boolean | null;
  fallbackReason?: string | null;
  products: ProductRecommendationDto[];
}

export interface RecommendedProduct extends Product {
  recommendationReason?: string;
  recommendationScore?: number;
  isFallback?: boolean;
}

function getOptionalAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  try {
    const token = localStorage.getItem('pcstore_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage errors
  }
  return headers;
}

export function mapRecommendationToProduct(dto: ProductRecommendationDto): RecommendedProduct {
  const priceNum = dto.price != null ? Number(dto.price) : 0;
  const priceStr = priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : 'Liên hệ';
  const marketPriceNum = priceNum > 0 ? Math.round(priceNum * 1.15) : undefined;
  const marketPriceStr = marketPriceNum ? `${marketPriceNum.toLocaleString('vi-VN')}đ` : undefined;
  const discountStr = priceNum > 0 ? '-13%' : undefined;

  const firstUrl = dto.imageUrl?.split(';')[0]?.trim();
  const image =
    firstUrl && !firstUrl.includes('example.com')
      ? firstUrl
      : getDefaultImageForProduct({ name: dto.productName });

  return {
    id: String(dto.productId),
    title: dto.productName || `Sản phẩm #${dto.productId}`,
    images: [image],
    thumbnails: [image],
    price: priceStr,
    numericPrice: priceNum,
    marketPrice: marketPriceStr,
    discountPercent: discountStr,
    badge: dto.fallback ? undefined : 'GỢI Ý',
    inStock: dto.inStock ?? true,
    warrantyInfo: 'Bảo hành chính hãng',
    rating: 5,
    reviewCount: 0,
    viewCount: 0,
    commentCount: 0,
    purchaseCount: 0,
    promotions: dto.recommendationReason ? [dto.recommendationReason] : [],
    specsTable: [],
    recommendationReason: dto.recommendationReason || undefined,
    recommendationScore: dto.score ?? undefined,
    isFallback: dto.fallback ?? false,
  };
}

export const recommendationService = {
  /**
   * GET /api/recommendations/products/{id}/similar
   */
  async getSimilarProducts(
    productId: string | number,
    limit: number = 8
  ): Promise<ProductRecommendationDto[]> {
    const safeLimit = Math.min(10, Math.max(1, limit));
    const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS.SIMILAR(productId, safeLimit), {
      method: 'GET',
      headers: getOptionalAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Không thể tải sản phẩm tương tự (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  /**
   * GET /api/recommendations/products/{id}/frequently-bought-together
   */
  async getFrequentlyBoughtTogether(
    productId: string | number,
    limit: number = 8
  ): Promise<ProductRecommendationDto[]> {
    const safeLimit = Math.min(10, Math.max(1, limit));
    const response = await fetch(
      API_ENDPOINTS.RECOMMENDATIONS.FREQUENTLY_BOUGHT_TOGETHER(productId, safeLimit),
      {
        method: 'GET',
        headers: getOptionalAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Không thể tải sản phẩm thường mua cùng nhau (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  /**
   * GET /api/recommendations/personalized
   */
  async getPersonalizedRecommendations(
    limit: number = 8
  ): Promise<PersonalizedRecommendationResponse> {
    const safeLimit = Math.min(20, Math.max(1, limit));
    const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS.PERSONALIZED(safeLimit), {
      method: 'GET',
      headers: getOptionalAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Không thể tải gợi ý cá nhân hóa (${response.status})`);
    }

    const data = await response.json();
    return {
      ...data,
      products: Array.isArray(data?.products) ? data.products : [],
    };
  },
};
