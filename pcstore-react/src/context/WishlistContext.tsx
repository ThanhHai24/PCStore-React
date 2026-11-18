import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import type { Product } from '../types/product';
import type { WishlistContextType, WishlistToastInfo } from '../types/wishlist';
import defaultPcImg from '../assets/images/products/pc.jpg';

const WISHLIST_STORAGE_KEY = 'pcstore_wishlist_items';

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: Product) => {
            const numPrice =
              item.numericPrice ||
              (item.price ? Number(String(item.price).replace(/[^\d]/g, '')) : 0);

            return {
              ...item,
              id: String(item.id),
              numericPrice: numPrice,
              images: item.images && item.images.length > 0 ? item.images : [defaultPcImg],
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load wishlist from localStorage:', e);
    }
    return [];
  });

  const [wishlistToast, setWishlistToast] = useState<WishlistToastInfo | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage:', e);
    }
  }, [wishlist]);

  const dismissWishlistToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setWishlistToast(null);
  };

  const showToast = (product: Product, action: 'added' | 'removed') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setWishlistToast({ product, action });
    toastTimerRef.current = setTimeout(() => {
      setWishlistToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const isFavorite = (productId: string | number): boolean => {
    const targetId = String(productId);
    return wishlist.some((item) => String(item.id) === targetId);
  };

  const addToWishlist = (product: Product) => {
    const targetId = String(product.id);
    const numPrice =
      product.numericPrice ||
      (product.price ? Number(String(product.price).replace(/[^\d]/g, '')) : 0);

    const safeProduct: Product = {
      ...product,
      id: targetId,
      numericPrice: numPrice,
      images: product.images && product.images.length > 0 ? product.images : [defaultPcImg],
    };

    setWishlist((prev) => {
      if (prev.some((item) => String(item.id) === targetId)) {
        return prev;
      }
      return [safeProduct, ...prev];
    });

    showToast(safeProduct, 'added');
  };

  const removeFromWishlist = (productId: string | number) => {
    const targetId = String(productId);
    const existing = wishlist.find((item) => String(item.id) === targetId);

    setWishlist((prev) => prev.filter((item) => String(item.id) !== targetId));

    if (existing) {
      showToast(existing, 'removed');
    }
  };

  const toggleFavorite = (product: Product) => {
    const targetId = String(product.id);
    const exists = wishlist.some((item) => String(item.id) === targetId);
    if (exists) {
      removeFromWishlist(targetId);
    } else {
      addToWishlist(product);
    }
  };

  const clearWishlist = () => {
    setWishlist([]);
    try {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const totalFavorites = wishlist.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        totalFavorites,
        isFavorite,
        toggleFavorite,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        wishlistToast,
        dismissWishlistToast,
      }}
    >
      {children}

      {/* Global Wishlist Toast Notification */}
      {wishlistToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-3 sm:right-6 z-[9999] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 transition-all duration-300 animate-in slide-in-from-top-3 fade-in"
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-colors ${
                wishlistToast.action === 'added'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${
                  wishlistToast.action === 'added'
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-gray-500'
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    wishlistToast.action === 'added' ? 'text-rose-600' : 'text-gray-700'
                  }`}
                >
                  {wishlistToast.action === 'added'
                    ? 'Đã thêm vào yêu thích!'
                    : 'Đã xóa khỏi yêu thích!'}
                </span>
                <button
                  type="button"
                  onClick={dismissWishlistToast}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center space-x-2.5">
                <img
                  src={wishlistToast.product.images?.[0] || defaultPcImg}
                  alt={wishlistToast.product.title}
                  className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-gray-50 shrink-0"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-bold text-gray-900 truncate leading-snug">
                    {wishlistToast.product.title}
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-1">
                    <span className="font-extrabold text-red-600">
                      {wishlistToast.product.price}
                    </span>
                    {wishlistToast.product.marketPrice && (
                      <span className="line-through text-gray-400">
                        {wishlistToast.product.marketPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center space-x-2 pt-2 border-t border-gray-100">
                <Link
                  to="/account?tab=wishlist"
                  onClick={dismissWishlistToast}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  <span>Xem yêu thích ({totalFavorites})</span>
                </Link>
                <button
                  type="button"
                  onClick={dismissWishlistToast}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 px-3 rounded-xl transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    return {
      wishlist: [],
      totalFavorites: 0,
      isFavorite: () => false,
      toggleFavorite: () => {},
      addToWishlist: () => {},
      removeFromWishlist: () => {},
      clearWishlist: () => {},
      wishlistToast: null,
      dismissWishlistToast: () => {},
    };
  }
  return context;
};
