import type { Product } from './product';

export interface WishlistToastInfo {
  product: Product;
  action: 'added' | 'removed' | 'auth_required' | 'error';
  message?: string;
}

export interface WishlistContextType {
  wishlist: Product[];
  totalFavorites: number;
  loading: boolean;
  isFavorite: (productId: string | number) => boolean;
  toggleFavorite: (product: Product) => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string | number) => void;
  clearWishlist: () => void;
  refreshWishlist: () => Promise<void>;
  wishlistToast: WishlistToastInfo | null;
  dismissWishlistToast: () => void;
}
