import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';
import type { CartItem, CartContextType, CartToastInfo } from '../types/cart';
import type { Product } from '../types/product';
import defaultPcImg from '../assets/images/products/pc.jpg';

const CART_STORAGE_KEY = 'pcstore_cart_items';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: CartItem) => {
            const numPrice =
              item.product.numericPrice ||
              (item.product.price ? Number(String(item.product.price).replace(/[^\d]/g, '')) : 0);

            return {
              ...item,
              product: {
                ...item.product,
                id: String(item.product.id),
                numericPrice: numPrice,
              },
              quantity: Math.max(1, Number(item.quantity) || 1),
              selectedVariant: item.selectedVariant === '1TB' ? undefined : item.selectedVariant,
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
    }
    return [];
  });

  const [cartToast, setCartToast] = useState<CartToastInfo | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [items]);

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setCartToast(null);
  };

  const addToCart = (product: Product, quantity: number = 1, selectedVariant?: string) => {
    const numPrice =
      product.numericPrice ||
      (product.price ? Number(String(product.price).replace(/[^\d]/g, '')) : 0);

    const safeProduct: Product = {
      ...product,
      id: String(product.id),
      numericPrice: numPrice,
      stockQuantity: product.stockQuantity ?? 15,
      images: product.images && product.images.length > 0 ? product.images : [defaultPcImg],
    };

    const maxStock = safeProduct.stockQuantity ?? 15;
    const addQuantity = Math.max(1, quantity);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) =>
          String(item.product.id) === String(safeProduct.id) &&
          (item.selectedVariant || '') === (selectedVariant || '')
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQuantity = Math.min(updated[existingIndex].quantity + addQuantity, maxStock);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQuantity,
        };
        return updated;
      } else {
        const validQuantity = Math.min(addQuantity, maxStock);
        return [...prevItems, { product: safeProduct, quantity: validQuantity, selectedVariant }];
      }
    });

    // Show live toast notification
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setCartToast({ product: safeProduct, quantity: addQuantity, selectedVariant });
    toastTimerRef.current = setTimeout(() => {
      setCartToast(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  const removeFromCart = (productId: string | number, selectedVariant?: string) => {
    const targetId = String(productId);
    setItems((prevItems) =>
      prevItems.filter((item) => {
        const matchesId = String(item.product.id) === targetId;
        if (!matchesId) return true;
        if (selectedVariant !== undefined) {
          return (item.selectedVariant || '') !== (selectedVariant || '');
        }
        return false;
      })
    );
  };

  const updateQuantity = (
    productId: string | number,
    quantity: number,
    selectedVariant?: string
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedVariant);
      return;
    }

    const targetId = String(productId);
    setItems((prevItems) =>
      prevItems.map((item) => {
        const matchesId = String(item.product.id) === targetId;
        const matchesVariant =
          selectedVariant === undefined || (item.selectedVariant || '') === (selectedVariant || '');

        if (matchesId && matchesVariant) {
          const maxStock = item.product.stockQuantity ?? 15;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const totalPrice = items.reduce((sum, item) => {
    const price =
      item.product.numericPrice ||
      (item.product.price ? Number(String(item.product.price).replace(/[^\d]/g, '')) : 0);
    return sum + price * (Number(item.quantity) || 1);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        cartToast,
        dismissToast,
      }}
    >
      {children}

      {/* Global Add to Cart Toast Notification */}
      {cartToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-3 sm:right-6 z-[9999] max-w-sm w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 transition-all duration-300 animate-in slide-in-from-top-3 fade-in"
        >
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                  Đã thêm vào giỏ hàng!
                </span>
                <button
                  type="button"
                  onClick={dismissToast}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center space-x-2.5">
                <img
                  src={cartToast.product.images?.[0] || defaultPcImg}
                  alt={cartToast.product.title}
                  className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-gray-50 shrink-0"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-bold text-gray-900 truncate leading-snug">
                    {cartToast.product.title}
                  </p>
                  {cartToast.selectedVariant && (
                    <span className="inline-block text-[10px] text-blue-600 bg-blue-50 font-semibold px-1.5 py-0.2 rounded mt-0.5">
                      {cartToast.selectedVariant}
                    </span>
                  )}
                  <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-1">
                    <span>Số lượng: <strong className="text-gray-800">+{cartToast.quantity}</strong></span>
                    <span>•</span>
                    <span className="font-extrabold text-red-600">
                      {(cartToast.product.numericPrice * cartToast.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center space-x-2 pt-2 border-t border-gray-100">
                <Link
                  to="/cart"
                  onClick={dismissToast}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Xem giỏ hàng ({totalItems})</span>
                </Link>
                <button
                  type="button"
                  onClick={dismissToast}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 px-3 rounded-xl transition-colors"
                >
                  Tiếp tục mua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    return {
      items: [],
      addToCart: () => {},
      removeFromCart: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      totalItems: 0,
      totalPrice: 0,
      cartToast: null,
      dismissToast: () => {},
    };
  }
  return context;
};
