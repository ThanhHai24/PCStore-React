import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Download,
    Calendar,
    Check,
    Upload,
    Copy,
    RefreshCw,
    DollarSign,
    Image as ImageIcon,
    Tag,
    Cpu,
    Loader2,
    Layers,
    Laptop,
    AlertCircle
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';
import { uploadImage, validateImageFile } from '../../../services/imgbbService';
import { adminProductService } from '../../../services/adminProductService';
import { adminCategoryService } from '../../../services/adminCategoryService';
import { adminBrandService } from '../../../services/adminBrandService';
import type { CategoryResponse } from '../../../types/adminCategory';
import type { BrandResponse } from '../../../types/adminBrand';
import type { ProductResponse, BackendProductStatus, ProductType } from '../../../types/adminProduct';
import { DynamicSpecForm } from '../../../components/admin/DynamicSpecForm';
import {
    detectProductTypeFromCategory,
    getSpecTemplateForCategory,
    mergeSpecsWithTemplate,
    cleanEmptySpecsForSaving,
} from '../../../config/specTemplates';

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
    brandId?: number | null;
    brand: string;
    categoryIds?: number[];
    primaryCategoryId?: number | null;
    category: string;
    productType: ProductType;
    price: number;
    image: string;
    gallery: string[];
    status: BackendProductStatus;
    specification: string;
    description: string;
    createdAt: string;
    lastModifiedAt?: string;
}

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';

