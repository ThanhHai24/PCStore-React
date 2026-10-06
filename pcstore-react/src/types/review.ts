export interface ReviewItem {
  id: string;
  userId?: string;
  productId?: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  purchased: boolean;
  date: string;
  createdAt?: string;
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
}
