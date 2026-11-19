import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Search,
    MapPin,
    Cpu,
    PhoneCall,
    Newspaper,
    ShoppingCart,
    User,
    Menu,
    ChevronDown,
    X,
    HardDrive,
    Flame,
    Sparkles,
    ChevronRight,
    ShieldCheck,
    Phone,
    PcCase,
    Truck,
    Heart,
    Clock,
    Loader2,
    Trash2,
    Layers
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import defaultPcImg from '../../../assets/images/products/pc.jpg';
import { getProducts, getDefaultImageForProduct } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { brandService } from '../../../services/brandService';
import type { ProductResponse } from '../../../types/adminProduct';
import type { CategoryTreeResponse } from '../../../types/adminCategory';
import type { BrandResponse } from '../../../types/adminBrand';
import {
    PRICE_RANGES,
    type PriceRangeOption,
    getRecentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    normalizeText,
    collectDescendantCategoryIds,
    productMatchesDbCategory,
} from '../../../utils/productFilterHelper';

const POPULAR_SEARCHES = [
    'RTX 4070 Super',
    'PC Gaming 15 triệu',
    'Core i5 14600K',
    'Màn hình 27 inch 180Hz',
    'Bàn phím cơ không dây',
    'SSD 1TB NVMe',
];

const SHOWROOMS = [
    { city: 'Hà Nội', address: '17 Hà Kế Tấn, Phường Phương Liệt, Q. Thanh Xuân', phone: '098.741.4899' },
    { city: 'Hà Nội', address: '83b Nguyễn Văn Cừ, Q. Long Biên', phone: '098.122.6969' },
    { city: 'TP. Hồ Chí Minh', address: '249 Lý Thường Kiệt, Phường 15, Quận 11', phone: '0707.08.6666' },
];

const isCategoryActive = (status: CategoryTreeResponse['status']): boolean =>
    status !== 0 && String(status).toUpperCase() !== 'INACTIVE';

const filterActiveCategoryTree = (nodes: CategoryTreeResponse[]): CategoryTreeResponse[] =>
    nodes
        .filter((node) => isCategoryActive(node.status))
        .map((node) => ({
            ...node,
            children: node.children ? filterActiveCategoryTree(node.children) : [],
        }));

const getCategoryLink = (cat: Pick<CategoryTreeResponse, 'id' | 'slug'>): string =>
    cat.slug ? `/category/${cat.slug}` : `/products?categoryId=${cat.id}`;

const getCategoryPriceLink = (
    cat: Pick<CategoryTreeResponse, 'id' | 'slug'>,
    range: PriceRangeOption
): string => {
    const params = new URLSearchParams();
    if (!cat.slug) params.set('categoryId', String(cat.id));
    if (range.min !== undefined) params.set('minPrice', String(range.min));
    if (range.max !== undefined) params.set('maxPrice', String(range.max));
    const basePath = cat.slug ? `/category/${cat.slug}` : '/products';
    return `${basePath}?${params.toString()}`;
};

const getCategoryBrandLink = (
    cat: Pick<CategoryTreeResponse, 'id' | 'slug'>,
    brandId: number
): string => {
    const params = new URLSearchParams();
    if (!cat.slug) params.set('categoryId', String(cat.id));
    params.set('brandId', String(brandId));
    const basePath = cat.slug ? `/category/${cat.slug}` : '/products';
    return `${basePath}?${params.toString()}`;
};

