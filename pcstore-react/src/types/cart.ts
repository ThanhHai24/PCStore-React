import type { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface CustomerInfo {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  ward?: string;
  district?: string;
  note?: string;
  invoiceRequired?: boolean;
}

export interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariant?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}
