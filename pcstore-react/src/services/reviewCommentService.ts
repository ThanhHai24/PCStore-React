import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import { orderService } from './orderService';
import { adminUserService } from './adminUserService';
import type {
  ReviewResponse,
  ReviewRequest,
  PageResponseReviewResponse,
  CommentResponse,
  CommentRequest,
  PageResponseCommentResponse,
  ReviewItem,
  CommentItem,
  ReviewSummary,
  StarCount,
  CreateReviewPayload,
  CreateCommentPayload,
} from '../types/review';

const USER_CACHE_KEY = 'pcstore_user_profiles_cache_v1';
const REVIEW_META_CACHE_KEY = 'pcstore_review_meta_cache_v1';
const COMMENT_META_CACHE_KEY = 'pcstore_comment_meta_cache_v1';

export interface CachedUserProfile {
  id: string;
  fullName: string;
  username?: string;
  role?: string;
  avatar?: string | null;
}

interface ContentMeta {
  name?: string;
  role?: string;
  avatar?: string | null;
  title?: string;
  images?: string[];
}

// ==================== USER PROFILE CACHE HELPERS ====================

export function getUserProfileCache(): Record<string, CachedUserProfile> {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    const cache: Record<string, CachedUserProfile> = raw ? JSON.parse(raw) : {};

    // Always include current logged-in user if available
    const currentRaw = localStorage.getItem('pcstore_user');
    if (currentRaw) {
      const curr = JSON.parse(currentRaw);
      if (curr && curr.id !== undefined) {
        cache[String(curr.id)] = {
          id: String(curr.id),
          fullName: curr.fullName || curr.username || `Khách hàng #${curr.id}`,
          username: curr.username,
          role: curr.role,
          avatar: curr.avatar,
        };
      }
    }
    return cache;
  } catch {
    return {};
  }
}

export function saveUserProfileToCache(profile: CachedUserProfile): void {
  if (!profile || !profile.id) return;
  try {
    const cache = getUserProfileCache();
    cache[String(profile.id)] = {
      ...cache[String(profile.id)],
      ...profile,
    };
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

let adminUsersSynced = false;

export async function syncAdminUserDirectoryIfPossible(userRole?: string): Promise<void> {
  if (adminUsersSynced || userRole !== 'ADMIN') return;
  try {
    adminUsersSynced = true;
    const res = await adminUserService.getAllUsers({ page: 0, size: 100 });
    if (res?.content && Array.isArray(res.content)) {
      const cache = getUserProfileCache();
      res.content.forEach((u) => {
        cache[String(u.id)] = {
          id: String(u.id),
          fullName: u.fullName || u.username || `Người dùng #${u.id}`,
          username: u.username,
          role: u.role,
          avatar: cache[String(u.id)]?.avatar,
        };
      });
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    adminUsersSynced = false;
  }
}

// ==================== CONTENT METADATA & IMAGE ENCODING ====================

function getLocalMetaMap(storageKey: string): Record<string, ContentMeta> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalMeta(storageKey: string, itemKey: string, meta: ContentMeta): void {
  try {
    const map = getLocalMetaMap(storageKey);
    map[itemKey] = { ...map[itemKey], ...meta };
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Gắn kèm ảnh [IMG:url] vào cuối chuỗi content để lưu bền vững trên DB
 * mà vẫn giữ nội dung văn bản sạch đẹp khi đọc trực tiếp.
 */
export function serializeContent(text: string, images?: string[]): string {
  const cleanText = (text || '').trim();
  const validImages = (images || []).map((u) => u.trim()).filter(Boolean);
  if (validImages.length === 0) {
    return cleanText;
  }
  const imgTags = validImages.map((url) => `[IMG:${url}]`).join('\n');
  return cleanText ? `${cleanText}\n${imgTags}` : imgTags;
}

/**
 * Tách nội dung văn bản gốc và danh sách URL ảnh đính kèm từ chuỗi content
 */
export function parseSerializedContent(rawContent?: string | null): {
  cleanText: string;
  images: string[];
} {
  if (!rawContent) {
    return { cleanText: '', images: [] };
  }

  const images: string[] = [];
  const imgRegex = /\[IMG:(https?:\/\/[^\]\s]+)\]/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(rawContent)) !== null) {
    if (match[1] && !images.includes(match[1])) {
      images.push(match[1]);
    }
  }

  const cleanText = rawContent
    .replace(/\[IMG:https?:\/\/[^\]\s]+\]/gi, '')
    .trim();

  return { cleanText, images };
}

// ==================== FORMAT DATE HELPER ====================

export function formatReviewDate(isoStr?: string | null): string {
  if (!isoStr) return new Date().toLocaleDateString('vi-VN');
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

// ==================== RESPONSE ERROR HANDLER & READ HELPER ====================

/**
 * Helper gọi GET API an toàn cho cả endpoint Public và endpoint yêu cầu JWT:
 * - Nếu có token trong localStorage, đính kèm Authorization header.
 * - Nếu gặp 401/403 (ví dụ token cũ trên public endpoint), thử gọi không kèm token;
 *   nếu vẫn 401 thì dùng fetchWithAuth để tự động refresh token.
 */
async function fetchReadApi(url: string): Promise<Response> {
  const token = localStorage.getItem('pcstore_token');
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!token) {
    return fetch(url, {
      method: 'GET',
      headers: baseHeaders,
    });
  }

  const authRes = await fetch(url, {
    method: 'GET',
    headers: {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    },
  });

  if (authRes.status === 401 || authRes.status === 403) {
    // Thử gọi public (không đính kèm token) phòng trường hợp token hết hạn nhưng API cho phép public
    const publicRes = await fetch(url, {
      method: 'GET',
      headers: baseHeaders,
    });
    if (publicRes.ok) {
      return publicRes;
    }
    // Nếu public cũng trả về 401, gọi fetchWithAuth để refresh token
    if (publicRes.status === 401) {
      return fetchWithAuth(url, {
        method: 'GET',
        headers: baseHeaders,
      });
    }
    return authRes;
  }

  return authRes;
}

/**
 * Trích xuất mảng dữ liệu linh hoạt từ nhiều cấu trúc response (PageResponse, mảng trực tiếp, data wrapper)
 */
function extractContentArray<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.content)) return data.data.content;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

