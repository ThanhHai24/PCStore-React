import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Heart, LogIn, X } from 'lucide-react';
import type { Product } from '../types/product';
import type { WishlistContextType, WishlistToastInfo } from '../types/wishlist';
import { useAuth } from './AuthContext';
import {
  favoriteService,
  mapFavoriteToProduct,
  FavoriteApiError,
} from '../services/favoriteService';
import defaultPcImg from '../assets/images/products/pc.jpg';

const LEGACY_WISHLIST_STORAGE_KEY = 'pcstore_wishlist_items';

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const isCustomer = isAuthenticated && String(user?.role || '').toUpperCase() === 'CUSTOMER';
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [wishlistToast, setWishlistToast] = useState<WishlistToastInfo | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dọn cache localStorage cũ để tránh lệch dữ liệu với BE
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_WISHLIST_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    if (!isCustomer) {
      setWishlist([]);
      return;
    }

    setLoading(true);
    try {
      const pageRes = await favoriteService.getFavorites(0, 100);
      const mapped = (pageRes.content || []).map(mapFavoriteToProduct);
      setWishlist(mapped);
    } catch (e) {
      console.error('Không thể tải danh sách sản phẩm yêu thích từ BE:', e);
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  // Chỉ tải và giữ danh sách yêu thích cho tài khoản CUSTOMER; role khác hoặc chưa đăng nhập thì để trống
  // Không phụ thuộc vào `token` để tránh lặp gọi lại khi refresh token rotation chạy
  useEffect(() => {
    if (isCustomer && user?.id) {
      refreshWishlist();
    } else {
      setWishlist([]);
    }
  }, [isCustomer, user?.id, refreshWishlist]);

  const dismissWishlistToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setWishlistToast(null);
  };

  const showToast = (
    product: Product,
    action: WishlistToastInfo['action'],
    message?: string
  ) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setWishlistToast({ product, action, message });
    toastTimerRef.current = setTimeout(() => {
      setWishlistToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const isFavorite = (productId: string | number): boolean => {
    if (!isCustomer) return false;
    const targetId = String(productId);
    return wishlist.some((item) => String(item.id) === targetId);
  };

  const addToWishlist = (product: Product) => {
    if (!isAuthenticated) {
      showToast(product, 'auth_required', 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.');
      return;
    }
    if (!isCustomer) {
      showToast(
        product,
        'error',
        'Tính năng yêu thích chỉ hỗ trợ cho tài khoản khách hàng (CUSTOMER).'
      );
      return;
    }

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

    // Optimistic update
    setWishlist((prev) => {
      if (prev.some((item) => String(item.id) === targetId)) {
        return prev;
      }
      return [safeProduct, ...prev];
    });
    showToast(safeProduct, 'added');

    favoriteService
      .addFavorite(targetId)
      .then((res) => {
        const synced = mapFavoriteToProduct(res);
        setWishlist((prev) =>
          prev.map((item) => (String(item.id) === targetId ? { ...safeProduct, ...synced } : item))
        );
      })
      .catch((err: any) => {
        // Rollback nếu BE trả lỗi
        setWishlist((prev) => prev.filter((item) => String(item.id) !== targetId));
        if (err instanceof FavoriteApiError && err.status === 401) {
          showToast(
            safeProduct,
            'auth_required',
            'Phiên đăng nhập đã hết hạn hoặc chưa hợp lệ. Vui lòng đăng nhập lại để lưu yêu thích.'
          );
        } else {
          showToast(safeProduct, 'error', err?.message || 'Không thể thêm vào danh sách yêu thích.');
        }
      });
  };

  const removeFromWishlist = (productId: string | number) => {
    if (!isCustomer) return;

    const targetId = String(productId);
    const existing = wishlist.find((item) => String(item.id) === targetId);

    // Optimistic remove
    setWishlist((prev) => prev.filter((item) => String(item.id) !== targetId));
    if (existing) {
      showToast(existing, 'removed');
    }

    favoriteService.removeFavorite(targetId).catch((err: any) => {
      // Rollback nếu BE trả lỗi
      if (existing) {
        setWishlist((prev) =>
          prev.some((item) => String(item.id) === targetId) ? prev : [existing, ...prev]
        );
        if (err instanceof FavoriteApiError && err.status === 401) {
          showToast(
            existing,
            'auth_required',
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          );
        } else {
          showToast(existing, 'error', err?.message || 'Không thể gỡ sản phẩm khỏi yêu thích.');
        }
      }
    });
  };

  const toggleFavorite = (product: Product) => {
    if (!isAuthenticated) {
      showToast(product, 'auth_required', 'Vui lòng đăng nhập để sử dụng danh sách yêu thích.');
      return;
    }
    if (!isCustomer) {
      showToast(
        product,
        'error',
        'Tính năng yêu thích chỉ hỗ trợ cho tài khoản khách hàng (CUSTOMER).'
      );
      return;
    }

    const targetId = String(product.id);
    const exists = wishlist.some((item) => String(item.id) === targetId);
    if (exists) {
      removeFromWishlist(targetId);
    } else {
      addToWishlist(product);
    }
  };

  const clearWishlist = () => {
    if (!isCustomer) {
      setWishlist([]);
      return;
    }

    const currentItems = [...wishlist];
    setWishlist([]);

    if (currentItems.length > 0) {
      Promise.allSettled(
        currentItems.map((item) => favoriteService.removeFavorite(item.id))
      ).then((results) => {
        const hasFailure = results.some((r) => r.status === 'rejected');
        if (hasFailure) {
          refreshWishlist();
        }
      });
    }
  };

  const totalFavorites = isCustomer ? wishlist.length : 0;

  return (
    <WishlistContext.Provider
      value={{
        wishlist: isCustomer ? wishlist : [],
        totalFavorites,
        loading,
        isFavorite,
        toggleFavorite,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        refreshWishlist,
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
                  : wishlistToast.action === 'auth_required'
                    ? 'bg-blue-100 text-blue-600'
                    : wishlistToast.action === 'error'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
              }`}
            >
              {wishlistToast.action === 'auth_required' ? (
                <LogIn className="w-5 h-5 text-blue-600" />
              ) : (
                <Heart
                  className={`w-5 h-5 ${
                    wishlistToast.action === 'added'
                      ? 'fill-rose-500 text-rose-500'
                      : wishlistToast.action === 'error'
                        ? 'text-red-500'
                        : 'text-gray-500'
                  }`}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    wishlistToast.action === 'added'
                      ? 'text-rose-600'
                      : wishlistToast.action === 'auth_required'
                        ? 'text-blue-600'
                        : wishlistToast.action === 'error'
                          ? 'text-red-600'
                          : 'text-gray-700'
                  }`}
                >
                  {wishlistToast.action === 'added'
                    ? 'Đã thêm vào yêu thích!'
                    : wishlistToast.action === 'removed'
                      ? 'Đã xóa khỏi yêu thích!'
                      : wishlistToast.action === 'auth_required'
                        ? 'Yêu cầu đăng nhập'
                        : 'Thao tác thất bại'}
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

              {wishlistToast.message ? (
                <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                  {wishlistToast.message}
                </p>
              ) : (
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
              )}

              <div className="mt-3 flex items-center space-x-2 pt-2 border-t border-gray-100">
                {wishlistToast.action === 'auth_required' ? (
                  <Link
                    to="/login"
                    onClick={dismissWishlistToast}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập ngay</span>
                  </Link>
                ) : (
                  <Link
                    to="/account?tab=wishlist"
                    onClick={dismissWishlistToast}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    <span>Xem yêu thích ({totalFavorites})</span>
                  </Link>
                )}
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
      loading: false,
      isFavorite: () => false,
      toggleFavorite: () => {},
      addToWishlist: () => {},
      removeFromWishlist: () => {},
      clearWishlist: () => {},
      refreshWishlist: async () => {},
      wishlistToast: null,
      dismissWishlistToast: () => {},
    };
  }
  return context;
};