// Slug Generator
const generateSlug = (str: string) => {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/(\s+)/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Format currency
const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// =============================================================================
// PRODUCT MEDIA TAB COMPONENT (Phần 1: Ảnh đại diện | Phần 2: Ảnh sản phẩm tối đa 10)
// =============================================================================
interface ProductMediaTabProps {
    avatarUrl: string;
    avatarFile: File | null;
    onAvatarUrlChange: (url: string) => void;
    onAvatarFileSelect: (file: File) => void;
    onAvatarReset: () => void;
    gallery: ProductImageItem[];
    onAddGalleryFiles: (files: FileList | File[]) => void;
    onAddGalleryUrl: (url: string) => void;
    onRemoveGalleryItem: (id: string) => void;
}

function ProductMediaTab({
    avatarUrl,
    avatarFile,
    onAvatarUrlChange,
    onAvatarFileSelect,
    onAvatarReset,
    gallery,
    onAddGalleryFiles,
    onAddGalleryUrl,
    onRemoveGalleryItem,
}: ProductMediaTabProps) {
    const [galleryUrlInput, setGalleryUrlInput] = useState('');
    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    const galleryFileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onAvatarFileSelect(file);
        }
        if (e.target) e.target.value = '';
    };

    const handleGalleryFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAddGalleryFiles(e.target.files);
        }
        if (e.target) e.target.value = '';
    };

    const handleGalleryUrlSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (galleryUrlInput.trim()) {
            onAddGalleryUrl(galleryUrlInput.trim());
            setGalleryUrlInput('');
        }
    };

    const isGalleryFull = gallery.length >= 10;

    return (
        <div className="space-y-6">
            {/*ẢNH ĐẠI DIỆN*/}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            1
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                Ảnh đại diện sản phẩm
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    1 Ảnh
                                </span>
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Preview Box */}
                    <div className="relative w-40 h-40 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/20 border-2 border-dashed border-gray-300 p-2.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner group">
                        <img
                            src={avatarUrl || DEFAULT_PRODUCT_IMAGE}
                            alt="Ảnh đại diện"
                            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex-1 space-y-3.5 w-full">
                        <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarFileInput}
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => avatarFileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 active:scale-[0.98] transition-all shadow-sm"
                            >
                                <Upload className="w-4 h-4" />
                                Chọn ảnh  từ máy tính
                            </button>

                            {avatarUrl !== DEFAULT_PRODUCT_IMAGE && (
                                <button
                                    type="button"
                                    onClick={onAvatarReset}
                                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors"
                                    title="Đặt lại ảnh mẫu mặc định"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Đặt lại ảnh
                                </button>
                            )}
                        </div>

                        {/* <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Đường dẫn URL ảnh:
                            </label>
                            <div className="relative">
                                <input
                                    type="url"
                                    placeholder="https://images.unsplash.com/... hoặc https://i.ibb.co/..."
                                    value={avatarUrl}
                                    onChange={(e) => onAvatarUrlChange(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs text-gray-800 transition-all font-mono"
                                />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                                Hỗ trợ định dạng JPG, PNG, WebP.
                            </p>
                        </div> */}
                    </div>
                </div>
            </div>

            {/*ẢNH SẢN PHẨM */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                            2
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                Bộ sưu tập ảnh sản phẩm
                                <span
                                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${isGalleryFull
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        }`}
                                >
                                    {gallery.length} / 10 ảnh
                                </span>
                            </h3>
                            <p className="text-xs text-gray-400">
                                Hỗ trợ định dạng JPG, PNG, WebP. Tối đa 10 ảnh, mỗi ảnh dung lượng dưới 2MB
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add Gallery Controls */}
                {!isGalleryFull ? (
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-3">
                        <input
                            ref={galleryFileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleGalleryFileInput}
                        />

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <button
                                type="button"
                                onClick={() => galleryFileInputRef.current?.click()}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all shadow-sm shrink-0"
                            >
                                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                Tải ảnh từ máy tính
                            </button>

                            <div className="h-4 w-px bg-gray-300 hidden sm:block" />

                            {/* <div className="flex-1 flex items-center gap-2">
                                <input
                                    type="url"
                                    placeholder="Nhập URL ảnh sản phẩm"
                                    value={galleryUrlInput}
                                    onChange={(e) => setGalleryUrlInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleGalleryUrlSubmit();
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs text-gray-800 transition-all font-mono bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleGalleryUrlSubmit}
                                    disabled={!galleryUrlInput.trim()}
                                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Thêm ảnh
                                </button>
                            </div> */}
                        </div>
                    </div>
                ) : (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
                        <span className="font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            Đã đạt số lượng tối đa 10 ảnh sản phẩm.
                        </span>
                        <span className="text-[11px] text-amber-700 font-medium">
                            Xóa bớt ảnh nếu muốn thêm ảnh mới
                        </span>
                    </div>
                )}

                {/* Gallery Grid */}
                {gallery.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/40 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-bold text-gray-700">
                            Chưa có ảnh sản phẩm nào
                        </h4>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {gallery.map((item, idx) => (
                            <div
                                key={item.id}
                                className="group relative aspect-square rounded-xl bg-white border border-gray-200 p-1.5 shadow-sm overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all duration-200 flex items-center justify-center"
                            >
                                {/* Index Pill */}
                                <span className="absolute top-1.5 left-1.5 z-10 bg-gray-900/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                    #{idx + 1}
                                </span>

                                {/* Preview Badge if pending upload */}
                                {item.file && (
                                    <span
                                        className="absolute bottom-1.5 left-1.5 z-10 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow"
                                        title="Ảnh xem trước"
                                    >
                                        Xem trước
                                    </span>
                                )}

                                {/* Delete Button */}
                                <button
                                    type="button"
                                    onClick={() => onRemoveGalleryItem(item.id)}
                                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 group-hover:opacity-100 sm:opacity-90"
                                    title="Xóa ảnh này"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Thumbnail Image */}
                                <img
                                    src={item.url}
                                    alt={`Ảnh sản phẩm #${idx + 1}`}
                                    className="w-full h-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ProductList() {
    const { showToast } = useToast();

    // Data State from Backend API
    const [products, setProducts] = useState<AdminProductItem[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [brands, setBrands] = useState<BrandResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination & Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<AdminProductItem | null>(null);

    // Active Tabs in Modals
    const [activeAddTab, setActiveAddTab] = useState('basic');
    const [activeEditTab, setActiveEditTab] = useState('basic');
    const [activeDetailTab, setActiveDetailTab] = useState('overview');

    // Add Form State
    const [addForm, setAddForm] = useState({
        name: '',
        sku: '',
        slug: '',
        brandId: '' as string | number,
        primaryCategoryId: '' as string | number,
        productType: 'COMPONENT' as ProductType,
        price: 1000000,
        status: 'ACTIVE' as BackendProductStatus,
        specification: '',
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
    const [isUploadingProductImage, setIsUploadingProductImage] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Load Categories & Brands dictionary
    const loadDictionaries = useCallback(async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                adminCategoryService.getAllCategories({ size: 100, sort: ['name,ASC'] }).catch(() => null),
                adminBrandService.getAllBrands({ size: 100, sort: ['name,ASC'] }).catch(() => null),
            ]);
            if (catRes?.content) {
                setCategories(catRes.content);
            }
            if (brandRes?.content) {
                setBrands(brandRes.content);
            }
        } catch (err) {
            console.warn('Error loading categories/brands options:', err);
        }
    }, []);

    // Load Products from Backend API
    const loadProducts = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError(null);

        try {
            const pageIndex = Math.max(0, currentPage - 1);
            const response = await adminProductService.getAllProducts({
                keyword: searchQuery.trim() || undefined,
                status: filters.status || undefined,
                productType: filters.productType || undefined,
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
                const categoryName = matchedCat?.name || (catId ? `Danh mục #${catId}` : 'Chưa phân loại');

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
                    name: p.name || 'Chưa đặt tên',
                    sku: p.code || `SKU-${p.id}`,
                    slug: p.slug || '',
                    brandId: p.brandId ?? null,
                    brand: brandName,
                    categoryIds: p.categoryIds || [],
                    primaryCategoryId: p.primaryCategoryId ?? null,
                    category: categoryName,
                    productType: (p.productType as ProductType) || 'COMPONENT',
                    price: typeof p.price === 'number' ? p.price : 0,
                    image: avatarImage,
                    gallery: galleryImages,
                    status: (p.status as BackendProductStatus) || 'ACTIVE',
                    specification: p.specification || '',
                    description: p.description || 'Chưa có bài viết mô tả sản phẩm.',
                    createdAt: formattedCreatedDate,
                    lastModifiedAt: p.lastModifiedDate ? p.lastModifiedDate.split('T')[0] : undefined,
                };
            });

            setProducts(mappedItems);
        } catch (err: any) {
            console.error('Error fetching products from API:', err);
            setError(err.message || 'Không thể tải danh sách sản phẩm từ máy chủ');
            showToast(err.message || 'Lỗi tải danh sách sản phẩm', 'error');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [currentPage, pageSize, searchQuery, filters, brands, categories, showToast]);

    // Initial load dictionary and products
    useEffect(() => {
        loadDictionaries();
    }, [loadDictionaries]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Build Filter fields dynamically with real categories and brands from Backend
    const filterFields: FilterField[] = [
        {
            name: 'categoryId',
            label: 'Danh mục',
            type: 'select',
            placeholder: 'Tất cả danh mục',
            options: [
                { label: 'Tất cả danh mục', value: '' },
                ...categories.map((c) => ({
                    label: c.name,
                    value: String(c.id),
                })),
            ],
        },
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
            name: 'productType',
            label: 'Loại sản phẩm',
            type: 'select',
            placeholder: 'Tất cả loại',
            options: [
                { label: 'Tất cả loại', value: '' },
                { label: '🧩 Linh kiện (COMPONENT)', value: 'COMPONENT' },
                { label: '💻 Laptop xách tay (LAPTOP)', value: 'LAPTOP' },
                { label: '🖥️ Máy bộ / Desktop (PC)', value: 'PC' },
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

    // Search and Filter Handlers
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleFilterChange = (newFilters: Record<string, string>) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleFilterReset = () => {
        setSearchQuery('');
        setFilters({});
        setCurrentPage(1);
        showToast('Đã đặt lại bộ lọc', 'info');
    };

    // Export to Excel / CSV with UTF-8 BOM
    const handleExportExcel = () => {
        if (products.length === 0) {
            showToast('Không có sản phẩm nào để xuất file', 'warning');
            return;
        }

        const headers = ['ID', 'Mã SKU', 'Tên sản phẩm', 'Loại', 'Thương hiệu', 'Danh mục', 'Giá bán (VNĐ)', 'Trạng thái', 'Ngày tạo'];
        const rows = products.map((p) => [
            p.numericId,
            `"${p.sku}"`,
            `"${p.name.replace(/"/g, '""')}"`,
            p.productType,
            `"${p.brand.replace(/"/g, '""')}"`,
            `"${p.category.replace(/"/g, '""')}"`,
            p.price,
            p.status,
            p.createdAt,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `danh_sach_san_pham_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Đã xuất ${products.length} sản phẩm ra file thành công`, 'success');
    };

    // Toggle Status / Stock via API
    const handleToggleStockStatus = async (p: AdminProductItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const nextStatus: BackendProductStatus = p.status === 'ACTIVE' ? 'OUT_OF_STOCK' : 'ACTIVE';
        try {
            await adminProductService.updateProductStatus(p.numericId, nextStatus);
            showToast(
                `Đã chuyển trạng thái sản phẩm "${p.name.slice(0, 30)}..." sang ${nextStatus === 'ACTIVE' ? 'Đang bán' : 'Hết hàng'}`,
                nextStatus === 'ACTIVE' ? 'success' : 'warning'
            );
            loadProducts(true);
        } catch (err: any) {
            showToast(`Cập nhật trạng thái thất bại: ${err.message}`, 'error');
        }
    };

    // Delete Product via API
    const handleDeleteProduct = async (p: AdminProductItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${p.name}" (SKU: ${p.sku}) khỏi hệ thống?`)) {
            return;
        }

        try {
            await adminProductService.deleteProduct(p.numericId);
            showToast(`Đã xóa sản phẩm "${p.name}" khỏi hệ thống thành công`, 'success');
            if (selectedProduct?.id === p.id) {
                setIsDetailModalOpen(false);
            }
            loadProducts(true);
        } catch (err: any) {
            showToast(`Xóa sản phẩm thất bại: ${err.message}`, 'error');
        }
    };

    // Open Modals
    const handleOpenDetail = (p: AdminProductItem) => {
        setSelectedProduct(p);
        setActiveDetailTab('overview');
        setIsDetailModalOpen(true);
    };

    const handleOpenEdit = (p: AdminProductItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedProduct(p);

        // If product has no specification, auto-populate template based on its category
        let spec = p.specification;
        if (!spec || !spec.trim() || spec.trim() === '[]') {
            const catName = p.category || categories.find((c) => c.id === Number(p.primaryCategoryId))?.name || '';
            spec = getSpecTemplateForCategory(catName).defaultSpecsJson;
        }

        setEditForm({ ...p, specification: spec });
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
        showToast(`Đã chọn ảnh đại diện "${file.name}". Bấm "Lưu" để tải ảnh lên ImgBB.`, 'info');
    };

    // Gallery Item Handlers (Thêm nhiều ảnh tối đa 10, xóa ảnh)
    const handleAddGalleryFiles = (files: FileList | File[], isEdit: boolean) => {
        const currentGallery = isEdit ? editGallery : addGallery;
        const availableSlots = 10 - currentGallery.length;
        if (availableSlots <= 0) {
            showToast('Đã đạt tối đa 10 ảnh sản phẩm. Vui lòng xóa bớt ảnh trước khi thêm.', 'warning');
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
                showToast(validation.error || `Tệp ${file.name} không hợp lệ`, 'error');
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
            showToast(`Đã thêm ${newItems.length} ảnh sản phẩm xem trước. Bấm "Lưu" để tải lên hệ thống.`, 'info');
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
            showToast('Đã đạt tối đa 10 ảnh sản phẩm. Vui lòng xóa bớt ảnh trước khi thêm.', 'warning');
            return;
        }

        const newItem: ProductImageItem = {
            id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url: trimmed,
        };

        if (isEdit) {
            setEditGallery((prev) => [...prev, newItem]);
        } else {
            setAddGallery((prev) => [...prev, newItem]);
        }
        showToast('Đã thêm ảnh sản phẩm từ URL thành công', 'success');
    };

    const handleRemoveGalleryItem = (id: string, isEdit: boolean) => {
        if (isEdit) {
            setEditGallery((prev) => prev.filter((item) => item.id !== id));
        } else {
            setAddGallery((prev) => prev.filter((item) => item.id !== id));
        }
    };

    // Save Edit via API
    const handleSaveEdit = async () => {
        if (!editForm) return;
        if (!editForm.name.trim()) {
            showToast('Tên sản phẩm không được để trống', 'error');
            return;
        }
        if (!editForm.sku.trim()) {
            showToast('Mã SKU không được để trống', 'error');
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
                showToast(`Tải ảnh đại diện lên ImgBB thất bại: ${err.message}`, 'error');
                setIsUploadingProductImage(false);
                setIsSubmitting(false);
                return;
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
                    return await uploadImage(item.file);
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
            showToast(`Tải ảnh sản phẩm lên ImgBB thất bại: ${err.message}`, 'error');
            setIsUploadingProductImage(false);
            setIsSubmitting(false);
            return;
        } finally {
            setIsUploadingProductImage(false);
        }

        // 3. Ghép các URL thành dạng string, ngăn cách bởi dấu ";". URL đầu sẽ là ảnh đại diện, các URL sau là ảnh sản phẩm
        const cleanedAvatarUrl = (finalAvatarUrl || '').trim() || DEFAULT_PRODUCT_IMAGE;
        const combinedImageUrl = [cleanedAvatarUrl, ...finalGalleryUrls].filter(Boolean).join(';');

        try {
            const brandIdNum = editForm.brandId ? Number(editForm.brandId) : null;
            const catIdNum = editForm.primaryCategoryId ? Number(editForm.primaryCategoryId) : null;

            await adminProductService.updateProduct(editForm.numericId, {
                name: editForm.name.trim(),
                code: editForm.sku.trim().toUpperCase(),
                slug: editForm.slug.trim() || generateSlug(editForm.name),
                price: Number(editForm.price) || 0,
                productType: editForm.productType,
                status: editForm.status,
                imageUrl: combinedImageUrl,
                brandId: brandIdNum,
                primaryCategoryId: catIdNum,
                categoryIds: catIdNum ? [catIdNum] : [],
                specification: cleanEmptySpecsForSaving(editForm.specification),
                description: editForm.description,
            });

            showToast(`Cập nhật thông tin sản phẩm "${editForm.name.slice(0, 30)}..." thành công`, 'success');
            setIsEditModalOpen(false);
            loadProducts(true);
        } catch (err: any) {
            showToast(`Cập nhật thất bại: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add Product Submit via API
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) {
            showToast('Vui lòng nhập tên sản phẩm', 'error');
            return;
        }
        if (!addForm.sku.trim()) {
            showToast('Vui lòng nhập mã SKU sản phẩm', 'error');
            return;
        }

        setIsSubmitting(true);
        let finalAvatarUrl = addForm.image;

        // 1. Upload Avatar nếu có file mới
        if (addSelectedFile) {
            setIsUploadingProductImage(true);
            try {
                finalAvatarUrl = await uploadImage(addSelectedFile);
                setAddSelectedFile(null);
            } catch (err: any) {
                showToast(`Tải ảnh đại diện lên ImgBB thất bại: ${err.message}`, 'error');
                setIsUploadingProductImage(false);
                setIsSubmitting(false);
                return;
            } finally {
                setIsUploadingProductImage(false);
            }
        }

        // 2. Upload các file ảnh sản phẩm trong gallery
        const hasPendingGalleryUploads = addGallery.some((item) => !!item.file);
        const finalGalleryUrls: string[] = [];

        if (hasPendingGalleryUploads) {
            setIsUploadingProductImage(true);
        }

        try {
            const uploadPromises = addGallery.map(async (item) => {
                if (item.file) {
                    return await uploadImage(item.file);
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
            showToast(`Tải ảnh sản phẩm lên ImgBB thất bại: ${err.message}`, 'error');
            setIsUploadingProductImage(false);
            setIsSubmitting(false);
            return;
        } finally {
            setIsUploadingProductImage(false);
        }

        // 3. Ghép các URL thành dạng string, ngăn cách bởi dấu ";". URL đầu sẽ là ảnh đại diện, các URL sau là ảnh sản phẩm
        const cleanedAvatarUrl = (finalAvatarUrl || '').trim() || DEFAULT_PRODUCT_IMAGE;
        const combinedImageUrl = [cleanedAvatarUrl, ...finalGalleryUrls].filter(Boolean).join(';');

        try {
            const finalSlug = addForm.slug.trim() || generateSlug(addForm.name);
            const brandIdNum = addForm.brandId ? Number(addForm.brandId) : null;
            const catIdNum = addForm.primaryCategoryId ? Number(addForm.primaryCategoryId) : null;

            await adminProductService.createProduct({
                name: addForm.name.trim(),
                code: addForm.sku.trim().toUpperCase(),
                slug: finalSlug,
                price: Number(addForm.price) || 0,
                productType: addForm.productType,
                status: addForm.status,
                imageUrl: combinedImageUrl,
                brandId: brandIdNum,
                primaryCategoryId: catIdNum,
                categoryIds: catIdNum ? [catIdNum] : [],
                specification: cleanEmptySpecsForSaving(addForm.specification),
                description: addForm.description,
            });

            showToast(`Đã thêm mới thành công sản phẩm "${addForm.name}"`, 'success');
            setIsAddModalOpen(false);

            // Reset Add Form & Gallery with default category specs template
            const resetCat = categories[0];
            const resetCatName = resetCat?.name || '';
            const resetProductType = detectProductTypeFromCategory(resetCatName);
            const resetSpecs = getSpecTemplateForCategory(resetCatName).defaultSpecsJson;

            setAddForm({
                name: '',
                sku: '',
                slug: '',
                brandId: brands[0]?.id || '',
                primaryCategoryId: resetCat?.id || '',
                productType: resetProductType,
                price: 1000000,
                status: 'ACTIVE',
                specification: resetSpecs,
                description: '',
                image: DEFAULT_PRODUCT_IMAGE,
            });
            setAddSelectedFile(null);
            setAddGallery([]);
            setActiveAddTab('basic');

            loadProducts(true);
        } catch (err: any) {
            showToast(`Thêm sản phẩm thất bại: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Copy Helper
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        showToast(`Đã sao chép ${label}: ${text}`, 'info');
    };

    // Product Type Badge Renderer
    const renderTypeBadge = (type: ProductType) => {
        switch (type) {
            case 'PC':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Layers className="w-3 h-3 text-indigo-500" /> PC Đồng bộ
                    </span>
                );
            case 'LAPTOP':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Laptop className="w-3 h-3 text-purple-500" /> Laptop
                    </span>
                );
            case 'COMPONENT':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        <Cpu className="w-3 h-3 text-sky-500" /> Linh kiện
                    </span>
                );
        }
    };

    // Status Badge Renderer
    const renderStatusBadge = (status: BackendProductStatus) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang bán
                    </span>
                );
            case 'OUT_OF_STOCK':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        Hết hàng
                    </span>
                );
            case 'INACTIVE':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                        <EyeOff className="w-3 h-3 text-gray-500" />
                        Đang ẩn
                    </span>
                );
        }
    };

    // Columns Configuration for AdminTable
    const columns: Column<AdminProductItem>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            render: (p) => (
                <div className="flex items-center gap-3.5 py-1 max-w-[340px]">
                    <div className="relative group shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 shadow-sm p-1 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
                            <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-contain rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                }}
                            />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            {renderTypeBadge(p.productType)}
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-mono border border-gray-200 font-semibold">
                                {p.sku}
                            </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors" title={p.name}>
                            {p.name}
                        </h4>
                    </div>
                </div>
            ),
        },
        {
            key: 'categoryBrand',
            header: 'Danh mục & Hãng',
            render: (p) => (
                <div className="space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {p.category}
                    </span>
                    <div className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span>{p.brand}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Giá bán niêm yết',
            render: (p) => (
                <div className="space-y-0.5">
                    <div className="text-sm font-bold text-rose-600">
                        {formatVND(p.price)}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (p) => (
                <div>
                    {renderStatusBadge(p.status)}
                </div>
            ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            render: (p) => (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {p.createdAt}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (p) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(p)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Xem chi tiết sản phẩm"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenEdit(p, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Chỉnh sửa sản phẩm"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleToggleStockStatus(p, e)}
                        className={`p-1.5 rounded-lg transition-colors ${p.status === 'ACTIVE'
                            ? 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                        title={p.status === 'ACTIVE' ? 'Đổi sang Hết hàng' : 'Đổi sang Đang bán'}
                    >
                        {p.status === 'ACTIVE' ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDeleteProduct(p, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa sản phẩm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Tabs for Add Modal
    const addModalTabs: ModalTab[] = [
        { id: 'basic', label: 'Thông tin cơ bản', icon: Package },
        { id: 'pricing', label: 'Giá & Trạng thái', icon: DollarSign },
        { id: 'media', label: 'Hình ảnh', icon: ImageIcon },
        { id: 'specs', label: 'Thông số kỹ thuật', icon: Cpu },
    ];

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        { id: 'overview', label: 'Tổng quan sản phẩm', icon: Package },
        { id: 'gallery', label: 'Hình ảnh', icon: ImageIcon },
        { id: 'specs', label: 'Thông số kỹ thuật', icon: Cpu },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Package className="w-7 h-7 text-blue-600" />
                        Quản lý sản phẩm & linh kiện PC
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Dữ liệu sản phẩm trực tiếp từ hệ thống API máy chủ Backend, hỗ trợ cập nhật kho và thông số
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => loadProducts(false)}
                        disabled={isLoading || isRefreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm disabled:opacity-50"
                        title="Làm mới dữ liệu từ API"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        Xuất Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const defaultCat = categories[0];
                            const defaultCatName = defaultCat?.name || '';
                            const autoProductType = detectProductTypeFromCategory(defaultCatName);
                            const defaultSpecs = getSpecTemplateForCategory(defaultCatName).defaultSpecsJson;

                            setAddForm({
                                name: '',
                                sku: `SP-${Date.now().toString(36).slice(-5).toUpperCase()}`,
                                slug: '',
                                brandId: brands[0]?.id || '',
                                primaryCategoryId: defaultCat?.id || '',
                                productType: autoProductType,
                                price: 1000000,
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm sản phẩm
                    </button>
                </div>
            </div>

            {/* Quick KPI Stats Cards */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng sản phẩm</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalElements}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang kinh doanh</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {products.filter((p) => p.status === 'ACTIVE').length}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cần nhập thêm</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {products.filter((p) => p.status === 'OUT_OF_STOCK').length}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Định giá trang này</p>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">
                            {formatVND(products.reduce((acc, curr) => acc + (curr.price || 0), 0))}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Warehouse className="w-6 h-6" />
                    </div>
                </div>
            </div> */}

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadProducts(false)}
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm kiếm linh kiện theo tên, mã SKU, slug..."
            />

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={products}
                    loading={isLoading}
                    rowKey="id"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 15, 20]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    onRowClick={(item) => handleOpenDetail(item)}
                    itemUnitName="sản phẩm"
                    emptyText="Không tìm thấy sản phẩm nào từ API phù hợp với bộ lọc hiện tại."
                />
            </div>

            {/* ========================================================================= */}
            {/* ADD PRODUCT MODAL                                                         */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title="Thêm mới sản phẩm / linh kiện máy tính"
                description="Nhập thông tin sản phẩm và lưu trực tiếp vào cơ sở dữ liệu qua API"
                size="2xl"
                tabs={addModalTabs}
                activeTab={activeAddTab}
                onTabChange={setActiveAddTab}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            type="button"
                            disabled={isSubmitting || isUploadingProductImage}
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting || isUploadingProductImage}
                            onClick={handleAddSubmit}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                        >
                            {isUploadingProductImage ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang tải ảnh lên ImgBB...
                                </>
                            ) : isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang lưu sản phẩm...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Tạo sản phẩm
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* TAB 1: THÔNG TIN CƠ BẢN */}
                    {activeAddTab === 'basic' && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tên sản phẩm <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Tên sản phẩm"
                                    value={addForm.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setAddForm((prev) => ({
                                            ...prev,
                                            name: newName,
                                            slug: generateSlug(newName),
                                        }));
                                    }}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                            </div>
                            {/* Slug */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Đường dẫn tĩnh <span className="text-rose-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setAddForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }))}
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Tạo lại slug
                                    </button>
                                </div>
                                <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                                    <span className="inline-flex items-center px-3.5 bg-gray-50 text-gray-500 text-xs font-mono border-r border-gray-200">
                                        /product/
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={addForm.slug}
                                        onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                                        className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mã SKU sản phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Mã sản phẩm"
                                        value={addForm.sku}
                                        onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono uppercase text-gray-800 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Loại sản phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={addForm.productType}
                                        onChange={(e) => setAddForm({ ...addForm, productType: e.target.value as ProductType })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="COMPONENT">Linh kiện máy tính</option>
                                        <option value="LAPTOP">Máy tính xách tay</option>
                                        <option value="PC">Máy tính để bàn / Desktop</option>
                                    </select>
                                </div>
                            </div>



                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Danh mục sản phẩm
                                    </label>
                                    <select
                                        value={addForm.primaryCategoryId}
                                        onChange={(e) => {
                                            const catId = e.target.value;
                                            const selectedCat = categories.find((c) => String(c.id) === String(catId));
                                            const catName = selectedCat?.name || '';
                                            const autoProductType = detectProductTypeFromCategory(catName);
                                            const templateInfo = getSpecTemplateForCategory(catName);
                                            const mergedSpecs = mergeSpecsWithTemplate(addForm.specification, templateInfo.items);

                                            setAddForm((prev) => ({
                                                ...prev,
                                                primaryCategoryId: catId,
                                                productType: autoProductType,
                                                specification: mergedSpecs,
                                            }));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Thương hiệu
                                    </label>
                                    <select
                                        value={addForm.brandId}
                                        onChange={(e) => setAddForm({ ...addForm, brandId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="">-- Chọn thương hiệu --</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: GIÁ & TRẠNG THÁI */}
                    {activeAddTab === 'pricing' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Giá bán niêm yết (VNĐ) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="10000"
                                            required
                                            value={addForm.price}
                                            onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) || 0 })}
                                            className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-bold text-rose-600 transition-all"
                                        />
                                        <span className="absolute right-3.5 top-2.5 text-xs text-gray-400 font-medium">VNĐ</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Hiển thị: {formatVND(addForm.price)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Trạng thái ban đầu <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={addForm.status}
                                        onChange={(e) => setAddForm({ ...addForm, status: e.target.value as BackendProductStatus })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                    >
                                        <option value="ACTIVE">✅ Đang bán (Active)</option>
                                        <option value="OUT_OF_STOCK">❌ Hết hàng (Out of Stock)</option>
                                        <option value="INACTIVE">👁️ Đang ẩn (Inactive)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Mô tả chi tiết sản phẩm
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Nhập thông tin giới thiệu, ưu điểm công nghệ, chế độ bảo hành..."
                                    value={addForm.description}
                                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 3: HÌNH ẢNH (Phần 1: Ảnh đại diện | Phần 2: Ảnh sản phẩm tối đa 10) */}
                    {activeAddTab === 'media' && (
                        <ProductMediaTab
                            avatarUrl={addForm.image}
                            avatarFile={addSelectedFile}
                            onAvatarUrlChange={(url) => {
                                setAddSelectedFile(null);
                                setAddForm((prev) => ({ ...prev, image: url }));
                            }}
                            onAvatarFileSelect={(file) => handleAvatarFileSelect(file, false)}
                            onAvatarReset={() => {
                                setAddSelectedFile(null);
                                setAddForm((prev) => ({ ...prev, image: DEFAULT_PRODUCT_IMAGE }));
                            }}
                            gallery={addGallery}
                            onAddGalleryFiles={(files) => handleAddGalleryFiles(files, false)}
                            onAddGalleryUrl={(url) => handleAddGalleryUrl(url, false)}
                            onRemoveGalleryItem={(id) => handleRemoveGalleryItem(id, false)}
                        />
                    )}

                    {/* TAB 4: THÔNG SỐ KỸ THUẬT */}
                    {activeAddTab === 'specs' && (
                        <DynamicSpecForm
                            value={addForm.specification}
                            onChange={(newSpec) => setAddForm({ ...addForm, specification: newSpec })}
                            productType={addForm.productType}
                            categoryName={categories.find((c) => String(c.id) === String(addForm.primaryCategoryId))?.name || ''}
                            availableProducts={products}
                        />
                    )}
                </div>
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT PRODUCT MODAL                                                        */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => !isSubmitting && setIsEditModalOpen(false)}
                    title={`Chỉnh sửa: ${editForm.name}`}
                    description={`ID: #${editForm.numericId} • Mã SKU: ${editForm.sku}`}
                    size="2xl"
                    tabs={addModalTabs}
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    footer={
                        <div className="flex items-center justify-end gap-3 w-full">
                            <button
                                type="button"
                                disabled={isSubmitting || isUploadingProductImage}
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting || isUploadingProductImage}
                                onClick={handleSaveEdit}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isUploadingProductImage ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang tải ảnh lên ImgBB...
                                    </>
                                ) : isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang lưu thay đổi...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* TAB 1: THÔNG TIN CƠ BẢN */}
                        {activeEditTab === 'basic' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tên sản phẩm <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Mã SKU <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.sku}
                                            onChange={(e) => setEditForm({ ...editForm, sku: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-mono uppercase text-gray-800 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Loại sản phẩm
                                        </label>
                                        <select
                                            value={editForm.productType}
                                            onChange={(e) => setEditForm({ ...editForm, productType: e.target.value as ProductType })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="COMPONENT">Linh kiện máy tính</option>
                                            <option value="LAPTOP">Máy tính xách tay</option>
                                            <option value="PC">Máy tính để bàn</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Đường dẫn tĩnh (Slug URL)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm((prev) => (prev ? { ...prev, slug: generateSlug(prev.name) } : null))}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Tạo lại từ tên
                                        </button>
                                    </div>
                                    <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                                        <span className="inline-flex items-center px-3.5 bg-gray-50 text-gray-500 text-xs font-mono border-r border-gray-200">
                                            pcstore.vn/san-pham/
                                        </span>
                                        <input
                                            type="text"
                                            value={editForm.slug}
                                            onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                            className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Danh mục
                                        </label>
                                        <select
                                            value={editForm.primaryCategoryId ?? ''}
                                            onChange={(e) => {
                                                const catId = e.target.value ? Number(e.target.value) : null;
                                                const selectedCat = categories.find((c) => c.id === catId);
                                                const catName = selectedCat?.name || '';
                                                const autoProductType = detectProductTypeFromCategory(catName);
                                                const templateInfo = getSpecTemplateForCategory(catName);

                                                setEditForm((prev) => {
                                                    if (!prev) return null;
                                                    const mergedSpecs = mergeSpecsWithTemplate(prev.specification, templateInfo.items);
                                                    return {
                                                        ...prev,
                                                        primaryCategoryId: catId,
                                                        category: catName,
                                                        productType: prev.productType === 'COMPONENT' && autoProductType !== 'COMPONENT' ? autoProductType : prev.productType,
                                                        specification: mergedSpecs,
                                                    };
                                                });
                                            }}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="">-- Chọn danh mục --</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Thương hiệu
                                        </label>
                                        <select
                                            value={editForm.brandId ?? ''}
                                            onChange={(e) => setEditForm({ ...editForm, brandId: e.target.value ? Number(e.target.value) : null })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="">-- Chọn thương hiệu --</option>
                                            {brands.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>


                            </div>
                        )}

                        {/* TAB 2: GIÁ & TRẠNG THÁI */}
                        {activeEditTab === 'pricing' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Giá bán niêm yết (VNĐ)
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.price}
                                            onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm font-bold text-rose-600 transition-all"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Hiển thị: {formatVND(editForm.price)}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Trạng thái kinh doanh
                                        </label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BackendProductStatus })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all bg-white"
                                        >
                                            <option value="ACTIVE">✅ Đang bán (Active)</option>
                                            <option value="OUT_OF_STOCK">❌ Hết hàng (Out of Stock)</option>
                                            <option value="INACTIVE">👁️ Đang ẩn (Inactive)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Mô tả chi tiết sản phẩm
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* TAB 3: HÌNH ẢNH (Phần 1: Ảnh đại diện | Phần 2: Ảnh sản phẩm tối đa 10) */}
                        {activeEditTab === 'media' && (
                            <ProductMediaTab
                                avatarUrl={editForm.image}
                                avatarFile={editSelectedFile}
                                onAvatarUrlChange={(url) => {
                                    setEditSelectedFile(null);
                                    setEditForm((prev) => (prev ? { ...prev, image: url } : null));
                                }}
                                onAvatarFileSelect={(file) => handleAvatarFileSelect(file, true)}
                                onAvatarReset={() => {
                                    setEditSelectedFile(null);
                                    setEditForm((prev) => (prev ? { ...prev, image: DEFAULT_PRODUCT_IMAGE } : null));
                                }}
                                gallery={editGallery}
                                onAddGalleryFiles={(files) => handleAddGalleryFiles(files, true)}
                                onAddGalleryUrl={(url) => handleAddGalleryUrl(url, true)}
                                onRemoveGalleryItem={(id) => handleRemoveGalleryItem(id, true)}
                            />
                        )}

                        {/* TAB 4: THÔNG SỐ KỸ THUẬT */}
                        {activeEditTab === 'specs' && (
                            <DynamicSpecForm
                                value={editForm.specification}
                                onChange={(newSpec) => setEditForm({ ...editForm, specification: newSpec })}
                                productType={editForm.productType}
                                categoryName={categories.find((c) => c.id === Number(editForm.primaryCategoryId))?.name || editForm.category || ''}
                                availableProducts={products}
                            />
                        )}
                    </div>
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL PRODUCT MODAL                                                      */}
            {/* ========================================================================= */}
            {selectedProduct && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={selectedProduct.name}
                    description={`ID: #${selectedProduct.numericId} • SKU: ${selectedProduct.sku}`}
                    size="2xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={setActiveDetailTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>Thêm vào: {selectedProduct.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedProduct);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    Chỉnh sửa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* PRODUCT HERO SUMMARY */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200">
                            <div className="w-28 h-28 rounded-2xl bg-white p-2 border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
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
                                    {renderTypeBadge(selectedProduct.productType)}
                                    <span className="font-mono text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {selectedProduct.sku}
                                    </span>
                                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
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

                        {/* TAB 1: TỔNG QUAN SẢN PHẨM */}
                        {activeDetailTab === 'overview' && (
                            <div className="space-y-5">
                                {/* Stats Matrix */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Mã ID</span>
                                        <span className="text-lg font-bold text-gray-900 mt-0.5 block">#{selectedProduct.numericId}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Danh mục</span>
                                        <span className="text-sm font-bold text-blue-600 mt-1 block truncate">{selectedProduct.category}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Thương hiệu</span>
                                        <span className="text-sm font-bold text-gray-800 mt-1 block truncate">{selectedProduct.brand}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Trạng thái</span>
                                        <span className="text-sm font-bold text-emerald-600 mt-1 block">
                                            {selectedProduct.status === 'ACTIVE'
                                                ? 'Đang bán'
                                                : selectedProduct.status === 'OUT_OF_STOCK'
                                                    ? 'Hết hàng'
                                                    : 'Đang ẩn'}
                                        </span>
                                    </div>
                                </div>

                                {/* Fast Copy Meta Identifiers */}
                                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Mã SKU:</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                {selectedProduct.sku}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedProduct.sku, 'Mã SKU')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép SKU"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {selectedProduct.slug && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-medium">Đường dẫn sản phẩm:</span>
                                            <div className="flex items-center gap-2">
                                                <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                    /san-pham/{selectedProduct.slug}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(`https://pcstore.vn/san-pham/${selectedProduct.slug}`, 'Đường dẫn sản phẩm')}
                                                    className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                    title="Sao chép Link"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Mô tả chi tiết sản phẩm
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap">
                                        {selectedProduct.description}
                                    </p>
                                </div>
                            </div>
                        )}



                        {/* TAB 3: BỘ SƯU TẬP ẢNH */}
                        {activeDetailTab === 'gallery' && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                                        Ảnh đại diện chính
                                    </h4>
                                    <div className="w-36 h-36 rounded-2xl bg-white border border-gray-200 p-2 shadow-sm flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selectedProduct.image}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Ảnh sản phẩm chi tiết ({selectedProduct.gallery.length} ảnh)
                                        </h4>
                                    </div>

                                    {selectedProduct.gallery.length === 0 ? (
                                        <div className="p-6 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-500">
                                            Chưa có thêm ảnh chi tiết nào cho sản phẩm này.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {selectedProduct.gallery.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl bg-white border border-gray-200 p-2 shadow-sm flex items-center justify-center overflow-hidden group hover:shadow-md transition-all">
                                                    <span className="absolute top-1.5 left-1.5 z-10 bg-gray-900/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                                        #{idx + 1}
                                                    </span>
                                                    <img
                                                        src={img}
                                                        alt={`Product ${idx + 1}`}
                                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
                        {activeDetailTab === 'specs' && (
                            <DynamicSpecForm
                                value={selectedProduct.specification}
                                onChange={() => { }}
                                productType={selectedProduct.productType}
                                categoryName={selectedProduct.category || categories.find((c) => c.id === Number(selectedProduct.primaryCategoryId))?.name || ''}
                                readOnly={true}
                                availableProducts={products}
                            />
                        )}
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
