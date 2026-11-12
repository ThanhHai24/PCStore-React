import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle2,
    Download,
    Calendar,
    Check,
    Upload,
    Copy,
    RefreshCw,
    Image as ImageIcon,
    Tag,
    Cpu,
    Loader2,
    Layers,
    AlertCircle,
    PcCase,
    Package,
    DollarSign,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminInput,
    AdminSelect,
    AdminButton,
    AdminLabel,
    AdminTextarea,
    AdminModalFooter,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { adminProductService } from '../../../services/adminProductService';
import { adminCategoryService } from '../../../services/adminCategoryService';
import { adminBrandService } from '../../../services/adminBrandService';
import type { CategoryResponse } from '../../../types/adminCategory';
import type { BrandResponse } from '../../../types/adminBrand';
import type {
    ProductResponse,
    BackendProductStatus,
    ProductType,
    BuildingPcItemRequest,
    BuildingPcItemResponse
} from '../../../types/adminProduct';
import { DynamicSpecForm } from '../../../components/admin/DynamicSpecForm';
import {
    getSpecTemplateForCategory,
    mergeSpecsWithTemplate,
    cleanEmptySpecsForSaving,
} from '../../../config/specTemplates';
import { uploadImage, validateImageFile } from '../../../services/imgbbService';

export interface ProductImageItem {
    id: string;
    url: string;
    file?: File;
}

export interface AdminProductItem {
    id: string;
    numericId: number;
    name: string;
    sku: string;
    slug: string;
    brandId: number | null;
    brand: string;
    categoryIds: number[];
    primaryCategoryId: number | null;
    category: string;
    productType: ProductType;
    price: number;
    image: string;
    gallery: string[];
    status: BackendProductStatus;
    specification: string;
    description: string;
    createdAt?: string;
    lastModifiedAt?: string;
    items?: BuildingPcItemResponse[];
}

const DEFAULT_PRODUCT_IMAGE =
    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=600';

const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(price);
};

const generateSlug = (name: string) => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

/**
 * Kiểm tra xem danh mục có thuộc nhóm máy tính / PC hay không
 */
export const isPCCategory = (catName?: string) => {
    if (!catName) return false;
    const lower = catName.toLowerCase().trim();
    return (
        lower.includes('máy tính để bàn') ||
        lower.includes('máy bộ') ||
        lower.includes('nguyên bộ') ||
        lower.includes('desktop') ||
        lower.includes('pc đồng bộ') ||
        lower.includes('pc gaming') ||
        lower.includes('pc đồ họa') ||
        lower.includes('pc văn phòng') ||
        lower.includes('bộ nâng cấp pc') ||
        lower.includes('nâng cấp pc') ||
        lower.includes('bộ máy tính') ||
        lower.startsWith('pc ') ||
        lower.endsWith(' pc') ||
        lower.includes(' pc ') ||
        lower === 'pc'
    );
};

/**
 * Trích xuất danh sách ảnh từ chuỗi JSON specification và đối chiếu catalog linh kiện
 */
export const getComponentImagesWithCatalog = (
    specJson: string,
    catalog: any[] = []
): Array<{ key: string; name: string; image: string }> => {
    try {
        if (!specJson || !specJson.trim()) return [];
        const parsed = JSON.parse(specJson);
        if (!Array.isArray(parsed)) return [];
        const list: Array<{ key: string; name: string; image: string }> = [];
        const seenImages = new Set<string>();

        for (const item of parsed) {
            let img = item.productImage || item.imageUrl || item.image;
            if (!img && item.productId && catalog && catalog.length > 0) {
                const found = catalog.find((c: any) => String(c.id ?? c.numericId) === String(item.productId));
                if (found) {
                    img = found.image || found.imageUrl;
                }
            }
            if (img && typeof img === 'string') {
                const clean = img.split(';')[0].trim();
                if (clean && !seenImages.has(clean) && !clean.startsWith('blob:')) {
                    seenImages.add(clean);
                    list.push({
                        key: item.key || 'Linh kiện',
                        name: item.name || '',
                        image: clean,
                    });
                }
            }
        }
        return list;
    } catch {
        return [];
    }
};

// ============================================================================
// IMAGE GALLERY COMPONENT
// ============================================================================
interface GalleryManagerProps {
    avatarUrl: string;
    gallery: ProductImageItem[];
    selectedAvatarFile: File | null;
    isUploading: boolean;
    onSelectAvatarFile: (file: File) => void;
    onSetAvatarUrl: (url: string) => void;
    onClearAvatar: () => void;
    onAddGalleryFiles: (files: FileList | File[]) => void;
    onAddGalleryUrl: (url: string) => void;
    onRemoveGalleryItem: (id: string) => void;
    componentImages?: Array<{ key: string; name: string; image: string }>;
}

