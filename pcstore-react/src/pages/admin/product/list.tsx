import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeHtml } from '../../../utils/sanitize';
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
    AlertCircle,
    ChevronDown,
    Search,
    X,
    Star
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
    AdminModalFooter,
    type ModalTab,
} from '../../../components/admin/common/modal';
import { SunEditorField } from '../../../components/admin/common/SunEditorField';
import { useToast } from '../../../components/admin/common/toast';
import { DragAndDropUpload } from '../../../components/admin/common/dragAndDropUpload';
import { uploadImage, validateImageFile } from '../../../services/imgbbService';
import { adminProductService } from '../../../services/adminProductService';
import { adminCategoryService } from '../../../services/adminCategoryService';
import { adminBrandService } from '../../../services/adminBrandService';
import type { CategoryResponse } from '../../../types/adminCategory';
import type { BrandResponse } from '../../../types/adminBrand';
import type { ProductResponse, BackendProductStatus, ProductType } from '../../../types/adminProduct';
import { DynamicSpecForm } from '../../../components/admin/DynamicSpecForm';
import {
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
    categoryNames: string[];
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
        <div className="space-y-5">
            {/*ẢNH ĐẠI DIỆN*/}
            <div className="rounded-md border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-semibold text-xs tabular-nums">
                            1
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                Ảnh đại diện sản phẩm
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                                    1 ảnh
                                </span>
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                    {/* Preview Box */}
                    <div className="relative w-36 h-36 aspect-square rounded-md bg-slate-50 border border-dashed border-slate-300 p-2 flex items-center justify-center shrink-0 overflow-hidden group">
                        <img
                            src={avatarUrl || DEFAULT_PRODUCT_IMAGE}
                            alt="Ảnh đại diện"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                        />
                        {avatarUrl !== DEFAULT_PRODUCT_IMAGE && (
                            <button
                                type="button"
                                onClick={onAvatarReset}
                                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white text-slate-500 hover:text-rose-600 border border-slate-200 text-xs transition-colors cursor-pointer"
                                title="Đặt lại ảnh mẫu mặc định"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Controls with DragAndDropUpload */}
                    <div className="flex-1 w-full max-w-lg">
                        <DragAndDropUpload
                            multiple={false}
                            accept="image/*"
                            maxSizeMB={32}
                            title="Kéo thả ảnh đại diện vào đây hoặc"
                            browseText="chọn từ máy tính"
                            subtitle="PNG, JPG, WEBP, GIF · Tối đa 32 MB"
                            onFileSelect={onAvatarFileSelect}
                        />
                    </div>
                </div>
            </div>

            {/*ẢNH SẢN PHẨM */}
            <div className="rounded-md border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-semibold text-xs tabular-nums">
                            2
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                Bộ sưu tập ảnh sản phẩm
                                <span
                                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md border tabular-nums ${isGalleryFull
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                >
                                    {gallery.length} / 10 ảnh
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Hỗ trợ định dạng JPG, PNG, WebP. Tối đa 10 ảnh, mỗi ảnh dung lượng dưới 32MB
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add Gallery Controls with DragAndDropUpload */}
                {!isGalleryFull ? (
                    <div className="w-full max-w-lg">
                        <DragAndDropUpload
                            multiple={true}
                            accept="image/*"
                            maxFiles={10 - gallery.length}
                            maxSizeMB={32}
                            title="Kéo thả nhiều ảnh sản phẩm vào đây hoặc"
                            browseText="duyệt từ máy tính"
                            subtitle={`PNG, JPG, WEBP, GIF · Tối đa ${10 - gallery.length} ảnh tiếp theo (32 MB / tệp)`}
                            showFileList={false}
                            onFilesSelect={onAddGalleryFiles}
                        />
                    </div>
                ) : (
                    <div className="p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
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
                    <div className="border border-dashed border-slate-200 rounded-md p-6 text-center bg-slate-50/50 space-y-2">
                        <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-medium text-slate-600">
                            Chưa có ảnh sản phẩm nào
                        </h4>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {gallery.map((item, idx) => (
                            <div
                                key={item.id}
                                className="group relative aspect-square rounded-md bg-white border border-slate-200 p-1.5 overflow-hidden hover:border-slate-300 transition-colors flex items-center justify-center"
                            >
                                {/* Index Pill */}
                                <span className="absolute top-1.5 left-1.5 z-10 bg-slate-900/75 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
                                    #{idx + 1}
                                </span>

                                {/* Preview Badge if pending upload */}
                                {item.file && (
                                    <span
                                        className="absolute bottom-1.5 left-1.5 z-10 bg-amber-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded"
                                        title="Ảnh xem trước"
                                    >
                                        Xem trước
                                    </span>
                                )}

                                {/* Delete Button */}
                                <button
                                    type="button"
                                    onClick={() => onRemoveGalleryItem(item.id)}
                                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Xóa ảnh này"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Thumbnail Image */}
                                <img
                                    src={item.url}
                                    alt={`Ảnh sản phẩm #${idx + 1}`}
                                    className="w-full h-full object-contain rounded"
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

// =============================================================================
// CATEGORY MULTI-SELECT COMPONENT (Chọn nhiều danh mục + chỉ định danh mục chính)
// =============================================================================
interface CategoryMultiSelectProps {
    label?: React.ReactNode;
    categories: CategoryResponse[];
    selectedIds: number[];
    primaryCategoryId: number | null;
    onChange: (nextCategoryIds: number[], nextPrimaryCategoryId: number | null) => void;
    placeholder?: string;
    helperText?: string;
    disabled?: boolean;
}

function CategoryMultiSelect({
    label,
    categories,
    selectedIds,
    primaryCategoryId,
    onChange,
    placeholder = '-- Chọn một hoặc nhiều danh mục --',
    helperText,
    disabled = false,
}: CategoryMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [position, setPosition] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
        maxHeight: number;
    } | null>(null);

    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const normalizedSelectedIds = useMemo(
        () => Array.from(new Set(selectedIds.map(Number).filter((id) => !Number.isNaN(id) && id > 0))),
        [selectedIds]
    );

    const effectivePrimaryId = useMemo(() => {
        if (primaryCategoryId && normalizedSelectedIds.includes(Number(primaryCategoryId))) {
            return Number(primaryCategoryId);
        }
        return normalizedSelectedIds[0] ?? null;
    }, [primaryCategoryId, normalizedSelectedIds]);

    const filteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    const updatePosition = useCallback(() => {
        const triggerEl = triggerRef.current;
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const estimatedHeight = 280;
        const placement = spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
        const width = Math.max(rect.width, 240);
        const left = Math.min(Math.max(8, rect.left), Math.max(8, viewportWidth - width - 8));

        if (placement === 'bottom') {
            setPosition({
                top: rect.bottom + 6,
                left,
                width,
                maxHeight: Math.min(280, Math.max(150, spaceBelow - 16)),
            });
        } else {
            setPosition({
                bottom: viewportHeight - rect.top + 6,
                left,
                width,
                maxHeight: Math.min(280, Math.max(150, spaceAbove - 16)),
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            updatePosition();
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        } else {
            setPosition(null);
        }
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;
        const handleScrollOrResize = () => updatePosition();
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;
        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current &&
                !triggerRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                event.stopImmediatePropagation();
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen]);

    const handleToggleCategory = (catId: number) => {
        if (normalizedSelectedIds.includes(catId)) {
            const nextIds = normalizedSelectedIds.filter((id) => id !== catId);
            const nextPrimary = effectivePrimaryId === catId ? (nextIds[0] ?? null) : effectivePrimaryId;
            onChange(nextIds, nextPrimary);
        } else {
            const nextIds = [...normalizedSelectedIds, catId];
            const nextPrimary = effectivePrimaryId ?? catId;
            onChange(nextIds, nextPrimary);
        }
    };

    const handleSetPrimary = (catId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIds = normalizedSelectedIds.includes(catId)
            ? normalizedSelectedIds
            : [...normalizedSelectedIds, catId];
        onChange(nextIds, catId);
    };

    const handleRemoveChip = (catId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextIds = normalizedSelectedIds.filter((id) => id !== catId);
        const nextPrimary = effectivePrimaryId === catId ? (nextIds[0] ?? null) : effectivePrimaryId;
        onChange(nextIds, nextPrimary);
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([], null);
    };

    return (
        <div>
            {label && (
                <AdminLabel
                    action={
                        normalizedSelectedIds.length > 0 ? (
                            <span className="text-xs font-medium text-blue-600">
                                Đã chọn {normalizedSelectedIds.length} danh mục
                            </span>
                        ) : undefined
                    }
                >
                    {label}
                </AdminLabel>
            )}

            <div
                ref={triggerRef}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-expanded={isOpen}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsOpen((prev) => !prev);
                    }
                }}
                className={`min-h-[40px] w-full px-3 py-1.5 rounded-md border bg-white flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${disabled
                    ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    : isOpen
                        ? 'border-blue-600 ring-2 ring-blue-500/15'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
            >
                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-0.5">
                    {normalizedSelectedIds.length === 0 ? (
                        <span className="text-sm text-gray-400">{placeholder}</span>
                    ) : (
                        normalizedSelectedIds.map((catId) => {
                            const cat = categories.find((c) => c.id === catId);
                            const catName = cat?.name || `Danh mục #${catId}`;
                            const isPrimary = catId === effectivePrimaryId;

                            return (
                                <span
                                    key={catId}
                                    className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs font-medium border transition-colors ${isPrimary
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => handleSetPrimary(catId, e)}
                                        title={isPrimary ? 'Danh mục chính' : 'Đặt làm danh mục chính'}
                                        className={`p-0.5 rounded transition-colors cursor-pointer ${isPrimary
                                            ? 'text-amber-500'
                                            : 'text-slate-400 hover:text-amber-500'
                                            }`}
                                    >
                                        <Star className={`w-3 h-3 ${isPrimary ? 'fill-amber-400' : ''}`} />
                                    </button>
                                    <span className="max-w-[180px] truncate">{catName}</span>
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveChip(catId, e)}
                                            title="Bỏ chọn danh mục này"
                                            className="p-0.5 rounded hover:bg-black/10 text-current transition-colors cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </span>
                            );
                        })
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {normalizedSelectedIds.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            title="Bỏ chọn tất cả"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''
                            }`}
                    />
                </div>
            </div>

            {helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}

            {isOpen &&
                position &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={menuRef}
                        data-admin-select-portal="true"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: position.top,
                            bottom: position.bottom,
                            left: position.left,
                            width: position.width,
                            zIndex: 9999,
                        }}
                        className="bg-white border border-slate-200 rounded-md shadow-md overflow-hidden flex flex-col"
                    >
                        {/* Search bar */}
                        <div className="p-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
                            <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm danh mục..."
                                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            searchInputRef.current?.focus();
                                        }}
                                        className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Options list */}
                        <div
                            style={{ maxHeight: Math.max(110, position.maxHeight - 88) }}
                            className="overflow-y-auto p-1.5 space-y-0.5"
                        >
                            {filteredCategories.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400">
                                    Không tìm thấy danh mục phù hợp
                                </div>
                            ) : (
                                filteredCategories.map((cat) => {
                                    const isSelected = normalizedSelectedIds.includes(cat.id);
                                    const isPrimary = cat.id === effectivePrimaryId;

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => handleToggleCategory(cat.id)}
                                            className={`w-full px-2.5 py-2 rounded-md flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${isSelected
                                                ? 'bg-blue-50/90 text-blue-700 font-semibold'
                                                : 'text-slate-700 font-medium hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <span
                                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'border-slate-300 bg-white'
                                                        }`}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                                                </span>
                                                <span className="truncate">{cat.name}</span>
                                            </div>

                                            {isSelected && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleSetPrimary(cat.id, e)}
                                                    title={isPrimary ? 'Đang là danh mục chính' : 'Đặt làm danh mục chính'}
                                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 transition-colors cursor-pointer ${isPrimary
                                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600'
                                                        }`}
                                                >
                                                    <Star className={`w-2.5 h-2.5 ${isPrimary ? 'fill-amber-500 text-amber-500' : ''}`} />
                                                    {isPrimary ? 'Chính' : 'Đặt chính'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-2.5 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] shrink-0">
                            <span className="text-slate-500">
                                {normalizedSelectedIds.length > 0
                                    ? `Đã chọn ${normalizedSelectedIds.length} danh mục`
                                    : 'Chưa chọn danh mục'}
                            </span>
                            <div className="flex items-center gap-2">
                                {normalizedSelectedIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearAll}
                                        className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                                    >
                                        Bỏ chọn hết
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                                >
                                    Xong
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
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
        categoryIds: [] as number[],
        primaryCategoryId: null as number | null,
        productType: 'OTHER' as ProductType,
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

                // Resolve Category Names (multi-category)
                const rawCategoryIds = Array.isArray(p.categoryIds)
                    ? Array.from(new Set(p.categoryIds.map(Number).filter((id) => !Number.isNaN(id) && id > 0)))
                    : [];
                const resolvedPrimaryCatId =
                    p.primaryCategoryId !== undefined && p.primaryCategoryId !== null
                        ? Number(p.primaryCategoryId)
                        : (rawCategoryIds[0] ?? null);
                const normalizedCategoryIds =
                    resolvedPrimaryCatId !== null && !rawCategoryIds.includes(resolvedPrimaryCatId)
                        ? [resolvedPrimaryCatId, ...rawCategoryIds]
                        : rawCategoryIds;
                const categoryNames = normalizedCategoryIds.map((id) => {
                    const matched = categories.find((c) => c.id === id);
                    return matched?.name || `Danh mục #${id}`;
                });
                const matchedPrimaryCat = categories.find((c) => c.id === resolvedPrimaryCatId);
                const categoryName =
                    matchedPrimaryCat?.name ||
                    categoryNames[0] ||
                    (resolvedPrimaryCatId ? `Danh mục #${resolvedPrimaryCatId}` : 'Chưa phân loại');

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
                    categoryIds: normalizedCategoryIds,
                    primaryCategoryId: resolvedPrimaryCatId,
                    category: categoryName,
                    categoryNames,
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
                { label: 'Linh kiện (COMPONENT)', value: 'COMPONENT' },
                { label: 'Laptop (LAPTOP)', value: 'LAPTOP' },
                { label: 'Máy bộ / Desktop (PC)', value: 'PC' },
                { label: 'Khác (OTHER)', value: 'OTHER' },
            ],
        },
        {
            name: 'status',
            label: 'Trạng thái kinh doanh',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang bán', value: 'ACTIVE' },
                { label: 'Hết hàng', value: 'OUT_OF_STOCK' },
                { label: 'Đang ẩn', value: 'INACTIVE' },
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
            `"${(p.categoryNames && p.categoryNames.length > 0 ? p.categoryNames.join(', ') : p.category).replace(/"/g, '""')}"`,
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

        const normalizedEditCatIds = Array.from(
            new Set(
                [
                    ...(p.categoryIds || []),
                    ...(p.primaryCategoryId ? [Number(p.primaryCategoryId)] : []),
                ]
                    .map(Number)
                    .filter((id) => !Number.isNaN(id) && id > 0)
            )
        );
        const normalizedEditPrimaryId =
            p.primaryCategoryId && normalizedEditCatIds.includes(Number(p.primaryCategoryId))
                ? Number(p.primaryCategoryId)
                : (normalizedEditCatIds[0] ?? null);

        setEditForm({
            ...p,
            categoryIds: normalizedEditCatIds,
            primaryCategoryId: normalizedEditPrimaryId,
            specification: spec,
        });
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
        showToast(`Đã chọn ảnh đại diện "${file.name}".`, 'info');
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
            showToast(`Đã thêm ${newItems.length} ảnh sản phẩm xem trước.`, 'info');
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
                showToast(`Tải ảnh đại diện lên thất bại: ${err.message}`, 'error');
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
            showToast(`Tải ảnh sản phẩm lên thất bại: ${err.message}`, 'error');
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
            const selectedCatIds = Array.from(
                new Set((editForm.categoryIds || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))
            );
            const primaryCatIdNum =
                editForm.primaryCategoryId && selectedCatIds.includes(Number(editForm.primaryCategoryId))
                    ? Number(editForm.primaryCategoryId)
                    : (selectedCatIds[0] ?? null);

            await adminProductService.updateProduct(editForm.numericId, {
                name: editForm.name.trim(),
                code: editForm.sku.trim().toUpperCase(),
                slug: editForm.slug.trim() || generateSlug(editForm.name),
                price: Number(editForm.price) || 0,
                productType: editForm.productType,
                status: editForm.status,
                imageUrl: combinedImageUrl,
                brandId: brandIdNum,
                primaryCategoryId: primaryCatIdNum,
                categoryIds: selectedCatIds,
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
                showToast(`Tải ảnh đại diện lên thất bại: ${err.message}`, 'error');
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
            showToast(`Tải ảnh sản phẩm lên thất bại: ${err.message}`, 'error');
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
            const selectedCatIds = Array.from(
                new Set((addForm.categoryIds || []).map(Number).filter((id) => !Number.isNaN(id) && id > 0))
            );
            const primaryCatIdNum =
                addForm.primaryCategoryId && selectedCatIds.includes(Number(addForm.primaryCategoryId))
                    ? Number(addForm.primaryCategoryId)
                    : (selectedCatIds[0] ?? null);

            await adminProductService.createProduct({
                name: addForm.name.trim(),
                code: addForm.sku.trim().toUpperCase(),
                slug: finalSlug,
                price: Number(addForm.price) || 0,
                productType: 'OTHER',
                status: addForm.status,
                imageUrl: combinedImageUrl,
                brandId: brandIdNum,
                primaryCategoryId: primaryCatIdNum,
                categoryIds: selectedCatIds,
                specification: cleanEmptySpecsForSaving(addForm.specification),
                description: addForm.description,
            });

            showToast(`Đã thêm mới thành công sản phẩm "${addForm.name}"`, 'success');
            setIsAddModalOpen(false);

            // Reset Add Form & Gallery with default category specs template
            const resetCat = categories[0];
            const resetCatName = resetCat?.name || '';
            const resetSpecs = getSpecTemplateForCategory(resetCatName).defaultSpecsJson;

            setAddForm({
                name: '',
                sku: '',
                slug: '',
                brandId: brands[0]?.id || '',
                categoryIds: resetCat ? [resetCat.id] : [],
                primaryCategoryId: resetCat?.id ?? null,
                productType: 'OTHER',
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

    // Product Type Badge Renderer (Restrained neutral chip)
    const renderTypeBadge = (type: ProductType) => {
        switch (type) {
            case 'PC':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                        <Layers className="w-3 h-3 text-slate-500" /> PC Đồng bộ
                    </span>
                );
            case 'LAPTOP':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                        <Laptop className="w-3 h-3 text-slate-500" /> Laptop
                    </span>
                );
            case 'OTHER':
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                        <Package className="w-3 h-3 text-slate-500" /> Khác
                    </span>
                );
            case 'COMPONENT':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
                        <Cpu className="w-3 h-3 text-slate-500" /> Linh kiện
                    </span>
                );
        }
    };

    // Status Indicator Renderer (Restrained dot + neutral text)
    const renderStatusBadge = (status: BackendProductStatus) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Đang bán
                    </span>
                );
            case 'OUT_OF_STOCK':
                return (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        Hết hàng
                    </span>
                );
            case 'INACTIVE':
            default:
                return (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        Ngừng kinh doanh
                    </span>
                );
        }
    };

    // Columns Configuration for AdminTable
    const columns: Column<AdminProductItem>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            align: 'left',
            render: (p) => (
                <div className="flex items-center gap-3 max-w-[360px]">
                    <div className="w-10 h-10 aspect-square rounded-md bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-[13px] leading-snug line-clamp-1" title={p.name}>
                            {p.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono tabular-nums text-[11px] text-slate-500">
                                {p.sku}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] text-slate-500">
                                {p.productType === 'PC'
                                    ? 'PC Đồng bộ'
                                    : p.productType === 'LAPTOP'
                                        ? 'Laptop'
                                        : p.productType === 'OTHER'
                                            ? 'Khác'
                                            : 'Linh kiện'}
                            </span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'categoryBrand',
            header: 'Danh mục & Hãng',
            align: 'left',
            render: (p) => {
                const displayCategories =
                    p.categoryNames && p.categoryNames.length > 0 ? p.categoryNames : [p.category];
                const visibleCategories = displayCategories.slice(0, 2);
                const hiddenCount = displayCategories.length - visibleCategories.length;

                return (
                    <div className="space-y-1 max-w-[220px]">
                        <div className="flex flex-wrap items-center gap-1" title={displayCategories.join(', ')}>
                            {visibleCategories.map((catName, idx) => (
                                <span
                                    key={`${p.id}-cat-${idx}`}
                                    className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-[140px]"
                                >
                                    {catName}
                                </span>
                            ))}
                            {hiddenCount > 0 && (
                                <span className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                                    +{hiddenCount}
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                            {p.brand}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'price',
            header: 'Giá bán',
            align: 'right',
            render: (p) => (
                <span className="text-[13px] font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {formatVND(p.price)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'left',
            render: (p) => renderStatusBadge(p.status),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            align: 'right',
            render: (p) => (
                <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {p.createdAt}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (p) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(p)}
                    viewLabel="Xem chi tiết sản phẩm"
                    onEdit={(e) => handleOpenEdit(p, e)}
                    editLabel="Chỉnh sửa sản phẩm"
                    moreActions={[
                        {
                            key: 'toggle-stock',
                            label: p.status === 'ACTIVE' ? 'Đổi sang Hết hàng' : 'Đổi sang Đang bán',
                            description:
                                p.status === 'ACTIVE'
                                    ? 'Tạm ngừng nhận đặt mua'
                                    : 'Mở bán lại sản phẩm này',
                            icon: p.status === 'ACTIVE' ? EyeOff : CheckCircle2,
                            variant: p.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: (e) => handleToggleStockStatus(p, e),
                        },
                    ]}
                    onDelete={(e) => handleDeleteProduct(p, e)}
                    deleteLabel="Xóa sản phẩm"
                    deleteDescription="Xóa sản phẩm khỏi danh mục"
                />
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

    const handleOpenAddModal = () => {
        const defaultCat = categories[0];
        const defaultCatName = defaultCat?.name || '';
        const defaultSpecs = getSpecTemplateForCategory(defaultCatName).defaultSpecsJson;

        setAddForm({
            name: '',
            sku: `SP-${Date.now().toString(36).slice(-5).toUpperCase()}`,
            slug: '',
            brandId: brands[0]?.id || '',
            categoryIds: defaultCat ? [defaultCat.id] : [],
            primaryCategoryId: defaultCat?.id ?? null,
            productType: 'OTHER',
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
    };

    return (
        <div className="space-y-4">
            {/* Compact Page Header (Borderless, No Card-in-Card) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-baseline gap-2.5 min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight truncate">
                        Quản lý sản phẩm
                    </h1>
                    <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                        {totalElements} sản phẩm
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => loadProducts(false)}
                        disabled={isLoading || isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Làm mới dữ liệu từ API"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        Xuất Excel
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-xs font-medium truncate">{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadProducts(false)}
                        className="px-2.5 py-1 text-xs font-medium bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Unified Toolbar: Search + Filter (Category, Brand, Type, Status) + Add Product */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                values={filters}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm sản phẩm theo tên, mã SKU, slug..."
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold border border-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm sản phẩm
                    </button>
                }
            />

            {/* Products Table (Single Border-First Frame, No Nested Card) */}
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
                emptyText="Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại."
            />

            {/* ========================================================================= */}
            {/* ADD PRODUCT MODAL                                                         */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title="Thêm mới sản phẩm"
                description=""
                size="2xl"
                tabs={addModalTabs}
                activeTab={activeAddTab}
                onTabChange={setActiveAddTab}
                footer={
                    <AdminModalFooter
                        onCancel={() => setIsAddModalOpen(false)}
                        onSubmit={handleAddSubmit}
                        isSubmitting={isSubmitting || isUploadingProductImage}
                        submittingText={isUploadingProductImage ? "Đang tải ảnh lên..." : "Đang lưu sản phẩm..."}
                        submitText="Lưu"

                    />
                }
            >
                <div className="space-y-6">
                    {/* TAB 1: THÔNG TIN CƠ BẢN */}
                    {activeAddTab === 'basic' && (
                        <div className="space-y-5">
                            <AdminInput
                                label="Tên sản phẩm"
                                required
                                placeholder="Nhập tên sản phẩm..."
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

                            {/* Slug */}
                            <AdminInput
                                label="Đường dẫn tĩnh"
                                required
                                action={
                                    <AdminButton
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setAddForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }))}
                                        icon={RefreshCw}
                                    >
                                        Tạo lại slug
                                    </AdminButton>
                                }
                                prefixText="/product/"
                                value={addForm.slug}
                                onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                                className="font-mono"
                            />

                            <AdminInput
                                label="Mã SKU sản phẩm"
                                required
                                placeholder="Mã sản phẩm"
                                value={addForm.sku}
                                onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                                className="font-mono uppercase"
                            />

                            <div className="space-y-4">
                                <CategoryMultiSelect
                                    label="Danh mục sản phẩm"
                                    categories={categories}
                                    selectedIds={addForm.categoryIds}
                                    primaryCategoryId={addForm.primaryCategoryId}
                                    helperText="Có thể chọn nhiều danh mục cho 1 sản phẩm. Nhấn biểu tượng ngôi sao (★) để chọn danh mục chính."
                                    onChange={(nextIds, nextPrimaryId) => {
                                        const primaryCat = categories.find((c) => c.id === nextPrimaryId);
                                        const catName = primaryCat?.name || '';
                                        setAddForm((prev) => {
                                            const mergedSpecs =
                                                nextPrimaryId !== prev.primaryCategoryId && catName
                                                    ? mergeSpecsWithTemplate(
                                                        prev.specification,
                                                        getSpecTemplateForCategory(catName).items
                                                    )
                                                    : prev.specification;
                                            return {
                                                ...prev,
                                                categoryIds: nextIds,
                                                primaryCategoryId: nextPrimaryId,
                                                specification: mergedSpecs,
                                            };
                                        });
                                    }}
                                />

                                <AdminSelect
                                    label="Thương hiệu"
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
                    )}

                    {/* TAB 2: GIÁ & TRẠNG THÁI */}
                    {activeAddTab === 'pricing' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AdminInput
                                    label="Giá bán niêm yết (VNĐ)"
                                    required
                                    type="number"
                                    min="0"
                                    step="10000"
                                    suffixText="VNĐ"
                                    value={addForm.price}
                                    onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) || 0 })}
                                    helperText={`Hiển thị: ${formatVND(addForm.price)}`}
                                    inputClassName="font-semibold text-slate-900 tabular-nums"
                                />

                                <AdminSelect
                                    label="Trạng thái ban đầu"
                                    required
                                    value={addForm.status}
                                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value as BackendProductStatus })}
                                >
                                    <option value="ACTIVE">Đang bán</option>
                                    <option value="OUT_OF_STOCK">Hết hàng</option>
                                    <option value="INACTIVE">Đang ẩn</option>
                                </AdminSelect>
                            </div>

                            <SunEditorField
                                label="Mô tả chi tiết sản phẩm"
                                placeholder="Nhập thông tin giới thiệu, ưu điểm công nghệ, chế độ bảo hành..."
                                value={addForm.description}
                                onChange={(html) => setAddForm((prev) => ({ ...prev, description: html }))}
                            />
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
                        <AdminModalFooter
                            onCancel={() => setIsEditModalOpen(false)}
                            onSubmit={handleSaveEdit}
                            isSubmitting={isSubmitting || isUploadingProductImage}
                            submittingText={isUploadingProductImage ? "Đang tải ảnh lên..." : "Đang lưu thay đổi..."}
                            submitText="Lưu thay đổi"
                            submitIcon={Check}
                        />
                    }
                >
                    <div className="space-y-6">
                        {/* TAB 1: THÔNG TIN CƠ BẢN */}
                        {activeEditTab === 'basic' && (
                            <div className="space-y-5">
                                <AdminInput
                                    label="Tên sản phẩm"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />

                                <AdminInput
                                    label="Mã SKU"
                                    required
                                    value={editForm.sku}
                                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value.toUpperCase() })}
                                    className="font-mono uppercase"
                                />

                                <AdminInput
                                    label="Đường dẫn tĩnh (Slug URL)"
                                    action={
                                        <AdminButton
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setEditForm((prev) => (prev ? { ...prev, slug: generateSlug(prev.name) } : null))}
                                            icon={RefreshCw}
                                        >
                                            Tạo lại từ tên
                                        </AdminButton>
                                    }
                                    prefixText="pcstore.vn/san-pham/"
                                    value={editForm.slug}
                                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                    className="font-mono"
                                />

                                <div className="space-y-4">
                                    <CategoryMultiSelect
                                        label="Danh mục sản phẩm"
                                        categories={categories}
                                        selectedIds={editForm.categoryIds || []}
                                        primaryCategoryId={editForm.primaryCategoryId ?? null}
                                        helperText="Có thể chọn nhiều danh mục cho 1 sản phẩm. Nhấn biểu tượng ngôi sao (★) để chọn danh mục chính."
                                        onChange={(nextIds, nextPrimaryId) => {
                                            const primaryCat = categories.find((c) => c.id === nextPrimaryId);
                                            const catName = primaryCat?.name || '';
                                            const catNames = nextIds.map(
                                                (id) => categories.find((c) => c.id === id)?.name || `Danh mục #${id}`
                                            );

                                            setEditForm((prev) => {
                                                if (!prev) return null;
                                                const mergedSpecs =
                                                    nextPrimaryId !== prev.primaryCategoryId && catName
                                                        ? mergeSpecsWithTemplate(
                                                            prev.specification,
                                                            getSpecTemplateForCategory(catName).items
                                                        )
                                                        : prev.specification;
                                                return {
                                                    ...prev,
                                                    categoryIds: nextIds,
                                                    primaryCategoryId: nextPrimaryId,
                                                    category: catName || 'Chưa phân loại',
                                                    categoryNames: catNames,
                                                    specification: mergedSpecs,
                                                };
                                            });
                                        }}
                                    />

                                    <AdminSelect
                                        label="Thương hiệu"
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
                        )}

                        {/* TAB 2: GIÁ & TRẠNG THÁI */}
                        {activeEditTab === 'pricing' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <AdminInput
                                        label="Giá bán niêm yết (VNĐ)"
                                        type="number"
                                        suffixText="VNĐ"
                                        value={editForm.price}
                                        onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) || 0 })}
                                        helperText={`Hiển thị: ${formatVND(editForm.price)}`}
                                        inputClassName="font-semibold text-slate-900 tabular-nums"
                                    />

                                    <AdminSelect
                                        label="Trạng thái kinh doanh"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as BackendProductStatus })}
                                    >
                                        <option value="ACTIVE">Đang bán</option>
                                        <option value="OUT_OF_STOCK">Hết hàng</option>
                                        <option value="INACTIVE">Ngừng kinh doanh</option>
                                    </AdminSelect>
                                </div>

                                <SunEditorField
                                    label="Mô tả chi tiết sản phẩm"
                                    placeholder="Nhập thông tin giới thiệu, ưu điểm công nghệ, chế độ bảo hành..."
                                    value={editForm.description}
                                    onChange={(html) => setEditForm((prev) => (prev ? { ...prev, description: html } : null))}
                                />
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
                                <AdminButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedProduct);
                                    }}
                                    icon={Edit}
                                >
                                    Chỉnh sửa
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
                    <div className="space-y-5">
                        {/* PRODUCT HERO SUMMARY */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-md bg-slate-50/70 border border-slate-200">
                            <div className="w-24 h-24 aspect-square rounded-md bg-white p-1.5 border border-slate-200 flex items-center justify-center shrink-0">
                                <img
                                    src={selectedProduct.image}
                                    alt={selectedProduct.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = DEFAULT_PRODUCT_IMAGE;
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5 text-center sm:text-left min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    {renderTypeBadge(selectedProduct.productType)}
                                    <span className="font-mono tabular-nums text-xs font-medium text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                        {selectedProduct.sku}
                                    </span>
                                    <span className="text-xs text-slate-600 font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                        {selectedProduct.brand}
                                    </span>
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 leading-snug">
                                    {selectedProduct.name}
                                </h3>
                                <div className="flex items-baseline gap-2.5 justify-center sm:justify-start">
                                    <span className="text-lg font-semibold text-slate-900 tabular-nums">
                                        {formatVND(selectedProduct.price)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* TAB 1: TỔNG QUAN SẢN PHẨM */}
                        {activeDetailTab === 'overview' && (
                            <div className="space-y-4">
                                {/* Stats Matrix */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200">
                                        <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Mã ID</span>
                                        <span className="text-sm font-semibold text-slate-900 mt-1 block tabular-nums">#{selectedProduct.numericId}</span>
                                    </div>
                                    <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200">
                                        <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">
                                            Danh mục {selectedProduct.categoryNames.length > 1 ? `(${selectedProduct.categoryNames.length})` : ''}
                                        </span>
                                        <span
                                            className="text-sm font-semibold text-slate-900 mt-1 block truncate"
                                            title={selectedProduct.categoryNames.join(', ') || selectedProduct.category}
                                        >
                                            {selectedProduct.category}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200">
                                        <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Thương hiệu</span>
                                        <span className="text-sm font-semibold text-slate-900 mt-1 block truncate">{selectedProduct.brand}</span>
                                    </div>
                                    <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200">
                                        <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Trạng thái</span>
                                        <div className="mt-1">
                                            {renderStatusBadge(selectedProduct.status)}
                                        </div>
                                    </div>
                                </div>

                                {/* Multi-category list */}
                                {selectedProduct.categoryNames && selectedProduct.categoryNames.length > 0 && (
                                    <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200">
                                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                                            Danh sách danh mục ({selectedProduct.categoryNames.length})
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {(selectedProduct.categoryIds || []).map((catId, idx) => {
                                                const catName = selectedProduct.categoryNames[idx] || `Danh mục #${catId}`;
                                                const isPrimary = catId === selectedProduct.primaryCategoryId;
                                                return (
                                                    <span
                                                        key={catId}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${isPrimary
                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-white text-slate-700 border-slate-200'
                                                            }`}
                                                    >
                                                        {isPrimary && (
                                                            <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                                                        )}
                                                        <span>{catName}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Fast Copy Meta Identifiers */}
                                <div className="bg-slate-50/70 p-3.5 rounded-md border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Mã SKU:</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono tabular-nums text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                {selectedProduct.sku}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedProduct.sku, 'Mã SKU')}
                                                className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                                title="Sao chép SKU"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {selectedProduct.slug && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Đường dẫn sản phẩm:</span>
                                            <div className="flex items-center gap-2">
                                                <code className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                    /san-pham/{selectedProduct.slug}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(`https://pcstore.vn/san-pham/${selectedProduct.slug}`, 'Đường dẫn sản phẩm')}
                                                    className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
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
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Mô tả chi tiết sản phẩm
                                    </h4>
                                    {selectedProduct.description && selectedProduct.description.trim() ? (
                                        /<[a-z][\s\S]*>/i.test(selectedProduct.description) ? (
                                            <div
                                                className="sun-editor-editable text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-md border border-slate-200"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedProduct.description) }}
                                            />
                                        ) : (
                                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-md border border-slate-200 whitespace-pre-wrap">
                                                {selectedProduct.description}
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-sm text-slate-400 italic bg-slate-50/70 p-4 rounded-md border border-slate-200">
                                            Chưa có mô tả chi tiết cho sản phẩm này.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}



                        {/* TAB 3: BỘ SƯU TẬP ẢNH */}
                        {activeDetailTab === 'gallery' && (
                            <div className="space-y-5">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Ảnh đại diện chính
                                    </h4>
                                    <div className="w-32 h-32 aspect-square rounded-md bg-white border border-slate-200 p-2 flex items-center justify-center overflow-hidden">
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
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider tabular-nums">
                                            Ảnh sản phẩm chi tiết ({selectedProduct.gallery.length} ảnh)
                                        </h4>
                                    </div>

                                    {selectedProduct.gallery.length === 0 ? (
                                        <div className="p-5 text-center rounded-md bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                                            Chưa có thêm ảnh chi tiết nào cho sản phẩm này.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {selectedProduct.gallery.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-md bg-white border border-slate-200 p-1.5 flex items-center justify-center overflow-hidden">
                                                    <span className="absolute top-1.5 left-1.5 z-10 bg-slate-900/75 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums">
                                                        #{idx + 1}
                                                    </span>
                                                    <img
                                                        src={img}
                                                        alt={`Product ${idx + 1}`}
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
