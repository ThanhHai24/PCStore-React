import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, CartContextType } from '../types/cart';
import type { Product } from '../types/product';
import { mockProducts } from '../data/mockProducts';

const CART_STORAGE_KEY = 'pcstore_cart_items';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: CartItem) => ({
          ...item,
          selectedVariant: item.selectedVariant === '1TB' ? undefined : item.selectedVariant,
        }));
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
    }
    return [
      {
        product: mockProducts[0],
        quantity: 1,
        selectedVariant: 'Đen/Trắng (Chính hãng)',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [items]);

  const addToCart = (product: Product, quantity: number = 1, selectedVariant?: string) => {
    const maxStock = product.stockQuantity ?? 10;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && item.selectedVariant === selectedVariant
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQuantity = updated[existingIndex].quantity + quantity;
        updated[existingIndex].quantity = Math.min(newQuantity, maxStock);
        return updated;
      } else {
        const validQuantity = Math.min(quantity, maxStock);
        return [...prevItems, { product, quantity: validQuantity, selectedVariant }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stockQuantity ?? 10;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce((sum, item) => sum + item.product.numericPrice * item.quantity, 0);

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    // Safe fallback if used outside CartProvider
    return {
      items: [],
      addToCart: () => {},
      removeFromCart: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      totalItems: 0,
      totalPrice: 0,
    };
  }
  return context;
};
