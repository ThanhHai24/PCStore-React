import type { Product } from './product';

export interface WishlistToastInfo {
  product: Product;
  action: 'added' | 'removed';
}

export interface WishlistContextType {
  wishlist: Product[];
  totalFavorites: number;
  isFavorite: (productId: string | number) => boolean;
  toggleFavorite: (product: Product) => void;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string | number) => void;
  clearWishlist: () => void;
  wishlistToast: WishlistToastInfo | null;
  dismissWishlistToast: () => void;
}