const getCategoryIcon = (cat: Pick<CategoryTreeResponse, 'name' | 'slug'>, variant: 'menu' | 'bar') => {
    const text = normalizeText(`${cat.name} ${cat.slug}`);
    const cls =
        variant === 'bar'
            ? 'w-4 h-4 text-blue-200 group-hover:text-white transition-colors'
            : 'w-4 h-4 text-blue-500';

    if (text.includes('ai')) {
        return (
            <Sparkles
                className={
                    variant === 'bar'
                        ? 'w-4 h-4 text-amber-300 group-hover:text-amber-200 transition-colors'
                        : 'w-4 h-4 text-amber-500'
                }
            />
        );
    }
    if (text.includes('ssd') || text.includes('hdd') || text.includes('o cung') || text.includes('luu tru') || text.includes('mini')) {
        return <HardDrive className={cls} />;
    }
    if (text.includes('cpu') || text.includes('linh kien') || text.includes('vga') || text.includes('ram') || text.includes('main')) {
        return <Cpu className={cls} />;
    }
    if (text.includes('pc') || text.includes('may tinh')) {
        return <PcCase className={cls} />;
    }
    return <Layers className={cls} />;
};

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems, items, totalPrice } = useCart();
    const { totalFavorites } = useWishlist();
    const { user } = useAuth();
    const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [dbCategories, setDbCategories] = useState<CategoryTreeResponse[]>([]);
    const [dbBrands, setDbBrands] = useState<BrandResponse[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<ProductResponse[]>([]);
    const [activeCategory, setActiveCategory] = useState<CategoryTreeResponse | null>(null);
    const [activeHorizontalCategory, setActiveHorizontalCategory] = useState<CategoryTreeResponse | null>(null);
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchResults, setSearchResults] = useState<ProductResponse[]>([]);
    const [searchTotal, setSearchTotal] = useState(0);
    const [loadedQuery, setLoadedQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

    // Tải cây danh mục, thương hiệu và sản phẩm từ DB để tính Top 10 hãng theo từng danh mục
    useEffect(() => {
        let cancelled = false;

        const loadHeaderCatalog = async () => {
            const [treeRes, brandsRes, firstProductsRes] = await Promise.allSettled([
                categoryService.getCategoryTree(),
                brandService.getBrands(),
                getProducts({ page: 0, size: 100, sort: ['id,desc'] }),
            ]);

            if (cancelled) return;

            // 1. Categories
            let resolvedTree: CategoryTreeResponse[] = [];
            if (treeRes.status === 'fulfilled' && Array.isArray(treeRes.value) && treeRes.value.length > 0) {
                resolvedTree = filterActiveCategoryTree(treeRes.value);
            } else {
                try {
                    const flatRes = await categoryService.getCategories();
                    if (!cancelled && flatRes?.content) {
                        const active = flatRes.content.filter((c) => isCategoryActive(c.status));
                        const nodeMap = new Map<number, CategoryTreeResponse>();
                        active.forEach((c) => {
                            nodeMap.set(c.id, {
                                id: c.id,
                                name: c.name,
                                slug: c.slug,
                                description: c.description,
                                status: c.status,
                                parentId: c.parentId,
                                children: [],
                            });
                        });
                        const roots: CategoryTreeResponse[] = [];
                        nodeMap.forEach((node) => {
                            if (node.parentId != null && nodeMap.has(node.parentId)) {
                                nodeMap.get(node.parentId)!.children!.push(node);
                            } else {
                                roots.push(node);
                            }
                        });
                        resolvedTree = roots;
                    }
                } catch (err) {
                    console.error('Lỗi tải danh mục cho Header:', err);
                }
            }
            if (!cancelled) {
                setDbCategories(resolvedTree);
            }

            // 2. Brands
            if (brandsRes.status === 'fulfilled' && brandsRes.value?.content) {
                const activeBrands = brandsRes.value.content.filter((b) => b.status !== 0 && !b.isDeleted);
                if (!cancelled) setDbBrands(activeBrands);
            }

            // 3. Products (for top-10 brand counts per category)
            if (firstProductsRes.status === 'fulfilled' && firstProductsRes.value?.content) {
                let allProds = firstProductsRes.value.content;
                const totalPages = Math.min(firstProductsRes.value.totalPages || 1, 5);
                if (totalPages > 1) {
                    const extraPromises = [];
                    for (let p = 1; p < totalPages; p++) {
                        extraPromises.push(getProducts({ page: p, size: 100, sort: ['id,desc'] }));
                    }
                    const extraResults = await Promise.allSettled(extraPromises);
                    extraResults.forEach((r) => {
                        if (r.status === 'fulfilled' && r.value?.content) {
                            allProds = [...allProds, ...r.value.content];
                        }
                    });
                }
                const visibleProds = allProds.filter((p) => String(p.status).toUpperCase() !== 'INACTIVE');
                if (!cancelled) setCatalogProducts(visibleProds);
            }
        };

        loadHeaderCatalog();
        return () => {
            cancelled = true;
        };
    }, []);

    // Lấy tối đa 10 hãng có nhiều sản phẩm nhất trong 1 danh mục (bao gồm danh mục con)
    const getTopBrandsForCategory = useCallback(
        (cat: CategoryTreeResponse, limit = 10): { brand: BrandResponse; count: number }[] => {
            if (dbBrands.length === 0 || catalogProducts.length === 0) return [];
            const catIds = collectDescendantCategoryIds(cat.id, dbCategories, []);
            const counts = new Map<number, number>();

            for (const prod of catalogProducts) {
                if (prod.brandId && productMatchesDbCategory(prod, catIds)) {
                    counts.set(prod.brandId, (counts.get(prod.brandId) || 0) + 1);
                }
            }

            return dbBrands
                .map((brand) => ({ brand, count: counts.get(brand.id) || 0 }))
                .filter((entry) => entry.count > 0)
                .sort((a, b) => b.count - a.count || a.brand.name.localeCompare(b.brand.name, 'vi'))
                .slice(0, limit);
        },
        [dbBrands, catalogProducts, dbCategories]
    );

    const isListingRoute =
        location.pathname.startsWith('/products') ||
        location.pathname.startsWith('/category') ||
        location.pathname.startsWith('/search');
    const routeSearchKey = isListingRoute ? `${location.pathname}${location.search}` : '';
    const [prevRouteSearchKey, setPrevRouteSearchKey] = useState(routeSearchKey);

    // Đồng bộ ô tìm kiếm với URL khi người dùng điều hướng sang trang danh sách / tìm kiếm
    if (routeSearchKey !== prevRouteSearchKey) {
        setPrevRouteSearchKey(routeSearchKey);
        if (isListingRoute) {
            const params = new URLSearchParams(location.search);
            const urlSearch = params.get('search') || params.get('keyword') || params.get('q') || '';
            setSearchQuery(urlSearch);
        }
    }

    const searchRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);

    const trimmedSearchQuery = searchQuery.trim();
    const isSearchLoading = Boolean(trimmedSearchQuery && loadedQuery !== trimmedSearchQuery);
    const visibleSearchResults = trimmedSearchQuery && loadedQuery === trimmedSearchQuery ? searchResults : [];
    const visibleSearchTotal = trimmedSearchQuery && loadedQuery === trimmedSearchQuery ? searchTotal : 0;

    // Live Search gợi ý sản phẩm theo từ khóa (debounce 300ms)
    useEffect(() => {
        if (!trimmedSearchQuery) {
            return;
        }

        let cancelled = false;

        const timer = setTimeout(() => {
            getProducts({ keyword: trimmedSearchQuery, page: 0, size: 6, sort: ['id,desc'] })
                .then((res) => {
                    if (cancelled) return;
                    const visible = (res.content || []).filter(
                        (p) => String(p.status).toUpperCase() !== 'INACTIVE'
                    );
                    setSearchResults(visible);
                    setSearchTotal(res.totalElements ?? visible.length);
                    setLoadedQuery(trimmedSearchQuery);
                })
                .catch((err) => {
                    if (cancelled) return;
                    console.error('Live search error:', err);
                    setSearchResults([]);
                    setSearchTotal(0);
                    setLoadedQuery(trimmedSearchQuery);
                });
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [trimmedSearchQuery]);

    const handleExecuteSearch = (term: string) => {
        const cleaned = term.trim();
        setIsSearchOpen(false);
        if (cleaned) {
            setRecentSearches(addRecentSearch(cleaned));
            navigate(`/products?search=${encodeURIComponent(cleaned)}`);
        } else {
            navigate('/products');
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
                setIsMegaMenuOpen(false);
                setActiveCategory(null);
            }
            // if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
            //     setIsUserDropdownOpen(false);
            // }
        };

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setIsScrolled((prev) => {
                let nextScrolled = prev;
                // Use Hysteresis to prevent continuous toggling jitter at scroll boundaries
                if (currentScrollY > 450) {
                    nextScrolled = true;
                } else if (currentScrollY < 300) {
                    nextScrolled = false;
                }

                if (prev !== nextScrolled) {
                    setIsMegaMenuOpen(false);
                    setActiveHorizontalCategory(null);
                    setIsLocationOpen(false);
                    setIsSearchOpen(false);
                }
                return nextScrolled;
            });
        };

        handleScroll();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Reusable columns renderer for both Mega Menu and Horizontal Category Dropdown
    const renderCategoryDropdownColumns = (
        category: CategoryTreeResponse,
        onClose: () => void
    ) => {
        const hasChildren = Boolean(category.children && category.children.length > 0);
        const categoryTopBrands = !hasChildren ? getTopBrandsForCategory(category, 10) : [];

        return (
            <div className="grid grid-cols-4 gap-6">
                {hasChildren ? (
                    category.children!.map((sub) => {
                        const subTopBrands = getTopBrandsForCategory(sub, 10);
                        return (
                            <div key={sub.id} className="space-y-2">
                                <Link
                                    to={getCategoryLink(sub)}
                                    onClick={onClose}
                                    className="font-bold text-xs text-gray-900 uppercase tracking-wide border-l-2 border-blue-600 pl-2 block hover:text-blue-600 transition-colors"
                                >
                                    {sub.name}
                                </Link>
                                {subTopBrands.length > 0 && (
                                    <ul className="space-y-1.5 text-xs text-gray-600 pl-2">
                                        {subTopBrands.map(({ brand, count }) => (
                                            <li key={brand.id}>
                                                <Link
                                                    to={getCategoryBrandLink(sub, brand.id)}
                                                    onClick={onClose}
                                                    className="hover:text-blue-600 hover:underline transition-colors flex items-center justify-between gap-2 py-0.5"
                                                >
                                                    <span className="truncate">{brand.name}</span>
                                                    <span className="text-[10px] text-gray-400 shrink-0">({count})</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })
                ) : categoryTopBrands.length > 0 ? (
                    <div className="space-y-2">
                        <div className="font-bold text-xs text-gray-900 uppercase tracking-wide border-l-2 border-blue-600 pl-2">
                            Chọn theo Hãng
                        </div>
                        <ul className="space-y-1.5 text-xs text-gray-600 pl-2">
                            {categoryTopBrands.map(({ brand, count }) => (
                                <li key={brand.id}>
                                    <Link
                                        to={getCategoryBrandLink(category, brand.id)}
                                        onClick={onClose}
                                        className="hover:text-blue-600 hover:underline transition-colors flex items-center justify-between gap-2 py-0.5"
                                    >
                                        <span className="truncate">{brand.name}</span>
                                        <span className="text-[10px] text-gray-400 shrink-0">({count})</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {/* Chọn theo khoảng giá */}
                <div className="space-y-2">
                    <div className="font-bold text-xs text-gray-900 uppercase tracking-wide border-l-2 border-amber-500 pl-2">
                        Chọn theo khoảng giá
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-600 pl-2">
                        {PRICE_RANGES.map((range) => (
                            <li key={range.id}>
                                <Link
                                    to={getCategoryPriceLink(category, range)}
                                    onClick={onClose}
                                    className="hover:text-blue-600 hover:underline transition-colors block py-0.5"
                                >
                                    {range.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    // Reusable Mega Menu Panel Renderer (strictly using DB categories & DB slugs)
    const renderMegaMenuDropdown = () => (
        <div
            onMouseLeave={() => {
                setIsMegaMenuOpen(false);
                setActiveCategory(null);
            }}
            className="absolute left-0 top-full mt-1.5 w-[1100px] xl:w-[1250px] bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 flex z-50 overflow-hidden animate-in fade-in duration-150"
        >
            {/* Left side: Category List */}
            <div className="w-1/5 bg-gray-50 border-r border-gray-200 py-2 shrink-0 max-h-[420px] overflow-y-auto">
                {dbCategories.length === 0 ? (
                    <div className="px-4 py-6 text-xs text-gray-400 text-center">
                        Chưa có danh mục
                    </div>
                ) : (
                    dbCategories.map((cat) => (
                        <Link
                            key={cat.id}
                            to={getCategoryLink(cat)}
                            onClick={() => {
                                setIsMegaMenuOpen(false);
                                setActiveCategory(null);
                            }}
                            onMouseEnter={() => setActiveCategory(cat)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors text-left ${activeCategory?.id === cat.id
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                        >
                            <div className="flex items-center space-x-2.5 min-w-0">
                                <span className={activeCategory?.id === cat.id ? '[&_svg]:text-white shrink-0' : 'shrink-0'}>
                                    {getCategoryIcon(cat, 'menu')}
                                </span>
                                <span className="truncate">{cat.name}</span>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${activeCategory?.id === cat.id ? 'text-white' : 'text-gray-400'}`} />
                        </Link>
                    ))
                )}
            </div>

            {/* Right side: Subcategories Content */}
            <div className="w-4/5 p-5 bg-white overflow-y-auto max-h-[420px]">
                {activeCategory ? (
                    <div>
                        <Link
                            to={getCategoryLink(activeCategory)}
                            onClick={() => {
                                setIsMegaMenuOpen(false);
                                setActiveCategory(null);
                            }}
                            className="flex items-center space-x-2 pb-3 mb-4 border-b border-gray-100 font-bold text-sm text-blue-700 hover:underline"
                        >
                            <span>{getCategoryIcon(activeCategory, 'menu')}</span>
                            <span>{activeCategory.name}</span>
                        </Link>
                        {renderCategoryDropdownColumns(activeCategory, () => {
                            setIsMegaMenuOpen(false);
                            setActiveCategory(null);
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-12">
                        <Menu className="w-8 h-8 stroke-1 text-gray-300" />
                        <span className="text-xs">Rê chuột vào danh mục bên trái để xem chi tiết</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <header
                className={`w-full font-sans select-none sticky top-0 z-50 shadow-md bg-[linear-gradient(180deg,#2E9BFB_0%,#1D52E7_100%)] text-white transition-all duration-300 ${isScrolled ? 'py-0.5 shadow-xl border-b border-blue-400/30' : ''
                    }`}
            >
                <div className={`max-w-[1250px] mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 md:gap-4 relative transition-all duration-300 ${isScrolled ? 'py-1.5' : 'py-2.5'
                    }`}>
                    <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors focus:outline-none"
                            aria-label="Toggle Navigation"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>

                        {/* DESKTOP LEFT AREA: SCROLLED vs NORMAL */}
                        {isScrolled ? (
                            /* SCROLLED STATE: "DANH MỤC SẢN PHẨM" button replaces Logo & Location */
                            <div className="flex items-center space-x-2 hidden lg:flex">
                                <Link
                                    to="/"
                                    className="w-8 h-8 rounded-full border border-white/50 bg-white/15 hover:bg-white/25 flex items-center justify-center font-black text-xs text-white shrink-0 transition-colors"
                                    title="Trang chủ"
                                >
                                    PC
                                </Link>

                                <div ref={categoryRef} className="relative">
                                    <button
                                        onClick={() => {
                                            setIsMegaMenuOpen(!isMegaMenuOpen);
                                            if (!activeCategory && dbCategories.length > 0) setActiveCategory(dbCategories[0]);
                                            setActiveHorizontalCategory(null);
                                        }}
                                        onMouseEnter={() => {
                                            setIsMegaMenuOpen(true);
                                            if (!activeCategory && dbCategories.length > 0) setActiveCategory(dbCategories[0]);
                                            setActiveHorizontalCategory(null);
                                        }}
                                        className="bg-white text-[#1752e5] hover:bg-gray-100 font-bold text-xs px-3.5 py-2 rounded-md shadow flex items-center space-x-2 transition-all cursor-pointer uppercase tracking-wider border border-white/40"
                                    >
                                        <Menu className="w-4 h-4 text-[#1752e5]" />
                                        <span>DANH MỤC SẢN PHẨM</span>
                                    </button>

                                    {isMegaMenuOpen && renderMegaMenuDropdown()}
                                </div>
                            </div>
                        ) : (
                            /* NORMAL STATE: Logo + Location */
                            <>
                                <Link to="/" className="flex items-center space-x-2 group">
                                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white flex items-center justify-center bg-white/10 group-hover:bg-white/20 transition-all duration-300 shadow-inner">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/80 flex items-center justify-center font-extrabold text-xs sm:text-sm tracking-tighter">
                                            PC
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center leading-none">
                                        <span className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white drop-shadow-sm font-sans">
                                            PC<span className="text-amber-300 font-extrabold">STORE</span>
                                        </span>
                                    </div>
                                </Link>
                                <div className="relative hidden md:block">
                                    <button
                                        onClick={() => setIsLocationOpen(!isLocationOpen)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all duration-200"
                                        title="Hệ thống showroom Nguyễn Công PC"
                                    >
                                        <MapPin className="w-4 h-4" />
                                    </button>
                                    {isLocationOpen && (
                                        <div className="absolute left-0 mt-2 w-72 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-100 py-3 px-4 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 font-bold text-gray-900 text-sm">
                                                <div className="flex items-center space-x-1.5 text-blue-600">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>Hệ Thống Showroom</span>
                                                </div>
                                                <button onClick={() => setIsLocationOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                {SHOWROOMS.map((sr, idx) => (
                                                    <div key={idx} className="p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-blue-300 transition-colors">
                                                        <div className="font-bold text-blue-700 text-xs">{sr.city}</div>
                                                        <div className="text-gray-600 mt-0.5 text-[11px] leading-snug">{sr.address}</div>
                                                        <div className="text-blue-600 font-semibold text-[11px] mt-1 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            <a href={`tel:${sr.phone.replace(/\./g, '')}`} className="hover:underline">
                                                                {sr.phone}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Mobile logo on scroll */}
                        {isScrolled && (
                            <Link to="/" className="lg:hidden flex items-center space-x-1 font-black text-sm text-white">
                                <span>PC<span className="text-amber-300">STORE</span></span>
                            </Link>
                        )}
                    </div>
                    <div ref={searchRef} className="relative flex-1 max-w-xl mx-1 sm:mx-2">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleExecuteSearch(searchQuery);
                            }}
                            className="relative flex items-center"
                        >
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!isSearchOpen) setIsSearchOpen(true);
                                }}
                                onFocus={() => {
                                    setRecentSearches(getRecentSearches());
                                    setIsSearchOpen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsSearchOpen(false);
                                    }
                                }}
                                placeholder="Bạn cần tìm gì? (VD: RTX 4070, Core i5, PC Gaming...)"
                                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs sm:text-sm pl-4 pr-16 py-2 sm:py-2 rounded-2xl shadow-inner border border-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Xóa từ khóa"
                                    className="absolute right-9 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : null}
                            <button
                                type="submit"
                                aria-label="Tìm kiếm"
                                className="absolute right-2 text-gray-500 hover:text-blue-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </form>
                        {isSearchOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150 max-h-[500px] overflow-y-auto">
                                {searchQuery.trim() ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                                <Search className="w-3.5 h-3.5 text-blue-600" />
                                                Sản phẩm gợi ý cho "{searchQuery.trim()}"
                                            </span>
                                            {!isSearchLoading && visibleSearchTotal > 0 && (
                                                <span className="text-[11px] text-gray-500 font-medium">
                                                    {visibleSearchTotal} kết quả
                                                </span>
                                            )}
                                        </div>

                                        {isSearchLoading ? (
                                            <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-500">
                                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                                <span>Đang tìm kiếm sản phẩm...</span>
                                            </div>
                                        ) : visibleSearchResults.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                {visibleSearchResults.map((item) => {
                                                    const firstUrl = item.imageUrl?.split(';')[0]?.trim();
                                                    const thumb =
                                                        firstUrl && !firstUrl.includes('example.com')
                                                            ? firstUrl
                                                            : getDefaultImageForProduct(item);
                                                    const priceNum = item.price != null ? Number(item.price) : 0;
                                                    const priceStr =
                                                        priceNum > 0
                                                            ? `${priceNum.toLocaleString('vi-VN')}đ`
                                                            : 'Liên hệ';
                                                    const marketStr =
                                                        priceNum > 0
                                                            ? `${Math.round(priceNum * 1.15).toLocaleString('vi-VN')}đ`
                                                            : undefined;
                                                    const inStock = String(item.status).toUpperCase() !== 'OUT_OF_STOCK';

                                                    return (
                                                        <Link
                                                            key={item.id}
                                                            to={`/product/${item.id}`}
                                                            onClick={() => {
                                                                setRecentSearches(addRecentSearch(searchQuery.trim()));
                                                                setIsSearchOpen(false);
                                                            }}
                                                            className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-blue-50/70 transition-colors group"
                                                        >
                                                            <div className="w-12 h-12 rounded-lg border border-gray-100 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                                                <img
                                                                    src={thumb}
                                                                    alt={item.name}
                                                                    onError={(e) => {
                                                                        e.currentTarget.onerror = null;
                                                                        e.currentTarget.src = defaultPcImg;
                                                                    }}
                                                                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-800 group-hover:text-blue-700 line-clamp-1">
                                                                    {item.name}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                    <span className="font-extrabold text-[#d02c2c] text-xs">
                                                                        {priceStr}
                                                                    </span>
                                                                    {marketStr && (
                                                                        <span className="text-[11px] text-gray-400 line-through">
                                                                            {marketStr}
                                                                        </span>
                                                                    )}
                                                                    <span
                                                                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${inStock
                                                                            ? 'bg-emerald-50 text-emerald-700'
                                                                            : 'bg-gray-100 text-gray-500'
                                                                            }`}
                                                                    >
                                                                        {inStock ? 'Còn hàng' : 'Hết hàng'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 shrink-0" />
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-6 text-center space-y-2 text-gray-500">
                                                <p className="font-medium text-gray-700">
                                                    Không tìm thấy sản phẩm khớp với "{searchQuery.trim()}"
                                                </p>
                                                <p className="text-[11px]">
                                                    Nhấn Enter để tìm kiếm mở rộng hoặc thử từ khóa khác.
                                                </p>
                                            </div>
                                        )}

                                        <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500">Nhấn Enter để lọc chi tiết</span>
                                            <button
                                                type="button"
                                                onClick={() => handleExecuteSearch(searchQuery)}
                                                className="text-blue-600 font-bold hover:underline cursor-pointer"
                                            >
                                                Xem tất cả {visibleSearchTotal > 0 ? `${visibleSearchTotal} ` : ''}kết quả →
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentSearches.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-1.5 font-bold text-gray-900">
                                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                                        <span>Tìm kiếm gần đây</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            clearRecentSearches();
                                                            setRecentSearches([]);
                                                        }}
                                                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Xóa tất cả
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {recentSearches.map((term, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="inline-flex items-center rounded-full bg-blue-50/70 border border-blue-100 text-blue-700 text-xs font-medium overflow-hidden"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchQuery(term);
                                                                    handleExecuteSearch(term);
                                                                }}
                                                                className="pl-2.5 pr-1.5 py-1 hover:bg-blue-100/70 transition-colors cursor-pointer"
                                                            >
                                                                {term}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label={`Xóa ${term}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRecentSearches(removeRecentSearch(term));
                                                                }}
                                                                className="pr-2 pl-0.5 py-1 text-blue-400 hover:text-red-600 transition-colors cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-center space-x-1.5 font-bold text-gray-900 mb-2">
                                                <Flame className="w-4 h-4 text-red-500" />
                                                <span>Tìm kiếm phổ biến</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {POPULAR_SEARCHES.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setSearchQuery(item);
                                                            handleExecuteSearch(item);
                                                        }}
                                                        className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 text-xs font-medium transition-colors border border-gray-200/60 cursor-pointer"
                                                    >
                                                        {item}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-[11px] text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                                    Cam kết chính hãng 100%
                                                </span>
                                                <Link
                                                    to="/products"
                                                    onClick={() => setIsSearchOpen(false)}
                                                    className="text-blue-600 font-semibold cursor-pointer hover:underline"
                                                >
                                                    Xem tất cả sản phẩm →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center space-x-1 xl:space-x-3 text-xs font-medium">
                        {/* 1. XÂY DỰNG CẤU HÌNH */}
                        <Link
                            to="/build-pc"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-white/10 transition-all text-center group"
                        >
                            <PcCase className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                Xây Dựng Cấu Hình
                            </span>
                        </Link>

                        {/* 2. TRA CỨU BẢO HÀNH */}
                        <Link
                            to="/warranty"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-white/10 transition-all text-center group"
                        >
                            <ShieldCheck className="w-6 h-6 mb-0.5 text-white group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                Tra Cứu Bảo Hành
                            </span>
                        </Link>

                        {/* 4. GIỎ HÀNG */}
                        <div
                            className="relative"
                            onMouseEnter={() => setIsMiniCartOpen(true)}
                            onMouseLeave={() => setIsMiniCartOpen(false)}
                        >
                            <Link
                                to="/cart"
                                className="relative flex flex-col items-center justify-center p-2 px-2.5 rounded-lg hover:bg-white/10 transition-all text-center group"
                            >
                                <div className="relative">
                                    <ShoppingCart className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in-50 duration-200">
                                            {totalItems > 99 ? '99+' : totalItems}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white">
                                    Giỏ Hàng
                                </span>
                            </Link>

                            {/* Mini Cart Hover Dropdown */}
                            {isMiniCartOpen && (
                                <div className="absolute right-0 top-full pt-2 w-80 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-3">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                            <span className="font-extrabold text-xs text-gray-900 uppercase">
                                                Giỏ hàng ({totalItems})
                                            </span>
                                            <Link
                                                to="/cart"
                                                onClick={() => setIsMiniCartOpen(false)}
                                                className="text-[11px] font-semibold text-blue-600 hover:underline"
                                            >
                                                Xem chi tiết →
                                            </Link>
                                        </div>

                                        {items.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-gray-500 space-y-2">
                                                <div className="text-2xl">🛒</div>
                                                <p className="font-medium">Chưa có sản phẩm trong giỏ</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                                    {items.slice(0, 3).map((item, idx) => (
                                                        <div
                                                            key={`${item.product.id}_${item.selectedVariant || idx}`}
                                                            className="flex items-center space-x-2.5 text-xs pb-2 border-b border-gray-50 last:border-0"
                                                        >
                                                            <img
                                                                src={item.product.images?.[0] || defaultPcImg}
                                                                alt={item.product.title}
                                                                className="w-10 h-10 object-contain rounded border border-gray-100 bg-gray-50 shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-gray-800 truncate leading-snug">
                                                                    {item.product.title}
                                                                </p>
                                                                <div className="flex items-center justify-between text-[11px] text-gray-500 mt-0.5">
                                                                    <span>SL: {item.quantity}</span>
                                                                    <span className="font-bold text-red-600">
                                                                        {((item.product.numericPrice || 0) * item.quantity).toLocaleString('vi-VN')}đ
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {items.length > 3 && (
                                                        <p className="text-[11px] text-center text-gray-400 italic">
                                                            + và {items.length - 3} sản phẩm khác
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between text-xs">
                                                    <span className="text-gray-600 font-medium">Tổng tiền:</span>
                                                    <span className="font-black text-red-600 text-sm">
                                                        {totalPrice.toLocaleString('vi-VN')}đ
                                                    </span>
                                                </div>

                                                <Link
                                                    to="/cart"
                                                    onClick={() => setIsMiniCartOpen(false)}
                                                    className="block w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 px-3 rounded-xl text-center text-xs uppercase shadow transition-colors"
                                                >
                                                    Vào giỏ hàng & Thanh toán
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. TÀI KHOẢN / USER */}
                        <Link
                            to="/account"
                            className="flex flex-col items-center justify-center p-2 px-2 rounded-lg hover:bg-blue-700/50 transition-all text-center group max-w-[110px]"
                            title={user ? `Xin chào, ${user.fullName || user.username}` : 'Đăng nhập / Đăng ký'}
                        >
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.fullName || user.username}
                                    className="w-6 h-6 rounded-full object-cover mb-0.5 ring-1 ring-white/60"
                                />
                            ) : (
                                <User className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform shrink-0" />
                            )}
                            <span className="text-[11px] leading-tight font-bold text-blue-50 group-hover:text-white truncate w-full text-center">
                                {user ? (user.fullName || user.username) : 'Tài Khoản'}
                            </span>
                        </Link>
                    </div>

                    {/* MOBILE QUICK CARTS & USER */}
                    <div className="flex lg:hidden items-center space-x-2 shrink-0">
                        <Link
                            to="/account?tab=wishlist"
                            className="relative p-2 text-white hover:bg-white/10 rounded-lg"
                            title="Sản phẩm yêu thích"
                        >
                            <Heart className="w-6 h-6" />
                            {totalFavorites > 0 && (
                                <span className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-[16px] px-0.5 rounded-full flex items-center justify-center border-2 border-blue-600 shadow-md">
                                    {totalFavorites > 99 ? '99+' : totalFavorites}
                                </span>
                            )}
                        </Link>
                        <Link to="/cart" className="relative p-2 text-white hover:bg-white/10 rounded-lg">
                            <ShoppingCart className="w-6 h-6" />
                            {totalItems > 0 && (
                                <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black min-w-[16px] h-[16px] px-0.5 rounded-full flex items-center justify-center border-2 border-blue-600 shadow-md">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </Link>
                        <Link
                            to="/account"
                            className="p-1.5 text-white hover:bg-white/10 rounded-lg flex items-center space-x-1"
                            title={user ? (user.fullName || user.username) : 'Tài Khoản'}
                        >
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.fullName || user.username}
                                    className="w-6 h-6 rounded-full object-cover ring-1 ring-white/60"
                                />
                            ) : (
                                <User className="w-6 h-6" />
                            )}
                            {user && (
                                <span className="text-[11px] font-bold text-white max-w-[70px] truncate hidden sm:inline-block">
                                    {user.fullName || user.username}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* MOBILE DRAWER NAVIGATION MENU */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden bg-white text-gray-900 border-t border-gray-200 shadow-xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-top duration-200">
                        {/* Quick Actions in Mobile Drawer */}
                        <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 border-b border-blue-100">
                            <Link
                                to="/build-pc"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <Cpu className="w-4 h-4 text-blue-600" />
                                <span>Xây Dựng Cấu Hình</span>
                            </Link>
                            <Link
                                to="/warranty"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                                <span>Tra Cứu Bảo Hành</span>
                            </Link>
                            <Link
                                to="/contact"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <PhoneCall className="w-4 h-4 text-blue-600" />
                                <span>Khách Hàng Liên Hệ</span>
                            </Link>
                            <Link
                                to="/news"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <Newspaper className="w-4 h-4 text-blue-600" />
                                <span>Tin Tức Công Nghệ</span>
                            </Link>
                            <Link
                                to="/account"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <User className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="truncate">{user ? (user.fullName || user.username) : 'Tài Khoản'}</span>
                            </Link>
                            <Link
                                to="/track-order"
                                className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm text-xs font-semibold text-blue-700"
                            >
                                <Truck className="w-4 h-4 text-blue-600" />
                                <span>Tra Cứu Đơn Hàng</span>
                            </Link>
                        </div>

                        {/* Categories List in Mobile Drawer */}
                        <div className="p-3">
                            <div className="font-extrabold text-xs text-gray-500 uppercase tracking-wider mb-2">
                                Danh Mục Sản Phẩm
                            </div>
                            <div className="space-y-1">
                                {dbCategories.map((cat) => {
                                    const topBrands = getTopBrandsForCategory(cat, 10);
                                    return (
                                        <div key={cat.id} className="border-b border-gray-100 pb-1">
                                            <Link
                                                to={getCategoryLink(cat)}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="flex items-center justify-between p-2 rounded-md font-bold text-xs text-gray-800 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    {getCategoryIcon(cat, 'menu')}
                                                    <span>{cat.name}</span>
                                                </div>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                            </Link>
                                            {topBrands.length > 0 && (
                                                <div className="pl-6 flex flex-wrap gap-1.5 pb-1.5">
                                                    {topBrands.map(({ brand }) => (
                                                        <Link
                                                            key={brand.id}
                                                            to={getCategoryBrandLink(cat, brand.id)}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                        >
                                                            {brand.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* ========================================================================= */}
            {/* BOTTOM NAV BAR: CATEGORY NAVIGATION ROW (Only shown when NOT scrolled) */}
            {/* ========================================================================= */}
            {!isScrolled && (
                <nav
                    className="bg-[#2366EF] text-white hidden lg:block border-t border-blue-400/30 relative z-40 shadow-sm"
                    onMouseLeave={() => setActiveHorizontalCategory(null)}
                >
                    <div className="max-w-[1250px] mx-auto px-4 lg:px-6 flex items-center relative">
                        {/* MEGA MENU CATEGORIES BUTTON */}
                        <div ref={categoryRef} className="relative py-1.5 pr-3">
                            <button
                                onClick={() => {
                                    setIsMegaMenuOpen(!isMegaMenuOpen);
                                    if (!activeCategory && dbCategories.length > 0) setActiveCategory(dbCategories[0]);
                                    setActiveHorizontalCategory(null);
                                }}
                                onMouseEnter={() => {
                                    setIsMegaMenuOpen(true);
                                    if (!activeCategory && dbCategories.length > 0) setActiveCategory(dbCategories[0]);
                                    setActiveHorizontalCategory(null);
                                }}
                                className="bg-white text-[#1752e5] hover:bg-gray-100 font-bold text-xs px-3.5 py-2 rounded-md shadow flex items-center space-x-2 transition-all cursor-pointer uppercase tracking-wider"
                            >
                                <Menu className="w-4 h-4 text-[#1752e5]" />
                                <span>DANH MỤC SẢN PHẨM</span>
                            </button>

                            {/* MEGA MENU DROPDOWN PANEL */}
                            {isMegaMenuOpen && renderMegaMenuDropdown()}
                        </div>

                        {/* HORIZONTAL CATEGORIES LINKS (DB Categories) */}
                        <nav className="flex-1 w-full flex items-center justify-start py-2 text-xs font-semibold ml-4 overflow-x-auto no-scrollbar gap-2">
                            {dbCategories.slice(0, 7).map((cat) => (
                                <div key={cat.id} className="relative">
                                    <Link
                                        to={getCategoryLink(cat)}
                                        onClick={() => setActiveHorizontalCategory(null)}
                                        onMouseEnter={() => {
                                            setIsMegaMenuOpen(false);
                                            setActiveHorizontalCategory(cat);
                                        }}
                                        className={`group flex items-center space-x-2 px-3 py-1.5 rounded-md text-white whitespace-nowrap transition-colors ${activeHorizontalCategory?.id === cat.id ? 'bg-white/20' : 'hover:bg-white/15'
                                            }`}
                                    >
                                        {getCategoryIcon(cat, 'bar')}
                                        <span>{cat.name}</span>
                                        <ChevronDown className={`w-3 h-3 text-blue-200 transition-transform duration-200 ${activeHorizontalCategory?.id === cat.id ? 'rotate-180 text-white' : ''
                                            }`} />
                                    </Link>
                                </div>
                            ))}
                        </nav>

                        {/* SHARED DROPDOWN PANEL FOR HORIZONTAL CATEGORIES */}
                        {activeHorizontalCategory && !isMegaMenuOpen && (
                            <div className="absolute left-0 top-full pt-1.5 w-full z-50 animate-in fade-in duration-150">
                                <div className="bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 p-6">
                                    <Link
                                        to={getCategoryLink(activeHorizontalCategory)}
                                        onClick={() => setActiveHorizontalCategory(null)}
                                        className="flex items-center space-x-2.5 pb-3 mb-4 border-b border-gray-100 font-bold text-sm text-blue-700 hover:underline"
                                    >
                                        <span>{getCategoryIcon(activeHorizontalCategory, 'menu')}</span>
                                        <span className="text-base">{activeHorizontalCategory.name}</span>
                                    </Link>

                                    <div className="max-h-[400px] overflow-y-auto pr-2">
                                        {renderCategoryDropdownColumns(activeHorizontalCategory, () =>
                                            setActiveHorizontalCategory(null)
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            )}
        </>
    );
};

export default Header;