async function handleApiResponse<T>(
  res: Response,
  contextType: 'review' | 'comment'
): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json') || contentType.includes('application/problem+json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    let serverDetail =
      typeof data === 'object' && data !== null
        ? data.detail || data.message || data.error
        : typeof data === 'string' && data.trim()
        ? data.trim()
        : null;

    if (typeof data === 'object' && data?.errors && typeof data.errors === 'object') {
      const fieldErrs = Object.values(data.errors).flat().join(', ');
      if (fieldErrs) {
        serverDetail = serverDetail ? `${serverDetail}: ${fieldErrs}` : fieldErrs;
      }
    }

    if (serverDetail) {
      throw new Error(serverDetail);
    }

    if (res.status === 401) {
      throw new Error('Vui lòng đăng nhập tài khoản để thực hiện chức năng này.');
    }
    if (res.status === 403) {
      if (contextType === 'review') {
        throw new Error(
          'Chỉ khách hàng đã mua sản phẩm này trong đơn hàng đã hoàn tất (COMPLETED) mới có thể gửi hoặc chỉnh sửa đánh giá.'
        );
      }
      throw new Error('Bạn không có quyền thực hiện thao tác này.');
    }
    if (res.status === 404) {
      throw new Error(
        contextType === 'review'
          ? 'Không tìm thấy đánh giá hoặc sản phẩm.'
          : 'Không tìm thấy bình luận hoặc sản phẩm.'
      );
    }
    if (res.status === 409) {
      throw new Error('Bạn đã đánh giá sản phẩm này trước đó. Bạn có thể bấm "Sửa đánh giá" để cập nhật.');
    }

    throw new Error(`Lỗi máy chủ (${res.status}). Vui lòng thử lại sau.`);
  }

  return data as T;
}

// ==================== MAPPERS ====================

