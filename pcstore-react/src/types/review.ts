// ==================== BACKEND DTO TYPES ====================

export interface ReviewResponse {
  id: number;
  productId: number;
  customerId: number;
  rating: number;
  content: string | null;
  createdDate: string;
  lastModifiedDate: string;
}

export interface ReviewRequest {
  rating: number;
  content?: string | null;
}

export interface PageResponseReviewResponse {
  content: ReviewResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CommentResponse {
  id: number;
  productId: number;
  parentId: number | null;
  content: string | null;
  isDeleted: boolean;
  createdBy: number | null;
  createdDate: string;
  lastModifiedBy: number | null;
  lastModifiedDate: string;
}

export interface CommentRequest {
  content: string;
}

export interface PageResponseCommentResponse {
  content: CommentResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ==================== FRONTEND UI MODELS ====================

export interface ReviewItem {
  id: string;
  numericId?: number;
  userId?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  userName: string;
  userAvatar?: string | null;
  userRole?: string;
  rating: number;
  title?: string | null;
  comment: string;
  images?: string[];
  purchased: boolean;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  isEdited?: boolean;
}

export interface CommentItem {
  id: string;
  numericId: number;
  productId: string;
  productName?: string;
  productImage?: string;
  parentId: number | null;
  userId?: string;
  userName: string;
  userAvatar?: string | null;
  userRole?: string;
  isAdminAuthor?: boolean;
  content: string;
  images?: string[];
  isDeleted: boolean;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  isEdited?: boolean;
  replies: CommentItem[];
}

export interface StarCount {
  star: number;
  count: number;
  percentage: number;
}

export interface ReviewSummary {
  totalReviews: number;
  avgRating: number;
  starCounts: StarCount[];
}

export interface ProductReviewsResponse {
  productId: string;
  userHasPurchased?: boolean;
  summary: ReviewSummary;
  reviews: ReviewItem[];
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
  title?: string;
  images?: string[];
  author?: {
    id?: string | number;
    fullName?: string;
    avatar?: string | null;
    role?: string;
  };
}

export interface CreateCommentPayload {
  content: string;
  images?: string[];
  author?: {
    id?: string | number;
    fullName?: string;
    avatar?: string | null;
    role?: string;
  };
}
