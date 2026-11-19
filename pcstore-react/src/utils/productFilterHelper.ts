import type { ProductResponse } from '../types/adminProduct';
import type { CategoryResponse, CategoryTreeResponse } from '../types/adminCategory';

export interface PriceRangeOption {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_RANGES: PriceRangeOption[] = [
  { id: 'under-5m', label: 'Dưới 5 triệu', max: 5_000_000 },
  { id: '5m-10m', label: '5 - 10 triệu', min: 5_000_000, max: 10_000_000 },
  { id: '10m-20m', label: '10 - 20 triệu', min: 10_000_000, max: 20_000_000 },
  { id: '20m-40m', label: '20 - 40 triệu', min: 20_000_000, max: 40_000_000 },
  { id: '40m-60m', label: '40 - 60 triệu', min: 40_000_000, max: 60_000_000 },
  { id: 'over-60m', label: 'Trên 60 triệu', min: 60_000_000 },
];

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại' },
  { value: 'PC', label: 'PC lắp ráp' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'COMPONENT', label: 'Linh kiện PC' },
  { value: 'OTHER', label: 'Khác' },
] as const;

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A - Z' },
  { value: 'name_desc', label: 'Tên Z - A' },
];

export function normalizeText(value?: string | null): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function collectDescendantCategoryIds(
  rootId: number,
  tree: CategoryTreeResponse[],
  flatCategories: CategoryResponse[]
): Set<number> {
  const ids = new Set<number>([rootId]);

  const walkTree = (nodes: CategoryTreeResponse[], collecting: boolean) => {
    for (const node of nodes) {
      const isMatch = collecting || node.id === rootId;
      if (isMatch) {
        ids.add(node.id);
      }
      if (node.children && node.children.length > 0) {
        walkTree(node.children, isMatch);
      }
    }
  };

  if (tree.length > 0) {
    walkTree(tree, false);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const cat of flatCategories) {
      if (cat.parentId != null && ids.has(cat.parentId) && !ids.has(cat.id)) {
        ids.add(cat.id);
        changed = true;
      }
    }
  }

  return ids;
}

export interface ResolvedDbCategory {
  category: CategoryResponse;
  categoryIds: Set<number>;
}

/**
 * Chỉ ánh xạ danh mục theo đúng slug hoặc id có trong DB.
 */
export function resolveCategoryFromDb(
  slugOrId: string | undefined,
  categories: CategoryResponse[],
  categoryTree: CategoryTreeResponse[]
): ResolvedDbCategory | null {
  if (!slugOrId || !slugOrId.trim()) return null;

  const raw = slugOrId.trim();

  // 1. Khớp theo slug có trong DB
  const bySlug = categories.find(
    (c) => Boolean(c.slug) && c.slug.toLowerCase() === raw.toLowerCase()
  );
  if (bySlug) {
    return {
      category: bySlug,
      categoryIds: collectDescendantCategoryIds(bySlug.id, categoryTree, categories),
    };
  }

  // 2. Khớp theo ID số có trong DB (trường hợp dùng ?categoryId=123)
  if (/^\d+$/.test(raw)) {
    const numId = Number(raw);
    const byId = categories.find((c) => c.id === numId);
    if (byId) {
      return {
        category: byId,
        categoryIds: collectDescendantCategoryIds(byId.id, categoryTree, categories),
      };
    }
  }

  return null;
}

export function productMatchesDbCategory(
  product: ProductResponse,
  categoryIds: Set<number>
): boolean {
  if (categoryIds.size === 0) return false;
  if (product.primaryCategoryId != null && categoryIds.has(product.primaryCategoryId)) {
    return true;
  }
  if (product.categoryIds?.some((id) => categoryIds.has(id))) {
    return true;
  }
  return false;
}

export function matchesSearchKeyword(
  product: ProductResponse,
  keyword: string,
  categoryMap: Map<number, CategoryResponse>,
  brandMap: Map<number, string>
): boolean {
  const normalizedQuery = normalizeText(keyword);
  if (!normalizedQuery) return true;

  const brandName = product.brandId ? brandMap.get(product.brandId) || '' : '';
  const primaryCatName = product.primaryCategoryId
    ? categoryMap.get(product.primaryCategoryId)?.name || ''
    : '';
  const otherCats = (product.categoryIds || [])
    .map((id) => categoryMap.get(id)?.name || '')
    .join(' ');

  const haystack = normalizeText(
    `${product.name || ''} ${product.code || ''} ${product.slug || ''} ${product.productType || ''} ${brandName} ${primaryCatName} ${otherCats} ${product.specification || ''}`
  );

  if (haystack.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

const RECENT_SEARCH_KEY = 'pcstore_recent_searches';
const MAX_RECENT_SEARCHES = 8;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): string[] {
  const cleaned = term.trim();
  if (!cleaned) return getRecentSearches();

  const existing = getRecentSearches().filter(
    (item) => item.toLowerCase() !== cleaned.toLowerCase()
  );
  const updated = [cleaned, ...existing].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

export function removeRecentSearch(term: string): string[] {
  const updated = getRecentSearches().filter(
    (item) => item.toLowerCase() !== term.toLowerCase()
  );
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCH_KEY);
  } catch {
    // ignore
  }
}