export function mapReviewResponseToItem(
  dto: ReviewResponse,
  productMeta?: { name?: string; image?: string }
): ReviewItem {
  const userCache = getUserProfileCache();
  const cachedUser = dto.customerId != null ? userCache[String(dto.customerId)] : undefined;
  const localMetaMap = getLocalMetaMap(REVIEW_META_CACHE_KEY);
  const itemMeta = localMetaMap[`${dto.productId}_${dto.id}`];

  const { cleanText, images: parsedImages } = parseSerializedContent(dto.content);
  const mergedImages =
    parsedImages.length > 0
      ? parsedImages
      : itemMeta?.images && itemMeta.images.length > 0
      ? itemMeta.images
      : [];

  const userName =
    itemMeta?.name ||
    cachedUser?.fullName ||
    cachedUser?.username ||
    (dto.customerId ? `Khách hàng #${dto.customerId}` : 'Khách hàng');

  const userAvatar = itemMeta?.avatar || cachedUser?.avatar || null;
  const userRole = itemMeta?.role || cachedUser?.role || 'CUSTOMER';

  const isEdited =
    Boolean(dto.createdDate && dto.lastModifiedDate) &&
    Math.abs(new Date(dto.lastModifiedDate).getTime() - new Date(dto.createdDate).getTime()) > 2000;

  return {
    id: String(dto.id),
    numericId: dto.id,
    userId: dto.customerId != null ? String(dto.customerId) : undefined,
    productId: String(dto.productId),
    productName: productMeta?.name,
    productImage: productMeta?.image,
    userName,
    userAvatar,
    userRole,
    rating: Number(dto.rating) || 5,
    title: itemMeta?.title || null,
    comment: cleanText,
    images: mergedImages,
    purchased: true, // Backend ReviewService guarantees COMPLETED order purchase
    date: formatReviewDate(dto.createdDate),
    createdAt: dto.createdDate,
    updatedAt: dto.lastModifiedDate,
    isEdited,
  };
}

export function mapCommentResponseToItem(
  dto: CommentResponse,
  replies: CommentItem[] = [],
  productMeta?: { name?: string; image?: string }
): CommentItem {
  const userCache = getUserProfileCache();
  const cachedUser = dto.createdBy != null ? userCache[String(dto.createdBy)] : undefined;
  const localMetaMap = getLocalMetaMap(COMMENT_META_CACHE_KEY);
  const itemMeta = localMetaMap[`${dto.productId}_${dto.id}`];

  const { cleanText, images: parsedImages } = parseSerializedContent(dto.content);
  const mergedImages =
    parsedImages.length > 0
      ? parsedImages
      : itemMeta?.images && itemMeta.images.length > 0
      ? itemMeta.images
      : [];

  const userRole = itemMeta?.role || cachedUser?.role || (dto.createdBy === 1 ? 'ADMIN' : 'CUSTOMER');
  const isAdminAuthor =
    userRole === 'ADMIN' ||
    userRole === 'MANAGER' ||
    (typeof userRole === 'string' && userRole.startsWith('STAFF'));

  const userName =
    itemMeta?.name ||
    cachedUser?.fullName ||
    cachedUser?.username ||
    (isAdminAuthor
      ? 'QTV PCStore'
      : dto.createdBy
      ? `Khách hàng #${dto.createdBy}`
      : 'Khách hàng');

  const userAvatar = itemMeta?.avatar || cachedUser?.avatar || null;

  const isEdited =
    Boolean(dto.createdDate && dto.lastModifiedDate) &&
    Math.abs(new Date(dto.lastModifiedDate).getTime() - new Date(dto.createdDate).getTime()) > 2000;

  return {
    id: String(dto.id),
    numericId: dto.id,
    productId: String(dto.productId),
    productName: productMeta?.name,
    productImage: productMeta?.image,
    parentId: dto.parentId,
    userId: dto.createdBy != null ? String(dto.createdBy) : undefined,
    userName,
    userAvatar,
    userRole,
    isAdminAuthor,
    content: dto.isDeleted ? 'Bình luận này đã bị xóa.' : cleanText,
    images: dto.isDeleted ? [] : mergedImages,
    isDeleted: Boolean(dto.isDeleted),
    date: formatReviewDate(dto.createdDate),
    createdAt: dto.createdDate,
    updatedAt: dto.lastModifiedDate,
    isEdited,
    replies,
  };
}

export function calculateReviewSummary(reviews: ReviewItem[]): ReviewSummary {
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

  const starCounts: StarCount[] = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  return {
    totalReviews,
    avgRating,
    starCounts,
  };
}

