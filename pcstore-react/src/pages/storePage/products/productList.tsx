import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  AlertCircle,
  RefreshCw,
  PackageSearch,
  Check,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Tag,
  Layers,
} from 'lucide-react';
import { getProducts, formatProductToCardProps } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { brandService } from '../../../services/brandService';
import type { ProductResponse } from '../../../types/adminProduct';
import type { CategoryResponse, CategoryTreeResponse } from '../../../types/adminCategory';
import type { BrandResponse } from '../../../types/adminBrand';
import ProductCard from '../../../components/storePage/boxProductCategory/productCard';
import ProductListItem from '../../../components/storePage/products/productListItem';
import {
  PRICE_RANGES,
  PRODUCT_TYPE_OPTIONS,
  SORT_OPTIONS,
  type SortOption,
  resolveCategoryFromDb,
  productMatchesDbCategory,
  matchesSearchKeyword,
  addRecentSearch,
  normalizeText,
  collectDescendantCategoryIds,
} from '../../../utils/productFilterHelper';

const PAGE_SIZE = 16;

const QUICK_SUGGESTIONS = [
  'RTX 4070',
  'Core i5',
  'Ryzen 7',
  'PC Gaming',
  'RAM DDR5',
  'SSD 1TB',
];

function parsePositiveNumber(val: string | null): number | undefined {
  if (!val || !val.trim()) return undefined;
  const num = Number(val.replace(/[^\d]/g, ''));
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function formatPriceShort(value?: number): string {
  if (value === undefined) return '';
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)} triệu`;
  }
  return `${value.toLocaleString('vi-VN')}đ`;
}

export const StoreProductList: React.FC = () => {
  const { slug: routeCategorySlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Remote data states
  const [allProducts, setAllProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeResponse[]>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // URL-synced filters
  const searchQuery =
    searchParams.get('search') ||
    searchParams.get('keyword') ||
    searchParams.get('q') ||
    '';
  const queryCategoryParam = searchParams.get('categoryId') || '';
  const activeCategorySlugOrId = routeCategorySlug || queryCategoryParam || undefined;

  const selectedBrandIds = useMemo(() => {
    const raw = searchParams.get('brandId') || '';
    if (!raw.trim()) return [] as number[];
    return raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [searchParams]);

  const selectedProductType = (
    searchParams.get('type') ||
    searchParams.get('productType') ||
    'ALL'
  ).toUpperCase();

  const minPrice = parsePositiveNumber(searchParams.get('minPrice'));
  const maxPrice = parsePositiveNumber(searchParams.get('maxPrice'));
  const onlyInStock = searchParams.get('inStock') === 'true';

  const sortBy = ((): SortOption => {
    const raw = searchParams.get('sort') as SortOption | null;
    if (raw && SORT_OPTIONS.some((o) => o.value === raw)) return raw;
    return 'newest';
  })();

  const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const viewMode: 'grid' | 'list' = searchParams.get('view') === 'list' ? 'list' : 'grid';

  // Local UI state
  const priceSyncKey = `${minPrice ?? ''}-${maxPrice ?? ''}`;
  const [customMinInput, setCustomMinInput] = useState(minPrice !== undefined ? String(minPrice) : '');
  const [customMaxInput, setCustomMaxInput] = useState(maxPrice !== undefined ? String(maxPrice) : '');
  const [prevPriceSyncKey, setPrevPriceSyncKey] = useState(priceSyncKey);
  if (priceSyncKey !== prevPriceSyncKey) {
    setPrevPriceSyncKey(priceSyncKey);
    setCustomMinInput(minPrice !== undefined ? String(minPrice) : '');
    setCustomMaxInput(maxPrice !== undefined ? String(maxPrice) : '');
  }

  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Fetch products, categories, brands
  const loadCatalogData = useCallback(async () => {
    const [firstProductsPage, categoriesRes, treeRes, brandsRes] = await Promise.allSettled([
      getProducts({ page: 0, size: 100, sort: ['id,desc'] }),
      categoryService.getCategories(),
      categoryService.getCategoryTree(),
      brandService.getBrands(),
    ]);

    if (firstProductsPage.status === 'rejected') {
      throw new Error(
        firstProductsPage.reason?.message || 'Không thể tải danh sách sản phẩm từ máy chủ.'
      );
    }

    let combinedProducts: ProductResponse[] = firstProductsPage.value?.content || [];
    const totalPages = Math.min(firstProductsPage.value?.totalPages || 1, 5);

    if (totalPages > 1) {
      const extraPromises = [];
      for (let p = 1; p < totalPages; p++) {
        extraPromises.push(getProducts({ page: p, size: 100, sort: ['id,desc'] }));
      }
      const extraResults = await Promise.allSettled(extraPromises);
      extraResults.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.content) {
          combinedProducts = [...combinedProducts, ...res.value.content];
        }
      });
    }

    const visibleProducts = combinedProducts.filter(
      (p) => String(p.status).toUpperCase() !== 'INACTIVE'
    );

    const activeCats =
      categoriesRes.status === 'fulfilled' && categoriesRes.value?.content
        ? categoriesRes.value.content.filter(
          (c) => c.status !== 0 && String(c.status).toUpperCase() !== 'INACTIVE'
        )
        : [];

    const treeData =
      treeRes.status === 'fulfilled' && Array.isArray(treeRes.value) ? treeRes.value : [];

    const activeBrands =
      brandsRes.status === 'fulfilled' && brandsRes.value?.content
        ? brandsRes.value.content.filter((b) => b.status !== 0 && !b.isDeleted)
        : [];

    return { visibleProducts, activeCats, treeData, activeBrands };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadCatalogData()
      .then(({ visibleProducts, activeCats, treeData, activeBrands }) => {
        if (cancelled) return;
        setAllProducts(visibleProducts);
        setCategories(activeCats);
        setCategoryTree(treeData);
        setBrands(activeBrands);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Lỗi tải danh sách sản phẩm:', err);
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải sản phẩm.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadCatalogData, reloadTick]);

  const handleRetryFetch = () => {
    setLoading(true);
    setError(null);
    setReloadTick((t) => t + 1);
  };

  // Lookup maps
  const categoryMap = useMemo(() => {
    const map = new Map<number, CategoryResponse>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const brandMap = useMemo(() => {
    const map = new Map<number, string>();
    brands.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [brands]);

  // Resolved active category strictly from DB
  const activeDbCategory = useMemo(
    () => resolveCategoryFromDb(activeCategorySlugOrId, categories, categoryTree),
    [activeCategorySlugOrId, categories, categoryTree]
  );
  const isUnknownCategorySlug = Boolean(!loading && activeCategorySlugOrId && !activeDbCategory);

  // Dynamic document title
  useEffect(() => {
    if (searchQuery && activeDbCategory) {
      document.title = `Tìm "${searchQuery}" trong ${activeDbCategory.category.name} | PC Store`;
    } else if (searchQuery) {
      document.title = `Tìm kiếm: ${searchQuery} | PC Store`;
    } else if (activeDbCategory) {
      document.title = `${activeDbCategory.category.name} | PC Store`;
    } else {
      document.title = 'Tất cả sản phẩm | PC Store';
    }
  }, [searchQuery, activeDbCategory]);

  // Helper to update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      // Clean alias params when updating search
      if ('search' in updates) {
        next.delete('keyword');
        next.delete('q');
      }
      if ('type' in updates) {
        next.delete('productType');
      }

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === '' || val === 'ALL') {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });

      if (resetPage) {
        next.delete('page');
      }

      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // Filter products step by step
  const filteredProducts = useMemo(() => {
    if (isUnknownCategorySlug) return [];

    return allProducts.filter((product) => {
      // 1. Category filter (strictly by DB category & descendants)
      if (activeDbCategory) {
        if (!productMatchesDbCategory(product, activeDbCategory.categoryIds)) {
          return false;
        }
      }

      // 2. Search keyword filter
      if (searchQuery.trim()) {
        if (!matchesSearchKeyword(product, searchQuery, categoryMap, brandMap)) {
          return false;
        }
      }

      // 3. Brand filter
      if (selectedBrandIds.length > 0) {
        if (!product.brandId || !selectedBrandIds.includes(product.brandId)) {
          return false;
        }
      }

      // 4. Product type filter
      if (selectedProductType !== 'ALL') {
        if (String(product.productType || '').toUpperCase() !== selectedProductType) {
          return false;
        }
      }

      // 5. Price filter
      const priceNum = product.price != null ? Number(product.price) : 0;
      if (minPrice !== undefined && priceNum < minPrice) {
        return false;
      }
      if (maxPrice !== undefined && priceNum > maxPrice) {
        return false;
      }

      // 6. Stock filter
      if (onlyInStock && String(product.status).toUpperCase() === 'OUT_OF_STOCK') {
        return false;
      }

      return true;
    });
  }, [
    allProducts,
    isUnknownCategorySlug,
    activeDbCategory,
    categoryMap,
    brandMap,
    searchQuery,
    selectedBrandIds,
    selectedProductType,
    minPrice,
    maxPrice,
    onlyInStock,
  ]);

  // Sort filtered products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'name_asc':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
        break;
      case 'name_desc':
        list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'vi'));
        break;
      case 'newest':
      default:
        list.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Pagination calculation
  const totalResults = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [sortedProducts, safePage]);

  // Facet counts for categories & brands
  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    categories.forEach((cat) => {
      const descendants = collectDescendantCategoryIds(cat.id, categoryTree, categories);
      let count = 0;
      for (const p of allProducts) {
        if (
          (p.primaryCategoryId && descendants.has(p.primaryCategoryId)) ||
          p.categoryIds?.some((id) => descendants.has(id))
        ) {
          count++;
        }
      }
      counts.set(cat.id, count);
    });
    return counts;
  }, [categories, categoryTree, allProducts]);

  const brandCounts = useMemo(() => {
    const counts = new Map<number, number>();
    if (isUnknownCategorySlug) return counts;
    // Count brands within current category + search context so user sees relevant counts
    const basePool = allProducts.filter((product) => {
      if (activeDbCategory && !productMatchesDbCategory(product, activeDbCategory.categoryIds)) {
        return false;
      }
      if (searchQuery.trim() && !matchesSearchKeyword(product, searchQuery, categoryMap, brandMap)) {
        return false;
      }
      return true;
    });

    basePool.forEach((p) => {
      if (p.brandId) {
        counts.set(p.brandId, (counts.get(p.brandId) || 0) + 1);
      }
    });
    return counts;
  }, [allProducts, isUnknownCategorySlug, activeDbCategory, categoryMap, brandMap, searchQuery]);

  const filteredBrandList = useMemo(() => {
    const q = normalizeText(brandSearch);
    const list = brands.filter((b) => !q || normalizeText(b.name).includes(q));
    // Sort brands with matching products first
    return [...list].sort((a, b) => (brandCounts.get(b.id) || 0) - (brandCounts.get(a.id) || 0));
  }, [brands, brandSearch, brandCounts]);

  // Active filter count (for badge & clear button)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (activeDbCategory || isUnknownCategorySlug) count++;
    if (selectedBrandIds.length > 0) count += selectedBrandIds.length;
    if (selectedProductType !== 'ALL') count++;
    if (minPrice !== undefined || maxPrice !== undefined) count++;
    if (onlyInStock) count++;
    return count;
  }, [
    searchQuery,
    activeDbCategory,
    isUnknownCategorySlug,
    selectedBrandIds,
    selectedProductType,
    minPrice,
    maxPrice,
    onlyInStock,
  ]);

  // Handlers
  const handleSelectCategory = (cat?: CategoryResponse) => {
    const next = new URLSearchParams(searchParams);
    next.delete('categoryId');
    next.delete('page');
    const qs = next.toString();

    if (!cat) {
      navigate(`/products${qs ? `?${qs}` : ''}`);
    } else if (cat.slug) {
      navigate(`/category/${cat.slug}${qs ? `?${qs}` : ''}`);
    } else {
      next.set('categoryId', String(cat.id));
      navigate(`/products?${next.toString()}`);
    }
    setIsMobileFilterOpen(false);
  };

  const handleToggleBrand = (brandId: number) => {
    const exists = selectedBrandIds.includes(brandId);
    const nextIds = exists
      ? selectedBrandIds.filter((id) => id !== brandId)
      : [...selectedBrandIds, brandId];
    updateParams({ brandId: nextIds.length > 0 ? nextIds.join(',') : null });
  };

  const handleSelectPricePreset = (min?: number, max?: number) => {
    const isSame = minPrice === min && maxPrice === max;
    if (isSame) {
      updateParams({ minPrice: null, maxPrice: null });
    } else {
      updateParams({
        minPrice: min !== undefined ? String(min) : null,
        maxPrice: max !== undefined ? String(max) : null,
      });
    }
  };

  const handleApplyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMin = parsePositiveNumber(customMinInput);
    const parsedMax = parsePositiveNumber(customMaxInput);
    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      updateParams({ minPrice: String(parsedMax), maxPrice: String(parsedMin) });
    } else {
      updateParams({
        minPrice: parsedMin !== undefined ? String(parsedMin) : null,
        maxPrice: parsedMax !== undefined ? String(parsedMax) : null,
      });
    }
    setIsMobileFilterOpen(false);
  };

  const handleClearAllFilters = () => {
    setCustomMinInput('');
    setCustomMaxInput('');
    navigate('/products');
    setIsMobileFilterOpen(false);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === safePage) return;
    updateParams({ page: page === 1 ? null : String(page) }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  // Sidebar filter content (reused for desktop & mobile drawer)
  const renderFilterSidebarContent = () => {
    const visibleCategories = showAllCategories ? categories : categories.slice(0, 10);
    const visibleBrands = showAllBrands ? filteredBrandList : filteredBrandList.slice(0, 8);

    return (
      <div className="space-y-5">
        {/* 1. Danh mục sản phẩm */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Danh mục sản phẩm
            </h3>
            {(activeDbCategory || isUnknownCategorySlug) && (
              <button
                type="button"
                onClick={() => handleSelectCategory(undefined)}
                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Tất cả
              </button>
            )}
          </div>

          <ul className="space-y-1 text-xs">
            <li>
              <button
                type="button"
                onClick={() => handleSelectCategory(undefined)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors cursor-pointer ${!activeDbCategory && !isUnknownCategorySlug
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`}
              >
                <span>Tất cả sản phẩm</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                  {allProducts.length}
                </span>
              </button>
            </li>

            {visibleCategories.map((cat) => {
              const isSelected = activeDbCategory?.category.id === cat.id;
              const count = categoryCounts.get(cat.id) || 0;

              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-gray-700 hover:bg-blue-50/70 hover:text-blue-600 font-medium'
                      }`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {categories.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllCategories((prev) => !prev)}
              className="mt-2.5 w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 cursor-pointer"
            >
              {showAllCategories
                ? 'Thu gọn danh mục'
                : `Xem thêm ${categories.length - 10} danh mục`}
            </button>
          )}
        </div>

        {/* 2. Khoảng giá */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Khoảng giá
            </h3>
            {(minPrice !== undefined || maxPrice !== undefined) && (
              <button
                type="button"
                onClick={() => updateParams({ minPrice: null, maxPrice: null })}
                className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Đặt lại
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {PRICE_RANGES.map((range) => {
              const isActive = minPrice === range.min && maxPrice === range.max;
              return (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => handleSelectPricePreset(range.min, range.max)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all text-center cursor-pointer ${isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleApplyCustomPrice} className="space-y-2 pt-2 border-t border-gray-100">
            <div className="text-[11px] text-gray-500 font-medium">Hoặc nhập khoảng giá (VNĐ)</div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={500000}
                value={customMinInput}
                onChange={(e) => setCustomMinInput(e.target.value)}
                placeholder="Từ"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="number"
                min={0}
                step={500000}
                value={customMaxInput}
                onChange={(e) => setCustomMaxInput(e.target.value)}
                placeholder="Đến"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Áp dụng khoảng giá
            </button>
          </form>
        </div>

        {/* 3. Thương hiệu */}
        {brands.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Thương hiệu
              </h3>
              {selectedBrandIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateParams({ brandId: null })}
                  className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  Bỏ chọn ({selectedBrandIds.length})
                </button>
              )}
            </div>

            {brands.length > 6 && (
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Tìm thương hiệu..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            )}

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {visibleBrands.map((brand) => {
                const checked = selectedBrandIds.includes(brand.id);
                const count = brandCounts.get(brand.id) || 0;
                return (
                  <label
                    key={brand.id}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${checked ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 bg-white'
                          }`}
                      >
                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleBrand(brand.id)}
                        className="sr-only"
                      />
                      <span className="truncate">{brand.name}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0 ml-2">({count})</span>
                  </label>
                );
              })}

              {filteredBrandList.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Không tìm thấy thương hiệu
                </p>
              )}
            </div>

            {filteredBrandList.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllBrands((prev) => !prev)}
                className="mt-2 w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 cursor-pointer"
              >
                {showAllBrands
                  ? 'Thu gọn'
                  : `Xem thêm ${filteredBrandList.length - 8} thương hiệu`}
              </button>
            )}
          </div>
        )}

        {/* 4. Loại sản phẩm */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
          <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
            Loại sản phẩm
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_TYPE_OPTIONS.map((opt) => {
              const active = selectedProductType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateParams({ type: opt.value === 'ALL' ? null : opt.value })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Tình trạng kho */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-xs font-bold text-gray-800">Chỉ hiện sản phẩm còn hàng</span>
            <button
              type="button"
              role="switch"
              aria-checked={onlyInStock}
              onClick={() => updateParams({ inStock: onlyInStock ? null : 'true' })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${onlyInStock ? 'bg-blue-600' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${onlyInStock ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
              />
            </button>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1250px] mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
        <Link to="/" className="hover:text-blue-600 font-medium transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link
          to="/products"
          className={`transition-colors ${!activeDbCategory && !isUnknownCategorySlug && !searchQuery
            ? 'text-gray-900 font-semibold'
            : 'hover:text-blue-600 font-medium'
            }`}
        >
          Sản phẩm
        </Link>
        {activeDbCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-900 font-semibold">{activeDbCategory.category.name}</span>
          </>
        )}
        {isUnknownCategorySlug && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-red-600 font-semibold">Danh mục không tồn tại</span>
          </>
        )}
        {searchQuery && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-blue-600 font-semibold">Tìm kiếm: "{searchQuery}"</span>
          </>
        )}
      </nav>

      {/* Page Header Banner + Inline Search */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight uppercase">
                {activeDbCategory
                  ? activeDbCategory.category.name
                  : isUnknownCategorySlug
                    ? 'Danh mục không tồn tại'
                    : searchQuery
                      ? `Kết quả tìm kiếm cho "${searchQuery}"`
                      : 'Tất Cả Sản Phẩm'}
              </h1>
              {!loading && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                  {totalResults} sản phẩm
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              {activeDbCategory?.category.description ||
                (isUnknownCategorySlug
                  ? `Không tìm thấy danh mục "${activeCategorySlugOrId}" trong hệ thống.`
                  : searchQuery
                    ? `Hiển thị các sản phẩm phù hợp nhất với từ khóa "${searchQuery}".`
                    : '')}
            </p>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-500 mr-1">Đang lọc:</span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                Từ khóa: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => updateParams({ search: null })}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {activeDbCategory && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                Danh mục: {activeDbCategory.category.name}
                <button
                  type="button"
                  onClick={() => handleSelectCategory(undefined)}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {selectedBrandIds.map((bId) => (
              <span
                key={bId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold"
              >
                Hãng: {brandMap.get(bId) || `#${bId}`}
                <button
                  type="button"
                  onClick={() => handleToggleBrand(bId)}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {selectedProductType !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold">
                Loại:{' '}
                {PRODUCT_TYPE_OPTIONS.find((o) => o.value === selectedProductType)?.label ||
                  selectedProductType}
                <button
                  type="button"
                  onClick={() => updateParams({ type: null })}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {(minPrice !== undefined || maxPrice !== undefined) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                Giá:{' '}
                {minPrice !== undefined && maxPrice !== undefined
                  ? `${formatPriceShort(minPrice)} - ${formatPriceShort(maxPrice)}`
                  : minPrice !== undefined
                    ? `Từ ${formatPriceShort(minPrice)}`
                    : `Dưới ${formatPriceShort(maxPrice)}`}
                <button
                  type="button"
                  onClick={() => updateParams({ minPrice: null, maxPrice: null })}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {onlyInStock && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                Còn hàng
                <button
                  type="button"
                  onClick={() => updateParams({ inStock: null })}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Xóa tất cả
            </button>
          </div>
        )}
      </section>

      {/* Main Content: Filter Sidebar + Product Listing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20">
          {renderFilterSidebarContent()}
        </aside>

        {/* Product List Column */}
        <div className="lg:col-span-9 space-y-4">
          {/* Toolbar: Mobile Filter Button, Sort, View Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              {/* Mobile Filter Trigger */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="text-xs text-gray-600 hidden sm:inline">
                {loading
                  ? 'Đang tải...'
                  : totalResults > 0
                    ? `Hiển thị ${(safePage - 1) * PAGE_SIZE + 1} - ${Math.min(
                      safePage * PAGE_SIZE,
                      totalResults
                    )} trong ${totalResults} sản phẩm`
                    : '0 sản phẩm'}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Desktop Sort Pills */}
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mr-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sắp xếp:
                </span>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updateParams({ sort: opt.value === 'newest' ? null : opt.value })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${sortBy === opt.value
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Mobile Sort Dropdown */}
              <div className="md:hidden">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    updateParams({
                      sort: e.target.value === 'newest' ? null : e.target.value,
                    })
                  }
                  aria-label="Sắp xếp sản phẩm"
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Switch */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => updateParams({ view: null }, false)}
                  title="Xem dạng lưới"
                  aria-label="Xem dạng lưới"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ view: 'list' }, false)}
                  title="Xem dạng danh sách"
                  aria-label="Xem dạng danh sách"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Listing States */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 p-3 space-y-3 animate-pulse"
                >
                  <div className="w-full pt-[85%] bg-gray-100 rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-full" />
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-5 bg-gray-200 rounded w-1/2 mt-2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-red-50/50 rounded-2xl border border-red-200 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Không thể tải danh sách sản phẩm</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleRetryFetch}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-14 px-6 text-center space-y-5 shadow-2xs">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600">
                <PackageSearch className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-gray-900">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="text-sm text-gray-500">
                  Rất tiếc, không có sản phẩm nào khớp với tiêu chí lọc hiện tại của bạn. Hãy thử
                  thay đổi từ khóa hoặc bỏ bớt bộ lọc.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Xem tất cả sản phẩm
                  </button>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 text-sm font-semibold transition-colors"
                >
                  Quay lại trang chủ
                </Link>
              </div>

              {/* Suggested keywords */}
              <div className="pt-4 border-t border-gray-100 max-w-lg mx-auto">
                <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Gợi ý tìm kiếm nhanh:
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_SUGGESTIONS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        addRecentSearch(term);
                        navigate(`/products?search=${encodeURIComponent(term)}`);
                      }}
                      className="px-3 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} {...formatProductToCardProps(product)} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedProducts.map((product) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  categoryName={
                    product.primaryCategoryId
                      ? categoryMap.get(product.primaryCategoryId)?.name
                      : undefined
                  }
                  brandName={product.brandId ? brandMap.get(product.brandId) : undefined}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="pt-3 flex items-center justify-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {pageNumbers.map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-2 text-gray-400 text-xs select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[36px] h-9 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${item === safePage
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600'
                      }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Slide-Over Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative z-10 w-[86%] max-w-sm bg-gray-50 h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-gray-900">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Bộ lọc sản phẩm</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Đóng bộ lọc"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1">{renderFilterSidebarContent()}</div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700"
                >
                  Đặt lại
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Xem {totalResults} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreProductList;
