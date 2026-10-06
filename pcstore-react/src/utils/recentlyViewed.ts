import type { Product } from '../types/product';

const STORAGE_KEY = 'pcstore_recently_viewed_products';

export function getRecentlyViewedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to read recently viewed products:', err);
    return [];
  }
}

export function addRecentlyViewedProduct(product: Product): Product[] {
  if (!product || !product.id || !product.title) return getRecentlyViewedProducts();

  try {
    const currentList = getRecentlyViewedProducts();
    // Filter out current product to avoid duplicates
    const filtered = currentList.filter((p) => String(p.id) !== String(product.id));

    // Add product to front
    const updated = [product, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save recently viewed product:', err);
    return getRecentlyViewedProducts();
  }
}