// ==================== SERVICE IMPLEMENTATION ====================

export const reviewCommentService = {
  // -------------------- 1. REVIEWS --------------------

  async getProductReviews(
    productId: number | string,
    page: number = 0,
    size: number = 50,
    productMeta?: { name?: string; image?: string }
  ): Promise<{
    reviews: ReviewItem[];
    summary: ReviewSummary;
    rawPage: PageResponseReviewResponse;
  }> {
    const url = `${API_ENDPOINTS.PRODUCTS.REVIEWS(productId)}?page=${page}&size=${size}`;
    const res = await fetchReadApi(url);

    const data = await handleApiResponse<PageResponseReviewResponse>(res, 'review');
    const content = extractContentArray<ReviewResponse>(data);
    const reviews = content.map((item) => mapReviewResponseToItem(item, productMeta));
    const summary = calculateReviewSummary(reviews);

    return {
      reviews,
      summary,
      rawPage: data,
    };
  },

  async getReviewById(
    productId: number | string,
    reviewId: number | string
  ): Promise<ReviewItem> {
    const res = await fetchReadApi(API_ENDPOINTS.PRODUCTS.REVIEW_DETAIL(productId, reviewId));
    const dto = await handleApiResponse<ReviewResponse>(res, 'review');
    return mapReviewResponseToItem(dto);
  },

  async createReview(
    productId: number | string,
    payload: CreateReviewPayload
  ): Promise<ReviewItem> {
    if (payload.author?.id) {
      saveUserProfileToCache({
        id: String(payload.author.id),
        fullName: payload.author.fullName || 'Khách hàng',
        avatar: payload.author.avatar,
        role: payload.author.role,
      });
    }

    const serializedContent = serializeContent(payload.comment, payload.images);
    const body: ReviewRequest = {
      rating: Math.min(5, Math.max(0, Math.round(payload.rating))),
      content: serializedContent,
    };

    const res = await fetchWithAuth(API_ENDPOINTS.PRODUCTS.REVIEWS(productId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const dto = await handleApiResponse<ReviewResponse>(res, 'review');

    // Save local metadata for rich display
    saveLocalMeta(REVIEW_META_CACHE_KEY, `${dto.productId}_${dto.id}`, {
      name: payload.author?.fullName,
      role: payload.author?.role,
      avatar: payload.author?.avatar,
      title: payload.title,
      images: payload.images,
    });

    return mapReviewResponseToItem(dto);
  },

  async updateReview(
    productId: number | string,
    reviewId: number | string,
    payload: CreateReviewPayload
  ): Promise<ReviewItem> {
    if (payload.author?.id) {
      saveUserProfileToCache({
        id: String(payload.author.id),
        fullName: payload.author.fullName || 'Khách hàng',
        avatar: payload.author.avatar,
        role: payload.author.role,
      });
    }

    const serializedContent = serializeContent(payload.comment, payload.images);
    const body: ReviewRequest = {
      rating: Math.min(5, Math.max(0, Math.round(payload.rating))),
      content: serializedContent,
    };

    const res = await fetchWithAuth(API_ENDPOINTS.PRODUCTS.REVIEW_DETAIL(productId, reviewId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const dto = await handleApiResponse<ReviewResponse>(res, 'review');

    saveLocalMeta(REVIEW_META_CACHE_KEY, `${dto.productId}_${dto.id}`, {
      name: payload.author?.fullName,
      role: payload.author?.role,
      avatar: payload.author?.avatar,
      title: payload.title,
      images: payload.images,
    });

    return mapReviewResponseToItem(dto);
  },

  async deleteReview(productId: number | string, reviewId: number | string): Promise<void> {
    const res = await fetchWithAuth(API_ENDPOINTS.PRODUCTS.REVIEW_DETAIL(productId, reviewId), {
      method: 'DELETE',
    });
    await handleApiResponse<void>(res, 'review');
  },

  // -------------------- 2. COMMENTS & REPLIES --------------------

  async getProductComments(
    productId: number | string,
    page: number = 0,
    size: number = 50,
    productMeta?: { name?: string; image?: string }
  ): Promise<{
    comments: CommentItem[];
    totalCount: number;
    rawPage: PageResponseCommentResponse;
  }> {
    const url = `${API_ENDPOINTS.PRODUCTS.COMMENTS(productId)}?page=${page}&size=${size}`;
    const res = await fetchReadApi(url);

    const rootPage = await handleApiResponse<PageResponseCommentResponse>(res, 'comment');
    const allFetchedDtos = extractContentArray<CommentResponse>(rootPage);

    // Tách bình luận gốc (parentId == null) và các phản hồi (parentId != null) nếu API trả chung trong cùng 1 danh sách
    const rootDtos = allFetchedDtos.filter((c) => c.parentId == null);
    const inlineRepliesMap = new Map<string, CommentResponse[]>();
    allFetchedDtos.forEach((c) => {
      if (c.parentId != null) {
        const key = String(c.parentId);
        const list = inlineRepliesMap.get(key) || [];
        list.push(c);
        inlineRepliesMap.set(key, list);
      }
    });

    // Fetch direct replies for each root comment in parallel
    const commentsWithReplies = await Promise.all(
      rootDtos.map(async (rootDto) => {
        const replyDtoMap = new Map<string, CommentResponse>();

        // 1. Lấy các phản hồi đã có sẵn trong response gốc hoặc nested replies
        const preloaded = inlineRepliesMap.get(String(rootDto.id)) || [];
        preloaded.forEach((r) => replyDtoMap.set(String(r.id), r));

        const nestedReplies = Array.isArray((rootDto as any).replies)
          ? ((rootDto as any).replies as CommentResponse[])
          : [];
        nestedReplies.forEach((r) => {
          if (r && r.id != null) replyDtoMap.set(String(r.id), r);
        });

        // 2. Truy vấn phản hồi từ endpoint ?parentId={id}
        try {
          const replyUrl = `${API_ENDPOINTS.PRODUCTS.COMMENTS(productId)}?parentId=${rootDto.id}&page=0&size=50`;
          const replyRes = await fetchReadApi(replyUrl);
          if (replyRes.ok) {
            const replyPage = await replyRes.json().catch(() => null);
            const fetchedReplies = extractContentArray<CommentResponse>(replyPage);
            fetchedReplies.forEach((r) => {
              // Chỉ nhận những comment thực sự là con của rootDto.id
              if (r && r.id != null && String(r.parentId) === String(rootDto.id)) {
                replyDtoMap.set(String(r.id), r);
              }
            });
          }
        } catch {
          // ignore reply load error for single item
        }

        const activeReplies = Array.from(replyDtoMap.values())
          .filter((r) => !r.isDeleted)
          .sort(
            (a, b) =>
              new Date(a.createdDate || 0).getTime() - new Date(b.createdDate || 0).getTime()
          )
          .map((r) => mapCommentResponseToItem(r, [], productMeta));

        return mapCommentResponseToItem(rootDto, activeReplies, productMeta);
      })
    );

    // Filter out soft-deleted root comments that have no active replies
    const visibleComments = commentsWithReplies
      .filter((c) => !c.isDeleted || c.replies.length > 0)
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

    const totalCount = visibleComments.reduce(
      (acc, c) => acc + (c.isDeleted ? 0 : 1) + c.replies.length,
      0
    );

    return {
      comments: visibleComments,
      totalCount,
      rawPage: rootPage,
    };
  },

  async getCommentReplies(
    productId: number | string,
    parentId: number | string,
    page: number = 0,
    size: number = 50
  ): Promise<CommentItem[]> {
    const url = `${API_ENDPOINTS.PRODUCTS.COMMENTS(productId)}?parentId=${parentId}&page=${page}&size=${size}`;
    const res = await fetchReadApi(url);
    const data = await handleApiResponse<PageResponseCommentResponse>(res, 'comment');
    const items = extractContentArray<CommentResponse>(data);
    return items
      .filter((r) => !r.isDeleted && String(r.parentId) === String(parentId))
      .map((r) => mapCommentResponseToItem(r, []));
  },

  async createComment(
    productId: number | string,
    payload: CreateCommentPayload
  ): Promise<CommentItem> {
    if (payload.author?.id) {
      saveUserProfileToCache({
        id: String(payload.author.id),
        fullName: payload.author.fullName || 'Khách hàng',
        avatar: payload.author.avatar,
        role: payload.author.role,
      });
    }

    const serializedContent = serializeContent(payload.content, payload.images);
    const body: CommentRequest = { content: serializedContent };

    const res = await fetchWithAuth(API_ENDPOINTS.PRODUCTS.COMMENTS(productId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const dto = await handleApiResponse<CommentResponse>(res, 'comment');

    saveLocalMeta(COMMENT_META_CACHE_KEY, `${dto.productId}_${dto.id}`, {
      name: payload.author?.fullName,
      role: payload.author?.role,
      avatar: payload.author?.avatar,
      images: payload.images,
    });

    return mapCommentResponseToItem(dto, []);
  },

  async replyComment(
    productId: number | string,
    parentCommentId: number | string,
    payload: CreateCommentPayload
  ): Promise<CommentItem> {
    if (payload.author?.id) {
      saveUserProfileToCache({
        id: String(payload.author.id),
        fullName: payload.author.fullName || 'Khách hàng',
        avatar: payload.author.avatar,
        role: payload.author.role,
      });
    }

    const serializedContent = serializeContent(payload.content, payload.images);
    const body: CommentRequest = { content: serializedContent };

    const res = await fetchWithAuth(
      API_ENDPOINTS.PRODUCTS.COMMENT_REPLIES(productId, parentCommentId),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const dto = await handleApiResponse<CommentResponse>(res, 'comment');

    saveLocalMeta(COMMENT_META_CACHE_KEY, `${dto.productId}_${dto.id}`, {
      name: payload.author?.fullName,
      role: payload.author?.role,
      avatar: payload.author?.avatar,
      images: payload.images,
    });

    return mapCommentResponseToItem(dto, []);
  },

  async updateComment(
    productId: number | string,
    commentId: number | string,
    payload: CreateCommentPayload
  ): Promise<CommentItem> {
    if (payload.author?.id) {
      saveUserProfileToCache({
        id: String(payload.author.id),
        fullName: payload.author.fullName || 'Khách hàng',
        avatar: payload.author.avatar,
        role: payload.author.role,
      });
    }

    const serializedContent = serializeContent(payload.content, payload.images);
    const body: CommentRequest = { content: serializedContent };

    const res = await fetchWithAuth(
      API_ENDPOINTS.PRODUCTS.COMMENT_DETAIL(productId, commentId),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const dto = await handleApiResponse<CommentResponse>(res, 'comment');

    saveLocalMeta(COMMENT_META_CACHE_KEY, `${dto.productId}_${dto.id}`, {
      name: payload.author?.fullName,
      role: payload.author?.role,
      avatar: payload.author?.avatar,
      images: payload.images,
    });

    return mapCommentResponseToItem(dto, []);
  },

  async deleteComment(productId: number | string, commentId: number | string): Promise<void> {
    const res = await fetchWithAuth(
      API_ENDPOINTS.PRODUCTS.COMMENT_DETAIL(productId, commentId),
      {
        method: 'DELETE',
      }
    );
    await handleApiResponse<void>(res, 'comment');
  },

  // -------------------- 3. PURCHASE ELIGIBILITY CHECK --------------------

  /**
   * Kiểm tra xem người dùng hiện tại đã từng mua sản phẩm này trong đơn hàng COMPLETED chưa
   */
  async checkCompletedPurchase(productId: number | string): Promise<boolean> {
    try {
      const ordersPage = await orderService.getMyOrders({
        status: 'COMPLETED',
        page: 0,
        size: 100,
      });
      const completedOrders = extractContentArray<any>(ordersPage);
      for (const order of completedOrders) {
        if (order.status && order.status !== 'COMPLETED') continue;
        if (Array.isArray(order.items) && order.items.length > 0) {
          if (order.items.some((item: any) => String(item.productId) === String(productId))) {
            return true;
          }
        } else if (order.id != null) {
          try {
            const detail = await orderService.getOrderById(order.id);
            if ((detail?.items || []).some((item) => String(item.productId) === String(productId))) {
              return true;
            }
          } catch {
            // ignore detail error
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  },
};

export default reviewCommentService;