const GalleryManager: React.FC<GalleryManagerProps> = ({
    avatarUrl,
    gallery,
    selectedAvatarFile,
    isUploading,
    onSelectAvatarFile,
    onSetAvatarUrl,
    onClearAvatar,
    onAddGalleryFiles,
    onAddGalleryUrl,
    onRemoveGalleryItem,
    componentImages = [],
}) => {
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [customAvatarUrl, setCustomAvatarUrl] = useState('');
    const [customGalleryUrl, setCustomGalleryUrl] = useState('');

    const handleAvatarFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSelectAvatarFile(file);
        }
        if (e.target) e.target.value = '';
    };

    const handleGalleryFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAddGalleryFiles(e.target.files);
        }
        if (e.target) e.target.value = '';
    };

    const handleCustomAvatarUrlSubmit = () => {
        if (customAvatarUrl.trim()) {
            onSetAvatarUrl(customAvatarUrl.trim());
            setCustomAvatarUrl('');
        }
    };

    const handleCustomGalleryUrlSubmit = () => {
        if (customGalleryUrl.trim()) {
            onAddGalleryUrl(customGalleryUrl.trim());
            setCustomGalleryUrl('');
        }
    };

    const isGalleryFull = gallery.length >= 10;

    return (
        <div className="space-y-6">
            {/* AVATAR SECTION */}
            <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            Ảnh đại diện cấu hình PC
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                1 Ảnh chính
                            </span>
                        </h4>
                    </div>
                    {isUploading && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải ảnh...
                        </span>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div className="relative group w-36 h-36 rounded-2xl bg-white border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs p-2">
                        <img
                            src={avatarUrl || DEFAULT_PRODUCT_IMAGE}
                            alt="Avatar Preview"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                        />
                        {selectedAvatarFile && (
                            <span className="absolute bottom-1.5 right-1.5 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                                Tệp mới
                            </span>
                        )}
                    </div>

                    <div className="flex-1 w-full space-y-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarFileInput}
                            />
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                Tải tệp từ máy
                            </button>
                            {avatarUrl && avatarUrl !== DEFAULT_PRODUCT_IMAGE && (
                                <button
                                    type="button"
                                    onClick={onClearAvatar}
                                    className="px-3 py-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 font-medium text-xs transition-colors cursor-pointer"
                                >
                                    Khôi phục mặc định
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* GALLERY SECTION */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-600" />
                            Thư viện ảnh cấu hình
                            <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${isGalleryFull
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                            >
                                {gallery.length} / 10 ảnh
                            </span>
                        </h4>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleGalleryFileInput}
                        />
                        {!isGalleryFull && (
                            <button
                                type="button"
                                onClick={() => galleryInputRef.current?.click()}
                                className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-3xs cursor-pointer active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Tải ảnh từ máy
                            </button>
                        )}
                    </div>
                </div>

                {!isGalleryFull ? (
                    <div className="flex items-center gap-2">
                    </div>
                ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Đã đạt tối đa 10 ảnh trong thư viện. Vui lòng xóa bớt ảnh nếu muốn thêm ảnh mới.</span>
                    </div>
                )}


                {gallery.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/40">
                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-600 font-medium">Chưa có ảnh phụ nào trong thư viện</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                            Nhấn "Tải ảnh từ máy"
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {gallery.map((item, index) => (
                            <div
                                key={item.id}
                                className="group relative aspect-square rounded-xl bg-white border border-gray-200 p-1.5 shadow-2xs hover:shadow-md transition-all overflow-hidden flex items-center justify-center"
                            >
                                <span className="absolute top-1.5 left-1.5 z-10 bg-gray-900/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                    #{index + 1}
                                </span>
                                <img
                                    src={item.url}
                                    alt={`Gallery ${index + 1}`}
                                    className="w-full h-full object-contain p-0.5"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                    }}
                                />
                                {item.file && (
                                    <span className="absolute top-1.5 right-1.5 z-10 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                        Mới
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                                    <button
                                        type="button"
                                        onClick={() => onRemoveGalleryItem(item.id)}
                                        className="p-1.5 rounded-lg bg-white/90 hover:bg-rose-600 text-gray-700 hover:text-white transition-colors shadow-sm cursor-pointer"
                                        title="Xóa ảnh này"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// MAIN PC CONFIG LIST COMPONENT
// ============================================================================
export default function PCConfigList() {
    const { showToast } = useToast();

    // Data States
    const [products, setProducts] = useState<AdminProductItem[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [brands, setBrands] = useState<BrandResponse[]>([]);
    const [availableComponentProducts, setAvailableComponentProducts] = useState<any[]>([]);

    // Loading & Refreshing States
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({
        brandId: '',
        categoryId: '',
        status: '',
    });

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal Visibility & Tab States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<AdminProductItem | null>(null);

    const [activeAddTab, setActiveAddTab] = useState('basic');
    const [activeEditTab, setActiveEditTab] = useState('basic');
    const [activeDetailTab, setActiveDetailTab] = useState('overview');

    // Danh sách danh mục chỉ thuộc nhóm PC
    const pcCategories = useMemo(() => {
        const filtered = categories.filter((c) => isPCCategory(c.name));
        return filtered.length > 0 ? filtered : categories;
    }, [categories]);

    // Add Form State (Luôn cố định productType = 'PC')
    const [addForm, setAddForm] = useState({
        name: '',
        sku: '',
        slug: '',
        brandId: '' as string | number,
        primaryCategoryId: '' as string | number,
        productType: 'PC' as ProductType,
        price: 15000000,
        status: 'ACTIVE' as BackendProductStatus,
        specification: getSpecTemplateForCategory('PC').defaultSpecsJson,
        description: '',
        image: DEFAULT_PRODUCT_IMAGE,
    });

    // Edit Form State
    const [editForm, setEditForm] = useState<AdminProductItem | null>(null);

    // Image Input references & upload states
    const [addGallery, setAddGallery] = useState<ProductImageItem[]>([]);
    const [editGallery, setEditGallery] = useState<ProductImageItem[]>([]);
    const [addSelectedFile, setAddSelectedFile] = useState<File | null>(null);
    const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);

    // Trích xuất danh sách ảnh từ các linh kiện đã chọn trong specification
    const addComponentImages = useMemo(
        () => getComponentImagesWithCatalog(addForm.specification, availableComponentProducts),
        [addForm.specification, availableComponentProducts]
    );

    const editComponentImages = useMemo(
        () => getComponentImagesWithCatalog(editForm?.specification || '', availableComponentProducts),
        [editForm?.specification, availableComponentProducts]
    );

    // Helper: Trích xuất danh sách linh kiện BuildingPcItemRequest từ chuỗi JSON specification
    const extractPcItemsFromSpecs = (specJson: string): BuildingPcItemRequest[] => {
        try {
            if (!specJson || !specJson.trim()) return [];
            const parsed = JSON.parse(specJson);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((item: any) => item.productId && Number(item.productId) > 0)
                .map((item: any) => ({
                    productId: Number(item.productId),
                    quantity: item.quantity ? Math.max(1, Number(item.quantity)) : 1,
                }));
        } catch {
            return [];
        }
    };

    // Load initial reference data: Categories, Brands, Components catalog
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [cats, brs, comps] = await Promise.all([
                    adminCategoryService.getAllCategories({ size: 100, sort: ['name,ASC'] }).catch(() => null),
                    adminBrandService.getAllBrands({ size: 100, sort: ['name,ASC'] }).catch(() => null),
                    adminProductService.getAllProducts({ size: 100 }).catch(() => ({ content: [] })),
                ]);
                if (cats?.content) {
                    setCategories(cats.content);
                }
                if (brs?.content) {
                    setBrands(brs.content);
                }
                setAvailableComponentProducts(comps.content || []);
            } catch (err) {
                console.error('Failed to load reference metadata:', err);
            }
        };
        fetchInitialData();
    }, []);

    // Load Products with filters (chỉ lấy cấu hình PC)
    const loadProducts = useCallback(
        async (isBackground = false) => {
            if (!isBackground) {
                setLoading(true);
            } else {
                setIsRefreshing(true);
            }
            setError(null);

            try {
                const pageIndex = Math.max(0, currentPage - 1);

                // Luôn truy vấn lọc productType = 'PC'
                const response = await adminProductService.getAllProducts({
                    keyword: searchQuery.trim() || undefined,
                    status: filters.status || undefined,
                    productType: 'PC',
                    brandId: filters.brandId || undefined,
                    categoryId: filters.categoryId || undefined,
                    page: pageIndex,
                    size: pageSize,
                    sort: ['id,DESC'],
                });

                const content = response.content || [];
                setTotalElements(response.totalElements ?? content.length);
                setTotalPages(response.totalPages || 1);

                // Map backend ProductResponse to AdminProductItem
                const mappedItems: AdminProductItem[] = content.map((p: ProductResponse) => {
                    let formattedCreatedDate = 'Chưa cập nhật';
                    if (p.createdDate) {
                        try {
                            formattedCreatedDate = new Date(p.createdDate).toLocaleDateString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            });
                        } catch {
                            formattedCreatedDate = p.createdDate.split('T')[0] || 'Chưa cập nhật';
                        }
                    }

                    // Resolve Brand Name
                    const matchedBrand = brands.find((b) => b.id === p.brandId);
                    const brandName = matchedBrand?.name || (p.brandId ? `Brand #${p.brandId}` : 'Chưa gán');

                    // Resolve Category Name
                    const catId = p.primaryCategoryId ?? (p.categoryIds && p.categoryIds.length > 0 ? p.categoryIds[0] : null);
                    const matchedCat = categories.find((c) => c.id === catId);
                    const categoryName = matchedCat?.name || (catId ? `Danh mục #${catId}` : 'PC Đồng bộ');

                    const rawImageUrl = p.imageUrl?.trim() || '';
                    const splitUrls = rawImageUrl
                        ? rawImageUrl
                            .split(';')
                            .map((u) => u.trim())
                            .filter(Boolean)
                        : [];

                    const avatarImage = splitUrls[0] || DEFAULT_PRODUCT_IMAGE;
                    const galleryImages = splitUrls.slice(1);

                    return {
                        id: String(p.id),
                        numericId: p.id,
                        name: p.name || 'Chưa đặt tên cấu hình',
                        sku: p.code || `PC-${p.id}`,
                        slug: p.slug || '',
                        brandId: p.brandId ?? null,
                        brand: brandName,
                        categoryIds: p.categoryIds || [],
                        primaryCategoryId: p.primaryCategoryId ?? null,
                        category: categoryName,
                        productType: 'PC',
                        price: typeof p.price === 'number' ? p.price : 0,
                        image: avatarImage,
                        gallery: galleryImages,
                        status: (p.status as BackendProductStatus) || 'ACTIVE',
                        specification: p.specification || '',
                        description: p.description || 'Chưa có bài viết mô tả sản phẩm cấu hình PC.',
                        createdAt: formattedCreatedDate,
                        lastModifiedAt: p.lastModifiedDate ? p.lastModifiedDate.split('T')[0] : undefined,
                        items: p.items || [],
                    };
                });

                setProducts(mappedItems);
            } catch (err: any) {
                console.error('Error fetching PC configurations from API:', err);
                setError(err.message || 'Không thể tải danh sách cấu hình PC từ máy chủ');
                showToast(err.message || 'Lỗi tải danh sách cấu hình PC', 'error');
            } finally {
                setLoading(false);
                setIsRefreshing(false);
            }
        },
        [currentPage, pageSize, searchQuery, filters, brands, categories, showToast]
    );

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Filter Configurations for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'brandId',
            label: 'Thương hiệu',
            type: 'select',
            placeholder: 'Tất cả thương hiệu',
            options: [
                { label: 'Tất cả thương hiệu', value: '' },
                ...brands.map((b) => ({
                    label: b.name,
                    value: String(b.id),
                })),
            ],
        },
        {
            name: 'categoryId',
            label: 'Danh mục PC',
            type: 'select',
            placeholder: 'Tất cả danh mục PC',
            options: [
                { label: 'Tất cả danh mục PC', value: '' },
                ...pcCategories.map((c) => ({
                    label: `🖥️ ${c.name}`,
                    value: String(c.id),
                })),
            ],
        },
        {
            name: 'status',
            label: 'Trạng thái kinh doanh',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: '✅ Đang bán (Active)', value: 'ACTIVE' },
                { label: '❌ Hết hàng (Out of Stock)', value: 'OUT_OF_STOCK' },
                { label: '👁️ Đang ẩn (Inactive)', value: 'INACTIVE' },
            ],
        },
    ];

    // Filter change handler
    const handleFilterChange = (newFilters: Record<string, string>) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            brandId: '',
            categoryId: '',
            status: '',
        });
        setSearchQuery('');
        setCurrentPage(1);
        showToast('Đã đặt lại bộ lọc', 'info');
    };

    // CSV Export Handler
    const handleExportCSV = () => {
        if (products.length === 0) {
            showToast('Không có dữ liệu cấu hình PC để xuất file', 'warning');
            return;
        }

        const headers = ['Mã cấu hình', 'Tên cấu hình PC', 'Thương hiệu', 'Danh mục', 'Giá bán (VND)', 'Trạng thái', 'Ngày tạo'];
        const rows = products.map((p) => [
            p.sku,
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.brand}"`,
            `"${p.category}"`,
            p.price,
            p.status,
            p.createdAt,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `danh-sach-cau-hinh-pc-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Xuất danh sách cấu hình PC thành công!', 'success');
    };

    // Delete Product API Handler
    const handleDeleteProduct = async (p: AdminProductItem) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa cấu hình "${p.name}" (Mã: ${p.sku}) khỏi hệ thống?`)) {
            return;
        }

        try {
            await adminProductService.deleteProduct(p.numericId);
            showToast(`Đã xóa thành công cấu hình "${p.name}"`, 'success');
            loadProducts(true);
        } catch (err: any) {
            showToast(`Xóa cấu hình thất bại: ${err.message}`, 'error');
        }
    };

    // Quick Status Toggle Handler
    const handleToggleStatus = async (p: AdminProductItem) => {
        const nextStatus: BackendProductStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const actionText = nextStatus === 'ACTIVE' ? 'Mở bán cấu hình' : 'Tạm ẩn cấu hình';

        if (!window.confirm(`Bạn có chắc chắn muốn ${actionText.toLowerCase()} "${p.name}"?`)) {
            return;
        }

        try {
            await adminProductService.updateProductStatus(p.numericId, nextStatus);
            showToast(`Đã chuyển trạng thái cấu hình "${p.sku}" thành ${nextStatus}`, 'success');
            loadProducts(true);
        } catch (err: any) {
            showToast(`Cập nhật trạng thái thất bại: ${err.message}`, 'error');
        }
    };

    // Open Edit Modal
    const handleOpenEditModal = (p: AdminProductItem) => {
        let spec = p.specification;
        if (!spec || !spec.trim() || spec.trim() === '[]') {
            spec = getSpecTemplateForCategory('PC').defaultSpecsJson;
        }

        setEditForm({ ...p, productType: 'PC', specification: spec });
        setEditSelectedFile(null);
        setEditGallery(
            (p.gallery || []).map((url, idx) => ({
                id: `edit-gal-${idx}-${Date.now()}`,
                url,
            }))
        );
        setActiveEditTab('basic');
        setIsEditModalOpen(true);
    };

    // Avatar File Handlers
    const handleAvatarFileSelect = (file: File, isEdit: boolean) => {
        const validation = validateImageFile(file, 32);
        if (!validation.valid) {
            showToast(validation.error || 'Tệp hình ảnh không hợp lệ', 'error');
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        if (isEdit) {
            setEditSelectedFile(file);
            setEditForm((prev) => (prev ? { ...prev, image: objectUrl } : null));
        } else {
            setAddSelectedFile(file);
            setAddForm((prev) => ({ ...prev, image: objectUrl }));
        }
    };

    // Gallery File Handlers
    const handleAddGalleryFiles = (files: FileList | File[], isEdit: boolean) => {
        const currentGallery = isEdit ? editGallery : addGallery;
        const availableSlots = 10 - currentGallery.length;
        if (availableSlots <= 0) {
            showToast('Đã đạt tối đa 10 ảnh trong thư viện. Vui lòng xóa bớt ảnh trước khi thêm.', 'warning');
            return;
        }

        const fileArray = Array.from(files).slice(0, availableSlots);
        if (fileArray.length < files.length) {
            showToast(`Chỉ có thể thêm tối đa 10 ảnh. Đã nhận ${fileArray.length} ảnh đầu tiên.`, 'info');
        }

        const newItems: ProductImageItem[] = [];
        for (const file of fileArray) {
            const validation = validateImageFile(file, 32);
            if (!validation.valid) {
                showToast(`Bỏ qua tệp "${file.name}": ${validation.error}`, 'warning');
                continue;
            }
            newItems.push({
                id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                url: URL.createObjectURL(file),
                file,
            });
        }
        if (newItems.length > 0) {
            if (isEdit) {
                setEditGallery((prev) => [...prev, ...newItems]);
            } else {
                setAddGallery((prev) => [...prev, ...newItems]);
            }
            showToast(`Đã thêm ${newItems.length} ảnh xem trước vào thư viện.`, 'info');
        }
    };

    const handleAddGalleryUrl = (url: string, isEdit: boolean) => {
        const trimmed = url.trim();
        if (!trimmed) {
            showToast('Vui lòng nhập đường dẫn URL ảnh hợp lệ', 'error');
            return;
        }
        const currentGallery = isEdit ? editGallery : addGallery;
        if (currentGallery.length >= 10) {
            showToast('Đã đạt tối đa 10 ảnh trong thư viện. Vui lòng xóa bớt ảnh trước khi thêm.', 'warning');
            return;
        }

        const newItem: ProductImageItem = {
            id: `gal-url-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: trimmed,
        };
        if (isEdit) {
            setEditGallery((prev) => [...prev, newItem]);
        } else {
            setAddGallery((prev) => [...prev, newItem]);
        }
        showToast('Đã thêm ảnh vào thư viện ảnh PC', 'success');
    };

    const handleRemoveGalleryItem = (id: string, isEdit: boolean) => {
        if (isEdit) {
            setEditGallery((prev) => prev.filter((item) => item.id !== id));
        } else {
            setAddGallery((prev) => prev.filter((item) => item.id !== id));
        }
    };

    // Callback khi chọn linh kiện trong tab Specs (load ảnh linh kiện)
    const handleComponentSelectedInSpecs = (slotKey: string, product: any, isEdit: boolean) => {
        const rawImg = product.image || product.imageUrl || '';
        const cleanImg = rawImg ? rawImg.split(';')[0].trim() : '';
        if (!cleanImg) return;

        if (isEdit) {
            setEditForm((prev) => {
                if (!prev) return null;
                // Nếu ảnh hiện tại là mặc định hoặc linh kiện là Case, tự động gán làm ảnh đại diện
                if (prev.image === DEFAULT_PRODUCT_IMAGE || !prev.image || slotKey.toUpperCase() === 'CASE') {
                    return { ...prev, image: cleanImg };
                }
                return prev;
            });
        } else {
            setAddForm((prev) => {
                if (prev.image === DEFAULT_PRODUCT_IMAGE || !prev.image || slotKey.toUpperCase() === 'CASE') {
                    return { ...prev, image: cleanImg };
                }
                return prev;
            });
        }
        showToast(`Đã nạp ảnh linh kiện ${slotKey} (${product.name})`, 'info');
    };

    // Edit Product Submit
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm) return;

        if (!editForm.name.trim()) {
            showToast('Vui lòng nhập tên cấu hình PC', 'error');
            setActiveEditTab('basic');
            return;
        }
        if (!editForm.sku.trim()) {
            showToast('Vui lòng nhập mã SKU cấu hình PC', 'error');
            setActiveEditTab('basic');
            return;
        }

        setIsSubmitting(true);
        let finalAvatarUrl = editForm.image;

        // 1. Upload Avatar nếu có file mới
        if (editSelectedFile) {
            setIsUploadingProductImage(true);
            try {
                finalAvatarUrl = await uploadImage(editSelectedFile);
                setEditSelectedFile(null);
            } catch (err: any) {
                console.error('Lỗi tải ảnh đại diện lên ImgBB:', err);
                showToast(`Tải ảnh đại diện lên ImgBB thất bại: ${err.message}. Hệ thống giữ nguyên ảnh hiện tại.`, 'warning');
                finalAvatarUrl = editForm.image && !editForm.image.startsWith('blob:') ? editForm.image : DEFAULT_PRODUCT_IMAGE;
            } finally {
                setIsUploadingProductImage(false);
            }
        }

        // 2. Upload các file ảnh sản phẩm trong gallery
        const hasPendingGalleryUploads = editGallery.some((item) => !!item.file);
        const finalGalleryUrls: string[] = [];

        if (hasPendingGalleryUploads) {
            setIsUploadingProductImage(true);
        }

        try {
            const uploadPromises = editGallery.map(async (item) => {
                if (item.file) {
                    try {
                        return await uploadImage(item.file);
                    } catch (err: any) {
                        console.warn('Lỗi tải 1 ảnh gallery lên ImgBB:', err);
                        return '';
                    }
                }
                if (item.url && !item.url.startsWith('blob:')) {
                    return item.url;
                }
                return '';
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            for (const u of uploadedUrls) {
                if (u && u.trim().length > 0) {
                    finalGalleryUrls.push(u.trim());
                }
            }
        } catch (err: any) {
            console.error('Lỗi upload gallery:', err);
        } finally {
            setIsUploadingProductImage(false);
        }

        // 3. Ghép URLs ảnh (đảm bảo không chứa link blob)
        let cleanedAvatarUrl = (finalAvatarUrl || '').trim();
        if (!cleanedAvatarUrl || cleanedAvatarUrl.startsWith('blob:')) {
            cleanedAvatarUrl = DEFAULT_PRODUCT_IMAGE;
        }
        const combinedImageUrl = [cleanedAvatarUrl, ...finalGalleryUrls].filter(Boolean).join(';');

        try {
            const brandIdNum = editForm.brandId ? Number(editForm.brandId) : null;
            const catIdNum = editForm.primaryCategoryId ? Number(editForm.primaryCategoryId) : null;
            const pcItems = extractPcItemsFromSpecs(editForm.specification);

            await adminProductService.updateProduct(editForm.numericId, {
                name: editForm.name.trim(),
                code: editForm.sku.trim().toUpperCase(),
                slug: editForm.slug.trim() || generateSlug(editForm.name),
                price: Number(editForm.price) || 0,
                productType: 'PC',
                status: editForm.status,
                imageUrl: combinedImageUrl,
                brandId: brandIdNum,
                primaryCategoryId: catIdNum,
                categoryIds: catIdNum ? [catIdNum] : [],
                specification: cleanEmptySpecsForSaving(editForm.specification),
                description: editForm.description,
                items: pcItems.length > 0 ? pcItems : undefined,
            });

            showToast(`Cập nhật thông tin cấu hình "${editForm.name.slice(0, 30)}..." thành công`, 'success');
            setIsEditModalOpen(false);
            loadProducts(true);
        } catch (err: any) {
            showToast(`Cập nhật thất bại: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add Product Submit (Luôn gửi productType = 'PC')
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) {
            showToast('Vui lòng nhập tên cấu hình PC', 'error');
            setActiveAddTab('basic');
            return;
        }
        if (!addForm.sku.trim()) {
            showToast('Vui lòng nhập mã SKU cấu hình PC', 'error');
            setActiveAddTab('basic');
            return;
        }

        // Kiểm tra linh kiện PC
        const pcItems = extractPcItemsFromSpecs(addForm.specification);
        if (pcItems.length === 0) {
            showToast('Cấu hình PC cần chọn ít nhất 1 linh kiện từ kho (tại Tab "Linh kiện cấu hình")', 'warning');
            setActiveAddTab('specs');
            return;
        }

        setIsSubmitting(true);
        let finalAvatarUrl = addForm.image;

        // 1. Upload Avatar
        if (addSelectedFile) {
            setIsUploadingProductImage(true);
            try {
                finalAvatarUrl = await uploadImage(addSelectedFile);
                setAddSelectedFile(null);
            } catch (err: any) {
                console.error('Lỗi tải ảnh đại diện lên ImgBB:', err);
                showToast(`Tải ảnh đại diện lên ImgBB thất bại: ${err.message}. Hệ thống sử dụng ảnh mặc định.`, 'warning');
                finalAvatarUrl = DEFAULT_PRODUCT_IMAGE;
            } finally {
                setIsUploadingProductImage(false);
            }
        }

        // 2. Upload Gallery
        const hasPendingGalleryUploads = addGallery.some((item) => !!item.file);
        const finalGalleryUrls: string[] = [];

        if (hasPendingGalleryUploads) {
            setIsUploadingProductImage(true);
        }

        try {
            const uploadPromises = addGallery.map(async (item) => {
                if (item.file) {
                    try {
                        return await uploadImage(item.file);
                    } catch (err: any) {
                        console.warn('Lỗi tải ảnh phụ lên ImgBB:', err);
                        return '';
                    }
                }
                if (item.url && !item.url.startsWith('blob:')) {
                    return item.url;
                }
                return '';
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            for (const u of uploadedUrls) {
                if (u && u.trim().length > 0) {
                    finalGalleryUrls.push(u.trim());
                }
            }
        } catch (err: any) {
            console.error('Lỗi khi tải ảnh thư viện:', err);
        } finally {
            setIsUploadingProductImage(false);
        }

        // 3. Ghép URLs ảnh (đảm bảo không gửi link blob)
        let cleanedAvatarUrl = (finalAvatarUrl || '').trim();
        if (!cleanedAvatarUrl || cleanedAvatarUrl.startsWith('blob:')) {
            cleanedAvatarUrl = DEFAULT_PRODUCT_IMAGE;
        }
        const combinedImageUrl = [cleanedAvatarUrl, ...finalGalleryUrls].filter(Boolean).join(';');

        try {
            const finalSlug = addForm.slug.trim() || generateSlug(addForm.name);
            const brandIdNum = addForm.brandId ? Number(addForm.brandId) : null;
            const catIdNum = addForm.primaryCategoryId ? Number(addForm.primaryCategoryId) : null;

            // Gọi API tạo sản phẩm với productType = 'PC'
            await adminProductService.createProduct({
                name: addForm.name.trim(),
                code: addForm.sku.trim().toUpperCase(),
                slug: finalSlug,
                price: Number(addForm.price) || 0,
                productType: 'PC',
                status: addForm.status,
                imageUrl: combinedImageUrl,
                brandId: brandIdNum,
                primaryCategoryId: catIdNum,
                categoryIds: catIdNum ? [catIdNum] : [],
                specification: cleanEmptySpecsForSaving(addForm.specification),
                description: addForm.description,
                items: pcItems,
            });

            showToast(`Đã thêm mới thành công cấu hình PC "${addForm.name}"`, 'success');
            setIsAddModalOpen(false);

            // Reset Add Form
            const defaultCat = pcCategories[0] || categories[0];
            const defaultSpecs = getSpecTemplateForCategory('PC').defaultSpecsJson;

            setAddForm({
                name: '',
                sku: '',
                slug: '',
                brandId: brands[0]?.id || '',
                primaryCategoryId: defaultCat?.id || '',
                productType: 'PC',
                price: 15000000,
                status: 'ACTIVE',
                specification: defaultSpecs,
                description: '',
                image: DEFAULT_PRODUCT_IMAGE,
            });
            setAddSelectedFile(null);
            setAddGallery([]);
            setActiveAddTab('basic');

            loadProducts(true);
        } catch (err: any) {
            showToast(`Thêm cấu hình PC thất bại: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`Đã sao chép ${label}: ${text}`, 'info');
    };

    // Columns Definition for AdminTable
    const columns: Column<AdminProductItem>[] = [
        {
            key: 'product',
            header: 'Cấu hình PC',
            render: (p: AdminProductItem) => (
                <div className="flex items-center gap-3.5 py-1 min-w-[280px]">
                    <div className="relative w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                        <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm truncate hover:text-blue-600 transition-colors">
                                {p.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(p.sku, 'Mã cấu hình');
                                }}
                                className="font-mono text-[11px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                                title="Nhấn để sao chép SKU"
                            >
                                {p.sku}
                                <Copy className="w-2.5 h-2.5 text-gray-400" />
                            </span>
                            <span className="text-[11px] text-gray-400">•</span>
                            <span className="text-[11px] text-gray-500 font-medium truncate">{p.brand}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            header: 'Danh mục PC',
            render: (p: AdminProductItem) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <PcCase className="w-3.5 h-3.5 text-indigo-500" />
                    {p.category}
                </span>
            ),
        },
        {
            key: 'specsSummary',
            header: 'Linh kiện cấu hình',
            render: (p: AdminProductItem) => {
                const pcItems = extractPcItemsFromSpecs(p.specification);
                const count = pcItems.length > 0 ? pcItems.length : (p.items?.length || 0);

                return (
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                            <Cpu className="w-3 h-3 text-emerald-600" />
                            {count > 0 ? `${count} linh kiện` : 'Chưa gắn linh kiện'}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'price',
            header: 'Giá niêm yết',
            render: (p: AdminProductItem) => (
                <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                    {formatVND(p.price)}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (p: AdminProductItem) => {
                const isAct = p.status === 'ACTIVE';
                const isOut = p.status === 'OUT_OF_STOCK';

                return (
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isAct
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isOut
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-500' : isOut ? 'bg-amber-500' : 'bg-gray-400'
                                }`}
                        />
                        {isAct ? 'Đang bán' : isOut ? 'Hết hàng' : 'Tạm ẩn'}
                    </span>
                );
            },
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            render: (p: AdminProductItem) => (
                <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {p.createdAt}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (p: AdminProductItem) => (
                <AdminActionDropdown
                    onView={() => {
                        setSelectedProduct(p);
                        setActiveDetailTab('overview');
                        setIsDetailModalOpen(true);
                    }}
                    viewLabel="Xem chi tiết cấu hình"
                    onEdit={() => handleOpenEditModal(p)}
                    editLabel="Chỉnh sửa cấu hình"
                    moreActions={[
                        {
                            key: 'toggle-status',
                            label: p.status === 'ACTIVE' ? 'Tạm ẩn cấu hình' : 'Mở bán cấu hình',
                            description:
                                p.status === 'ACTIVE'
                                    ? 'Ngừng hiển thị cấu hình trên cửa hàng'
                                    : 'Hiển thị lại cấu hình PC',
                            icon: p.status === 'ACTIVE' ? EyeOff : Eye,
                            variant: p.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: () => handleToggleStatus(p),
                        },
                    ]}
                    onDelete={() => handleDeleteProduct(p)}
                    deleteLabel="Xóa cấu hình PC"
                    deleteDescription="Xóa cấu hình PC khỏi hệ thống"
                />
            ),
        },
    ];

    // Modal Tabs Definition
    const modalTabs: ModalTab[] = [
        { id: 'basic', label: '1. Thông tin chung', icon: Package },
        { id: 'pricing', label: '2. Giá & Trạng thái', icon: DollarSign },
        { id: 'gallery', label: '3. Hình ảnh cấu hình', icon: ImageIcon },
        { id: 'specs', label: '4. Linh kiện cấu hình', icon: Cpu },
    ];

    const detailTabs: ModalTab[] = [
        { id: 'overview', label: 'Tổng quan cấu hình', icon: Eye },
        { id: 'components', label: 'Danh sách linh kiện PC', icon: Cpu },
        { id: 'gallery', label: 'Thư viện ảnh', icon: ImageIcon },
        { id: 'description', label: 'Bài viết mô tả', icon: Layers },
    ];

    return (
        <div className="space-y-6">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <PcCase className="w-7 h-7 text-indigo-600" />
                        Quản lý cấu hình PC
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Quản lý danh sách cấu hình máy bộ, PC đồng bộ, bộ nâng cấp PC và các linh kiện đi kèm.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => loadProducts(true)}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-xs"
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        Xuất Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const defaultCat = pcCategories[0] || categories[0];
                            const defaultSpecs = getSpecTemplateForCategory('PC').defaultSpecsJson;

                            setAddForm({
                                name: '',
                                sku: `PC-${Date.now().toString(36).slice(-5).toUpperCase()}`,
                                slug: '',
                                brandId: brands[0]?.id || '',
                                primaryCategoryId: defaultCat?.id || '',
                                productType: 'PC',
                                price: 15000000,
                                status: 'ACTIVE',
                                specification: defaultSpecs,
                                description: '',
                                image: DEFAULT_PRODUCT_IMAGE,
                            });
                            setAddSelectedFile(null);
                            setAddGallery([]);
                            setActiveAddTab('basic');
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm cấu hình PC
                    </button>
                </div>
            </div>

            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <PcCase className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Tổng cấu hình PC</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">{totalElements}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Đang kinh doanh</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {products.filter((p) => p.status === 'ACTIVE').length}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Tạm hết hàng</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {products.filter((p) => p.status === 'OUT_OF_STOCK').length}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <EyeOff className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Đang ẩn hiển thị</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {products.filter((p) => p.status === 'INACTIVE').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* ERROR ALERT */}
            {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadProducts()}
                        className="text-xs font-semibold underline hover:text-rose-900 ml-3"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* FILTER & SEARCH */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                values={filters}
                onSearch={(val) => {
                    setSearchQuery(val);
                    setCurrentPage(1);
                }}
                onFilterChange={handleFilterChange}
                onReset={handleClearFilters}
                searchPlaceholder="Tìm theo tên cấu hình PC, mã SKU hoặc đường dẫn slug..."
            />

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={products}
                    loading={loading}
                    rowKey="id"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 15, 20]}
                    onPageChange={(page: number) => setCurrentPage(page)}
                    onPageSizeChange={(newSize: number) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    onRowClick={(item: AdminProductItem) => {
                        setSelectedProduct(item);
                        setActiveDetailTab('overview');
                        setIsDetailModalOpen(true);
                    }}
                    itemUnitName="cấu hình PC"
                    emptyText="Không tìm thấy cấu hình PC nào phù hợp với bộ lọc."
                />
            </div>

            {/* ========================================================================= */}
            {/* ADD PC CONFIG MODAL                                                       */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title="Thêm mới cấu hình PC"
                description="Tạo cấu hình bộ máy PC hoàn chỉnh, thiết lập danh mục PC và chọn danh sách linh kiện thành phần."
                size="2xl"
                tabs={modalTabs}
                activeTab={activeAddTab}
                onTabChange={setActiveAddTab}
                footer={
                    <AdminModalFooter
                        onCancel={() => setIsAddModalOpen(false)}
                        onSubmit={handleAddSubmit}
                        isSubmitting={isSubmitting || isUploadingProductImage}
                        submittingText={isUploadingProductImage ? 'Đang tải ảnh lên...' : 'Đang tạo cấu hình PC...'}
                        cancelText="Hủy bỏ"
                        submitText="Tạo cấu hình PC"
                    />
                }
            >
                <div className="py-2">
                    {/* TAB 1: THÔNG TIN CƠ BẢN */}
                    {activeAddTab === 'basic' && (
                        <div className="space-y-4">
                            {/* Tên cấu hình */}
                            <div>
                                <AdminLabel required>Tên cấu hình PC</AdminLabel>
                                <AdminInput
                                    type="text"
                                    required
                                    placeholder="Ví dụ: PC Gaming MSI Intel Core i5 14400F / RTX 4060 8GB / 16GB DDR5"
                                    value={addForm.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setAddForm((prev) => ({
                                            ...prev,
                                            name: newName,
                                            slug: generateSlug(newName),
                                        }));
                                    }}
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <AdminLabel
                                    required
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => setAddForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }))}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium cursor-pointer"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Tạo lại slug
                                        </button>
                                    }
                                >
                                    Đường dẫn tĩnh (Slug URL)
                                </AdminLabel>
                                <AdminInput
                                    type="text"
                                    required
                                    prefixText="/pc/"
                                    value={addForm.slug}
                                    onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                                    className="font-mono"
                                />
                            </div>

                            {/* SKU */}
                            <div>
                                <AdminLabel required>Mã SKU cấu hình</AdminLabel>
                                <AdminInput
                                    type="text"
                                    required
                                    placeholder="PC-GAMING-01"
                                    value={addForm.sku}
                                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                                    className="font-mono uppercase"
                                />
                            </div>

                            {/* Danh mục PC & Thương hiệu */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <AdminLabel required>Danh mục PC</AdminLabel>
                                    <AdminSelect
                                        value={addForm.primaryCategoryId}
                                        onChange={(e) => {
                                            const catId = e.target.value;
                                            setAddForm((prev) => ({
                                                ...prev,
                                                primaryCategoryId: catId,
                                            }));
                                        }}
                                        required
                                    >
                                        <option value="">-- Chọn danh mục PC --</option>
                                        {pcCategories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                🖥️ {c.name}
                                            </option>
                                        ))}
                                    </AdminSelect>
                                </div>

                                <div>
                                    <AdminLabel>Thương hiệu / Hãng lắp ráp</AdminLabel>
                                    <AdminSelect
                                        value={addForm.brandId}
                                        onChange={(e) => setAddForm({ ...addForm, brandId: e.target.value })}
                                    >
                                        <option value="">-- Chọn thương hiệu --</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </AdminSelect>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: GIÁ & TRẠNG THÁI */}
                    {activeAddTab === 'pricing' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <AdminLabel required>Giá niêm yết trọn bộ (VNĐ)</AdminLabel>
                                    <AdminInput
                                        type="number"
                                        required
                                        min="0"
                                        step="50000"
                                        value={addForm.price}
                                        onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) || 0 })}
                                        suffixText="VNĐ"
                                        helperText={`Hiển thị: ${formatVND(addForm.price)}`}
                                        className="font-bold"
                                    />
                                </div>

                                <div>
                                    <AdminLabel>Trạng thái bán</AdminLabel>
                                    <AdminSelect
                                        value={addForm.status}
                                        onChange={(e) => setAddForm({ ...addForm, status: e.target.value as BackendProductStatus })}
                                    >
                                        <option value="ACTIVE">Đang bán (Active)</option>
                                        <option value="OUT_OF_STOCK">Tạm hết hàng (Out of Stock)</option>
                                        <option value="INACTIVE">Tạm ẩn (Inactive)</option>
                                    </AdminSelect>
                                </div>
                            </div>

                            {/* Mô tả chi tiết */}
                            <div>
                                <AdminLabel>Bài viết giới thiệu & bảo hành cấu hình</AdminLabel>
                                <AdminTextarea
                                    rows={5}
                                    placeholder="Mô tả hiệu năng chơi game, ứng dụng đồ họa tương thích, chính sách bảo hành tận nơi..."
                                    value={addForm.description}
                                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: HÌNH ẢNH & THƯ VIỆN ẢNH */}
                    {activeAddTab === 'gallery' && (
                        <GalleryManager
                            avatarUrl={addForm.image}
                            gallery={addGallery}
                            selectedAvatarFile={addSelectedFile}
                            isUploading={isUploadingProductImage}
                            onSelectAvatarFile={(file) => handleAvatarFileSelect(file, false)}
                            onSetAvatarUrl={(url) => {
                                setAddSelectedFile(null);
                                setAddForm((prev) => ({ ...prev, image: url }));
                                showToast('Đã cập nhật URL ảnh đại diện', 'success');
                            }}
                            onClearAvatar={() => {
                                setAddSelectedFile(null);
                                setAddForm((prev) => ({ ...prev, image: DEFAULT_PRODUCT_IMAGE }));
                            }}
                            onAddGalleryFiles={(files) => handleAddGalleryFiles(files, false)}
                            onAddGalleryUrl={(url) => handleAddGalleryUrl(url, false)}
                            onRemoveGalleryItem={(id) => handleRemoveGalleryItem(id, false)}
                            componentImages={addComponentImages}
                        />
                    )}

                    {/* TAB 4: LINH KIỆN CẤU HÌNH (PC BUILDER SPEC FORM) */}
                    {activeAddTab === 'specs' && (
                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
                                <PcCase className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-indigo-900 leading-relaxed">
                                    <strong>Chọn linh kiện cấu hình PC:</strong> Bạn có thể nhấn <em>"Chọn linh kiện từ kho"</em> để liên kết trực tiếp với sản phẩm có sẵn trong kho hàng (CPU, Mainboard, RAM, VGA, SSD, PSU, Case...), hoặc tự nhập thông số tùy chỉnh.
                                </div>
                            </div>
                            <DynamicSpecForm
                                value={addForm.specification}
                                onChange={(newSpec) => setAddForm({ ...addForm, specification: newSpec })}
                                productType="PC"
                                categoryName="PC"
                                availableProducts={availableComponentProducts}
                                onSelectComponentProduct={(slotKey, prod) => handleComponentSelectedInSpecs(slotKey, prod, false)}
                            />
                        </div>
                    )}
                </div>
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT PC CONFIG MODAL                                                      */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => !isSubmitting && setIsEditModalOpen(false)}
                    title={`Chỉnh sửa: ${editForm.name}`}
                    description="Cập nhật thông tin cấu hình PC, danh mục và danh sách linh kiện thành phần."
                    size="2xl"
                    tabs={modalTabs}
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    footer={
                        <AdminModalFooter
                            onCancel={() => setIsEditModalOpen(false)}
                            onSubmit={handleEditSubmit}
                            isSubmitting={isSubmitting || isUploadingProductImage}
                            submittingText={isUploadingProductImage ? 'Đang tải ảnh lên...' : 'Đang cập nhật cấu hình...'}
                            cancelText="Hủy bỏ"
                            submitText="Cập nhật cấu hình"
                        />
                    }
                >
                    <div className="py-2">
                        {/* TAB 1: THÔNG TIN CƠ BẢN */}
                        {activeEditTab === 'basic' && (
                            <div className="space-y-4">
                                <div>
                                    <AdminLabel required>Tên cấu hình PC</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <AdminLabel required>Mã SKU</AdminLabel>
                                    <AdminInput
                                        type="text"
                                        required
                                        value={editForm.sku}
                                        onChange={(e) => setEditForm({ ...editForm, sku: e.target.value.toUpperCase() })}
                                        className="font-mono uppercase"
                                    />
                                </div>

                                <div>
                                    <AdminLabel
                                        action={
                                            <button
                                                type="button"
                                                onClick={() => setEditForm((prev) => (prev ? { ...prev, slug: generateSlug(prev.name) } : null))}
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium cursor-pointer"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Tạo lại từ tên
                                            </button>
                                        }
                                    >
                                        Đường dẫn tĩnh (Slug URL)
                                    </AdminLabel>
                                    <AdminInput
                                        type="text"
                                        prefixText="/pc/"
                                        value={editForm.slug}
                                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                        className="font-mono"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <AdminLabel>Danh mục PC</AdminLabel>
                                        <AdminSelect
                                            value={editForm.primaryCategoryId ?? ''}
                                            onChange={(e) => {
                                                const catId = e.target.value ? Number(e.target.value) : null;
                                                const selectedCat = categories.find((c) => c.id === catId);
                                                const catName = selectedCat?.name || '';
                                                const templateInfo = getSpecTemplateForCategory(catName);

                                                setEditForm((prev) => {
                                                    if (!prev) return null;
                                                    const mergedSpecs = mergeSpecsWithTemplate(prev.specification, templateInfo.items);
                                                    return {
                                                        ...prev,
                                                        primaryCategoryId: catId,
                                                        category: catName,
                                                        specification: mergedSpecs,
                                                    };
                                                });
                                            }}
                                        >
                                            <option value="">-- Chọn danh mục PC --</option>
                                            {pcCategories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    🖥️ {c.name}
                                                </option>
                                            ))}
                                        </AdminSelect>
                                    </div>

                                    <div>
                                        <AdminLabel>Thương hiệu</AdminLabel>
                                        <AdminSelect
                                            value={editForm.brandId ?? ''}
                                            onChange={(e) => setEditForm({ ...editForm, brandId: e.target.value ? Number(e.target.value) : null })}
                                        >
                                            <option value="">-- Chọn thương hiệu --</option>
                                            {brands.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </AdminSelect>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: GIÁ & TRẠNG THÁI */}
                        {activeEditTab === 'pricing' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <AdminLabel required>Giá niêm yết (VNĐ)</AdminLabel>
                                        <AdminInput
                                            type="number"
                                            required
                                            min="0"
                                            step="50000"
                                            value={editForm.price}
                                            onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) || 0 })}
                                            suffixText="VNĐ"
                                            helperText={`Hiển thị: ${formatVND(editForm.price)}`}
                                            className="font-bold"
                                        />
                                    </div>

                                    <div>
                                        <AdminLabel>Trạng thái bán</AdminLabel>
                                        <AdminSelect
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BackendProductStatus })}
                                        >
                                            <option value="ACTIVE">Đang bán (Active)</option>
                                            <option value="OUT_OF_STOCK">Tạm hết hàng (Out of Stock)</option>
                                            <option value="INACTIVE">Tạm ẩn (Inactive)</option>
                                        </AdminSelect>
                                    </div>
                                </div>

                                <div>
                                    <AdminLabel>Bài viết giới thiệu & bảo hành cấu hình</AdminLabel>
                                    <AdminTextarea
                                        rows={6}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 3: THƯ VIỆN HÌNH ẢNH */}
                        {activeEditTab === 'gallery' && (
                            <GalleryManager
                                avatarUrl={editForm.image}
                                gallery={editGallery}
                                selectedAvatarFile={editSelectedFile}
                                isUploading={isUploadingProductImage}
                                onSelectAvatarFile={(file) => handleAvatarFileSelect(file, true)}
                                onSetAvatarUrl={(url) => {
                                    setEditSelectedFile(null);
                                    setEditForm((prev) => (prev ? { ...prev, image: url } : null));
                                    showToast('Đã cập nhật URL ảnh đại diện', 'success');
                                }}
                                onClearAvatar={() => {
                                    setEditSelectedFile(null);
                                    setEditForm((prev) => (prev ? { ...prev, image: DEFAULT_PRODUCT_IMAGE } : null));
                                }}
                                onAddGalleryFiles={(files) => handleAddGalleryFiles(files, true)}
                                onAddGalleryUrl={(url) => handleAddGalleryUrl(url, true)}
                                onRemoveGalleryItem={(id) => handleRemoveGalleryItem(id, true)}
                                componentImages={editComponentImages}
                            />
                        )}

                        {/* TAB 4: LINH KIỆN CẤU HÌNH (PC BUILDER SPEC FORM) */}
                        {activeEditTab === 'specs' && (
                            <div className="space-y-3">
                                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
                                    <PcCase className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                    <div className="text-xs text-indigo-900 leading-relaxed">
                                        <strong>Chỉnh sửa linh kiện PC:</strong> Bạn có thể chọn lại các linh kiện thành phần cấu hình hoặc thay đổi thông số chi tiết.
                                    </div>
                                </div>
                                <DynamicSpecForm
                                    value={editForm.specification}
                                    onChange={(newSpec) => setEditForm({ ...editForm, specification: newSpec })}
                                    productType="PC"
                                    categoryName="PC"
                                    availableProducts={availableComponentProducts}
                                    onSelectComponentProduct={(slotKey, prod) => handleComponentSelectedInSpecs(slotKey, prod, true)}
                                />
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL PC CONFIG MODAL                                                    */}
            {/* ========================================================================= */}
            {selectedProduct && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title="Chi tiết cấu hình PC"
                    description={`Xem đầy đủ thông số, linh kiện cấu hình và thông tin của ${selectedProduct.name}`}
                    size="2xl"
                    tabs={detailTabs}
                    activeTab={activeDetailTab}
                    onTabChange={setActiveDetailTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-gray-400 font-mono">
                                ID: #{selectedProduct.numericId} • Tạo ngày: {selectedProduct.createdAt}
                            </span>
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEditModal(selectedProduct);
                                    }}
                                    icon={Edit}
                                >
                                    Chỉnh sửa cấu hình này
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* HERO HEADER */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="w-28 h-28 rounded-xl bg-white border border-gray-200 p-2 overflow-hidden shrink-0 shadow-2xs">
                                <img
                                    src={selectedProduct.image}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                    }}
                                />
                            </div>
                            <div className="space-y-2 text-center sm:text-left min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <PcCase className="w-3.5 h-3.5 text-indigo-500" />
                                        Cấu hình PC
                                    </span>
                                    <span className="font-mono text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {selectedProduct.sku}
                                    </span>
                                    <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                                        {selectedProduct.brand}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                                    {selectedProduct.name}
                                </h3>
                                <div className="flex items-baseline gap-2.5 justify-center sm:justify-start">
                                    <span className="text-xl font-extrabold text-rose-600">
                                        {formatVND(selectedProduct.price)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* TAB 1: TỔNG QUAN CẤU HÌNH */}
                        {activeDetailTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-2xs space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Thông tin phân loại
                                    </h4>
                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Danh mục PC:</span>
                                            <span className="font-semibold text-gray-800">{selectedProduct.category}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Hãng sản xuất:</span>
                                            <span className="font-semibold text-gray-800">{selectedProduct.brand}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Trạng thái bán:</span>
                                            <span className="font-semibold text-gray-800">
                                                {selectedProduct.status === 'ACTIVE'
                                                    ? 'Đang bán'
                                                    : selectedProduct.status === 'OUT_OF_STOCK'
                                                        ? 'Hết hàng'
                                                        : 'Tạm ẩn'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-2xs space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        Hệ thống & Đường dẫn
                                    </h4>
                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Mã SKU:</span>
                                            <span className="font-mono font-bold text-gray-800">{selectedProduct.sku}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Đường dẫn slug:</span>
                                            <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded truncate max-w-[180px]">
                                                {selectedProduct.slug}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Ngày tạo:</span>
                                            <span className="font-medium text-gray-800">{selectedProduct.createdAt}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DANH SÁCH LINH KIỆN CẤU HÌNH (READ-ONLY VIEW) */}
                        {activeDetailTab === 'components' && (
                            <div className="space-y-4">
                                <DynamicSpecForm
                                    value={selectedProduct.specification}
                                    onChange={() => { }}
                                    productType="PC"
                                    categoryName="PC"
                                    readOnly={true}
                                    availableProducts={availableComponentProducts}
                                />
                            </div>
                        )}

                        {/* TAB 3: THƯ VIỆN HÌNH ẢNH */}
                        {activeDetailTab === 'gallery' && (
                            <div>
                                {selectedProduct.gallery.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs text-gray-500">Chưa có ảnh phụ nào cho cấu hình này</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {selectedProduct.gallery.map((url, idx) => (
                                            <div
                                                key={idx}
                                                className="aspect-square rounded-xl bg-white border border-gray-200 overflow-hidden shadow-2xs p-1"
                                            >
                                                <img
                                                    src={url}
                                                    alt={`Gallery ${idx}`}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: MÔ TẢ CHI TIẾT */}
                        {activeDetailTab === 'description' && (
                            <div className="p-4 rounded-xl border border-gray-200 bg-white">
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                    {selectedProduct.description || 'Chưa có thông tin mô tả chi tiết.'}
                                </p>
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
