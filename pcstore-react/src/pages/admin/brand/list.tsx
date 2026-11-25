import React, { useState, useEffect, useCallback } from 'react';
import {
    Award,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle2,
    Download,
    Calendar,
    Check,
    Package,
    Copy,
    RefreshCw,
    FolderTree,
    Layers,
    AlertCircle,
    Loader2,
    Building2,
    Tag,
    Clock,
    User
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
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminBrandService } from '../../../services/adminBrandService';
import { adminCategoryService } from '../../../services/adminCategoryService';
import type {
    BrandResponse,
    BrandCreateRequest,
    BrandUpdateRequest
} from '../../../types/adminBrand';

export interface BrandItem {
    id: string;
    numericId: number;
    name: string;
    slug: string;
    description: string;
    status: 'ACTIVE' | 'HIDDEN';
    statusNumber: number; // 1 = ACTIVE, 0 = INACTIVE
    productsCount: number; // Số lượng sản phẩm thuộc thương hiệu
    categoriesCount: number; // Số danh mục sản phẩm thương hiệu bán
    categoryNames: string[]; // Tên các danh mục sản phẩm thương hiệu bán
    createdAt: string;
    createdDateRaw?: string | null;
    createdBy?: number | null;
    lastModifiedDate?: string | null;
    lastModifiedBy?: number | null;
    isDeleted?: boolean | number;
}

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

// Backend Brand Response Mapper
export const mapBackendBrandToItem = (b: BrandResponse): BrandItem => {
    let formattedDate = 'Chưa cập nhật';
    if (b.createdDate) {
        try {
            formattedDate = new Date(b.createdDate).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            formattedDate = b.createdDate.split('T')[0] || 'Chưa cập nhật';
        }
    }

    let formattedModifiedDate = 'Chưa cập nhật';
    if (b.lastModifiedDate) {
        try {
            formattedModifiedDate = new Date(b.lastModifiedDate).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            formattedModifiedDate = b.lastModifiedDate.split('T')[0] || 'Chưa cập nhật';
        }
    }

    return {
        id: String(b.id),
        numericId: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description || 'Chưa có thông tin mô tả chi tiết cho thương hiệu này.',
        status: b.status === 1 ? 'ACTIVE' : 'HIDDEN',
        statusNumber: b.status,
        productsCount: 0,
        categoriesCount: 0,
        categoryNames: [],
        createdAt: formattedDate,
        createdDateRaw: b.createdDate,
        createdBy: b.createdBy,
        lastModifiedDate: formattedModifiedDate,
        lastModifiedBy: b.lastModifiedBy,
        isDeleted: b.isDeleted,
    };
};

export default function BrandList() {
    const { toast } = useToast();

    // Data State
    const [brands, setBrands] = useState<BrandItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Search, Filters & Pagination State
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
    const [selectedBrand, setSelectedBrand] = useState<BrandItem | null>(null);

    // Confirmation Modals
    const [deleteTargetBrand, setDeleteTargetBrand] = useState<BrandItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [statusTargetBrand, setStatusTargetBrand] = useState<BrandItem | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Products in brand detail tab
    const [brandProducts, setBrandProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

    // Detail Modal Active Tab
    const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'products'>('info');

    // Add Form State (Chỉ gồm các trường thực tế trong Database)
    const [addForm, setAddForm] = useState({
        name: '',
        slug: '',
        description: '',
        status: 'ACTIVE' as 'ACTIVE' | 'HIDDEN',
    });

    // Edit Form State (Chỉ gồm các trường thực tế trong Database)
    const [editForm, setEditForm] = useState<{
        id: string;
        numericId: number;
        name: string;
        slug: string;
        description: string;
        status: 'ACTIVE' | 'HIDDEN';
    } | null>(null);

    // Load Categories dictionary to map categoryId -> categoryName
    const loadCategoryMap = useCallback(async (): Promise<Record<number, string>> => {
        try {
            const res = await adminCategoryService.getAllCategories({ page: 0, size: 100 });
            const map: Record<number, string> = {};
            (res.content || []).forEach((c) => {
                map[c.id] = c.name;
            });
            return map;
        } catch (err) {
            console.warn('Could not load categories map:', err);
            return {};
        }
    }, []);

    // Load Brands from Backend API
    const loadBrands = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError(null);

        try {
            const catMap = await loadCategoryMap();

            let statusParam: number | string | undefined = undefined;
            if (filters.status === 'ACTIVE') {
                statusParam = 1;
            } else if (filters.status === 'HIDDEN') {
                statusParam = 0;
            }

            const pageIndex = Math.max(0, currentPage - 1);
            const response = await adminBrandService.getAllBrands({
                keyword: searchQuery.trim() || undefined,
                status: statusParam,
                page: pageIndex,
                size: pageSize,
                sort: ['id,DESC'],
            });

            let items = (response.content || []).map(mapBackendBrandToItem);

            // Fetch product counts and distinct categories count for each brand
            try {
                items = await Promise.all(
                    items.map(async (item) => {
                        try {
                            const prodRes = await adminBrandService.getProductsByBrand(item.numericId, 0, 100);
                            const products = prodRes?.content || [];
                            const totalProducts = prodRes?.totalElements ?? products.length ?? 0;

                            const categoryIdSet = new Set<number>();
                            products.forEach((p: any) => {
                                if (Array.isArray(p.categoryIds)) {
                                    p.categoryIds.forEach((cid: number) => categoryIdSet.add(cid));
                                }
                                if (p.primaryCategoryId) {
                                    categoryIdSet.add(p.primaryCategoryId);
                                }
                                if (p.categoryId) {
                                    categoryIdSet.add(p.categoryId);
                                }
                            });

                            const categoryNames = Array.from(categoryIdSet).map(
                                (cid) => catMap[cid] || `Danh mục #${cid}`
                            );

                            return {
                                ...item,
                                productsCount: totalProducts,
                                categoriesCount: categoryIdSet.size,
                                categoryNames,
                            };
                        } catch {
                            return item;
                        }
                    })
                );
            } catch {
                // Ignore count fetch errors
            }

            setBrands(items);
            setTotalElements(response.totalElements || items.length);
            setTotalPages(Math.max(1, response.totalPages || 1));
        } catch (err: any) {
            console.error('Error fetching brands:', err);
            setError(err.message || 'Không thể tải danh sách thương hiệu từ máy chủ.');
            toast.error(err.message || 'Không thể tải danh sách thương hiệu từ máy chủ.', 'Lỗi tải dữ liệu');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [currentPage, pageSize, searchQuery, filters.status, loadCategoryMap, toast]);

    // Initial load
    useEffect(() => {
        loadBrands();
    }, [loadBrands]);

    // Load brand products when detail modal opens
    useEffect(() => {
        if (isDetailModalOpen && selectedBrand) {
            setIsLoadingProducts(true);
            adminBrandService
                .getProductsByBrand(selectedBrand.numericId, 0, 50)
                .then((res) => {
                    const list = res?.content || [];
                    setBrandProducts(list);
                })
                .catch(() => {
                    setBrandProducts([]);
                })
                .finally(() => {
                    setIsLoadingProducts(false);
                });
        } else {
            setBrandProducts([]);
        }
    }, [isDetailModalOpen, selectedBrand?.id, selectedBrand?.numericId]);

    // Filter fields for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Trạng thái hiển thị',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Hiển thị', value: 'ACTIVE' },
                { label: 'Ẩn', value: 'HIDDEN' },
            ],
        },
    ];

    // Handlers
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
        toast.info('Đã xóa toàn bộ bộ lọc thương hiệu', 'Đặt lại bộ lọc');
    };

    // Export CSV / Excel
    const handleExportExcel = () => {
        if (brands.length === 0) {
            toast.warning('Không có dữ liệu thương hiệu để xuất file.', 'Cảnh báo');
            return;
        }

        const headers = [
            'ID',
            'Tên thương hiệu',
            'Slug',
            'Mô tả',
            'Số lượng sản phẩm',
            'Số danh mục bán',
            'Danh mục sản phẩm',
            'Trạng thái',
            'Ngày tạo'
        ];
        const rows = brands.map((b) => [
            b.id,
            `"${(b.name || '').replace(/"/g, '""')}"`,
            `"${(b.slug || '').replace(/"/g, '""')}"`,
            `"${(b.description || '').replace(/"/g, '""')}"`,
            b.productsCount,
            b.categoriesCount,
            `"${b.categoryNames.join(', ').replace(/"/g, '""')}"`,
            b.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang ẩn',
            b.createdAt,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `danh_sach_thuong_hieu_pcstore_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Đã xuất thành công danh sách ${brands.length} thương hiệu ra file CSV!`, 'Xuất file thành công');
    };

    // Open Status Toggle Modal
    const handleToggleStatus = (brand: BrandItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setStatusTargetBrand(brand);
    };

    // Confirm Toggle Status via Real API
    const handleConfirmToggleStatus = async () => {
        if (!statusTargetBrand) return;

        setIsTogglingStatus(true);
        const target = statusTargetBrand;
        const willBeActive = target.statusNumber !== 1;
        const nextStatusNumber = willBeActive ? 1 : 0;

        try {
            await adminBrandService.updateBrandStatus(target.numericId, nextStatusNumber);

            if (willBeActive) {
                toast.success(`Thương hiệu "${target.name}" đã được kích hoạt hiển thị trên hệ thống.`, 'Kích hoạt thương hiệu');
            } else {
                toast.warning(`Thương hiệu "${target.name}" đã được tạm ẩn khỏi giao diện khách hàng.`, 'Tạm ẩn thương hiệu');
            }

            // Update in-memory state
            setBrands((prev) =>
                prev.map((b) =>
                    b.id === target.id
                        ? {
                            ...b,
                            status: willBeActive ? 'ACTIVE' : 'HIDDEN',
                            statusNumber: nextStatusNumber,
                        }
                        : b
                )
            );

            if (selectedBrand && selectedBrand.id === target.id) {
                setSelectedBrand({
                    ...selectedBrand,
                    status: willBeActive ? 'ACTIVE' : 'HIDDEN',
                    statusNumber: nextStatusNumber,
                });
            }

            setStatusTargetBrand(null);
        } catch (err: any) {
            toast.error(err.message || 'Không thể thay đổi trạng thái thương hiệu.', 'Lỗi cập nhật');
        } finally {
            setIsTogglingStatus(false);
        }
    };

    // Open Delete Modal
    const handleDeleteBrand = (brand: BrandItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDeleteTargetBrand(brand);
    };

    // Confirm Delete Brand via Real API
    const handleConfirmDelete = async () => {
        if (!deleteTargetBrand) return;

        setIsDeleting(true);
        const target = deleteTargetBrand;

        try {
            await adminBrandService.deleteBrand(target.numericId);
            toast.success(`Đã xóa thương hiệu "${target.name}" thành công!`, 'Xóa thương hiệu');

            if (selectedBrand && selectedBrand.id === target.id) {
                setIsDetailModalOpen(false);
                setSelectedBrand(null);
            }

            setDeleteTargetBrand(null);
            loadBrands(true);
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa thương hiệu này.', 'Lỗi xóa thương hiệu');
        } finally {
            setIsDeleting(false);
        }
    };

    // Open Detail Modal
    const handleOpenDetail = (brand: BrandItem) => {
        setSelectedBrand(brand);
        setActiveDetailTab('info');
        setIsDetailModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (brand: BrandItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedBrand(brand);
        setEditForm({
            id: brand.id,
            numericId: brand.numericId,
            name: brand.name,
            slug: brand.slug,
            description: brand.description,
            status: brand.status,
        });
        setIsEditModalOpen(true);
    };

    // Save Edit via Real API
    const handleSaveEdit = async () => {
        if (!editForm) return;
        if (!editForm.name.trim()) {
            toast.error('Tên thương hiệu không được để trống.', 'Thiếu thông tin');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: BrandUpdateRequest = {
                name: editForm.name.trim(),
                slug: editForm.slug.trim() || generateSlug(editForm.name),
                description: editForm.description.trim() || undefined,
                status: editForm.status === 'ACTIVE' ? 1 : 0,
            };

            const updated = await adminBrandService.updateBrand(editForm.numericId, payload);
            toast.success(`Cập nhật thông tin thương hiệu "${updated.name}" thành công!`, 'Cập nhật thành công');

            setIsEditModalOpen(false);
            loadBrands(true);
            if (selectedBrand?.id === editForm.id) {
                setSelectedBrand((prev) =>
                    prev
                        ? {
                            ...prev,
                            name: updated.name,
                            slug: updated.slug,
                            description: updated.description || '',
                            status: updated.status === 1 ? 'ACTIVE' : 'HIDDEN',
                            statusNumber: updated.status,
                        }
                        : null
                );
            }
        } catch (err: any) {
            toast.error(err.message || 'Không thể cập nhật thương hiệu.', 'Lỗi cập nhật');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit Add Form via Real API
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) {
            toast.error('Vui lòng nhập tên thương hiệu.', 'Thiếu thông tin');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: BrandCreateRequest = {
                name: addForm.name.trim(),
                slug: addForm.slug.trim() || generateSlug(addForm.name),
                description: addForm.description.trim() || undefined,
                status: addForm.status === 'ACTIVE' ? 1 : 0,
            };

            const created = await adminBrandService.createBrand(payload);
            toast.success(`Đã thêm mới thương hiệu "${created.name}" thành công!`, 'Thêm thương hiệu');

            setIsAddModalOpen(false);
            setAddForm({
                name: '',
                slug: '',
                description: '',
                status: 'ACTIVE',
            });

            loadBrands(true);
        } catch (err: any) {
            toast.error(err.message || 'Không thể tạo thương hiệu.', 'Lỗi tạo thương hiệu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Copy to clipboard helper
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.info(`Đã sao chép ${label}: ${text}`, 'Đã sao chép');
    };

    // Helper: Restrained Status Indicator (small dot + neutral text)
    const renderStatusIndicator = (status: BrandItem['status']) =>
        status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Hiển thị
            </span>
        ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                Ẩn
            </span>
        );

    // Table Columns Configuration
    const columns: Column<BrandItem>[] = [
        {
            key: 'brand',
            header: 'Thương hiệu',
            align: 'left',
            render: (brand) => (
                <div className="flex items-center gap-3 min-w-0 max-w-[300px]">
                    <div className="w-9 h-9 aspect-square rounded-md bg-slate-50 border border-slate-200 p-1 flex items-center justify-center font-semibold text-xs text-slate-700 shrink-0 select-none">
                        {brand.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-slate-900 text-[13px] leading-snug truncate" title={brand.name}>
                                {brand.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                                #{brand.id}
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                            /{brand.slug}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Mô tả',
            align: 'left',
            render: (brand) => (
                <div className="max-w-[260px] text-xs text-slate-600 line-clamp-2" title={brand.description}>
                    {brand.description && brand.description !== 'Chưa có thông tin mô tả chi tiết cho thương hiệu này.' ? (
                        brand.description
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </div>
            ),
        },
        {
            key: 'productsCount',
            header: 'Sản phẩm',
            align: 'right',
            render: (brand) => (
                <span className="text-[13px] font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {brand.productsCount}
                </span>
            ),
        },
        {
            key: 'categoriesCount',
            header: 'Danh mục',
            align: 'right',
            render: (brand) => (
                <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-slate-800 tabular-nums whitespace-nowrap">
                        {brand.categoriesCount}
                    </span>
                    {brand.categoryNames.length > 0 && (
                        <span
                            className="text-[11px] text-slate-400 line-clamp-1 max-w-[150px] text-right"
                            title={brand.categoryNames.join(', ')}
                        >
                            {brand.categoryNames.slice(0, 2).join(', ')}
                            {brand.categoryNames.length > 2 ? '…' : ''}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'left',
            render: (brand) => renderStatusIndicator(brand.status),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            align: 'right',
            render: (brand) => (
                <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {brand.createdAt}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (brand) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(brand)}
                    viewLabel="Xem chi tiết thương hiệu"
                    onEdit={(e) => handleOpenEdit(brand, e)}
                    editLabel="Chỉnh sửa thông tin"
                    moreActions={[
                        {
                            key: 'toggle-status',
                            label:
                                brand.status === 'ACTIVE'
                                    ? 'Ẩn thương hiệu'
                                    : 'Kích hoạt thương hiệu',
                            description:
                                brand.status === 'ACTIVE'
                                    ? 'Tạm ẩn thương hiệu trên cửa hàng'
                                    : 'Hiển thị lại thương hiệu',
                            icon: brand.status === 'ACTIVE' ? EyeOff : CheckCircle2,
                            variant: brand.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: (e) => handleToggleStatus(brand, e),
                        },
                    ]}
                    onDelete={(e) => handleDeleteBrand(brand, e)}
                    deleteLabel="Xóa thương hiệu"
                    deleteDescription="Xóa thương hiệu khỏi hệ thống"
                />
            ),
        },
    ];

    // Detail Modal Tabs
    const detailModalTabs: ModalTab[] = [
        { id: 'info', label: 'Thông tin chung', icon: Building2 },
        { id: 'products', label: 'Sản phẩm thuộc thương hiệu', icon: Package, badge: selectedBrand?.productsCount || 0 },
    ];

    const handleOpenAddModal = () => {
        setAddForm({
            name: '',
            slug: '',
            description: '',
            status: 'ACTIVE',
        });
        setIsAddModalOpen(true);
    };

    return (
        <div className="w-full space-y-4 min-w-0 font-sans">
            {/* Compact Page Header (Borderless) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-baseline gap-2.5">
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight truncate">
                            Quản lý thương hiệu
                        </h1>
                        <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                            {totalElements} thương hiệu
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Quản lý hãng sản xuất và nhà cung cấp linh kiện máy tính
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => loadBrands(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                        title="Tải lại dữ liệu từ máy chủ"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div className="min-w-0">
                            <span className="text-xs font-semibold text-rose-900">Không thể kết nối máy chủ: </span>
                            <span className="text-xs text-rose-700">{error}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadBrands(false)}
                        className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Unified Toolbar: Search + Status Filter + Add Brand */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                values={filters}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm kiếm theo tên thương hiệu, đường dẫn slug hoặc mô tả..."
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold border border-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm thương hiệu</span>
                    </button>
                }
            />

            {/* Brands Data Table (Single Border-First Frame, No Card-in-Card) */}
            <AdminTable
                columns={columns}
                data={brands}
                rowKey="id"
                loading={isLoading}
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
                itemUnitName="thương hiệu"
                emptyText="Không tìm thấy thương hiệu nào phù hợp với bộ lọc tìm kiếm hiện tại."
            />

            {/* ========================================================================= */}
            {/* ADD BRAND MODAL                                                           */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title="Thêm mới thương hiệu"
                description="Tạo mới hãng sản xuất vào hệ thống cơ sở dữ liệu"
                size="lg"
                footer={
                    <AdminModalFooter
                        onCancel={() => setIsAddModalOpen(false)}
                        onSubmit={handleAddSubmit}
                        isSubmitting={isSubmitting}
                        submittingText="Đang tạo..."
                        submitText="Tạo thương hiệu"
                        submitIcon={Plus}
                    />
                }
            >
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <AdminInput
                        label="Tên thương hiệu"
                        required
                        placeholder="Ví dụ: ASUS, Gigabyte, Intel, MSI..."
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

                    {/* Slug URL */}
                    <AdminInput
                        label="Đường dẫn tĩnh (Slug URL)"
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
                        prefixText="/thuong-hieu/"
                        placeholder="asus"
                        value={addForm.slug}
                        onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                        className="font-mono"
                    />

                    {/* Description */}
                    <AdminTextarea
                        label="Mô tả thương hiệu"
                        rows={3}
                        placeholder="Mô tả thông tin hãng sản xuất, lịch sử phát triển..."
                        value={addForm.description}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    />

                    {/* Status checkbox */}
                    <div className="pt-2 border-t border-slate-200">
                        <label className="flex items-center justify-between py-2.5 cursor-pointer">
                            <div>
                                <span className="text-xs font-semibold text-slate-900 block">
                                    Hiển thị thương hiệu
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    Thương hiệu sẽ hiển thị trực tuyến và sản phẩm thuộc hãng này được phép bán
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={addForm.status === 'ACTIVE'}
                                onChange={(e) => setAddForm({ ...addForm, status: e.target.checked ? 'ACTIVE' : 'HIDDEN' })}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                            />
                        </label>
                    </div>
                </form>
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT BRAND MODAL                                                          */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => !isSubmitting && setIsEditModalOpen(false)}
                    title={`Chỉnh sửa thương hiệu: ${editForm.name}`}
                    description="Cập nhật thông tin thương hiệu trong cơ sở dữ liệu"
                    size="lg"
                    footer={
                        <AdminModalFooter
                            onCancel={() => setIsEditModalOpen(false)}
                            onSubmit={handleSaveEdit}
                            isSubmitting={isSubmitting}
                            submittingText="Đang lưu..."
                            submitText="Lưu thay đổi"
                            submitIcon={Check}
                        />
                    }
                >
                    <div className="space-y-4">
                        <AdminInput
                            label="Tên thương hiệu"
                            required
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />

                        {/* Slug */}
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
                            prefixText="/thuong-hieu/"
                            value={editForm.slug}
                            onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                            className="font-mono"
                        />

                        {/* Description */}
                        <AdminTextarea
                            label="Mô tả thương hiệu"
                            rows={3}
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />

                        {/* Status Checkbox */}
                        <div className="pt-2 border-t border-slate-200">
                            <label className="flex items-center justify-between py-2.5 cursor-pointer">
                                <div>
                                    <span className="text-xs font-semibold text-slate-900 block">
                                        Hiển thị thương hiệu
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        Thương hiệu sẽ hiển thị trực tuyến trên cửa hàng
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={editForm.status === 'ACTIVE'}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.checked ? 'ACTIVE' : 'HIDDEN' })}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                                />
                            </label>
                        </div>
                    </div>
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL BRAND MODAL                                                        */}
            {/* ========================================================================= */}
            {selectedBrand && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={selectedBrand.name}
                    description={`ID: #${selectedBrand.id} • Slug: /${selectedBrand.slug}`}
                    size="2xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(tab) => setActiveDetailTab(tab as 'info' | 'products')}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Thêm vào hệ thống: {selectedBrand.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <AdminButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedBrand);
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
                        {/* TAB 1: THÔNG TIN CHUNG */}
                        {activeDetailTab === 'info' && (
                            <div className="space-y-4">
                                {/* Flat Brand Summary Header */}
                                <div className="pb-4 border-b border-slate-200 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-11 h-11 aspect-square rounded-md bg-slate-50 border border-slate-200 p-1 text-slate-700 flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                                            {selectedBrand.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold text-slate-900 truncate">{selectedBrand.name}</h3>
                                            <p className="text-xs text-slate-500 font-mono truncate">/thuong-hieu/{selectedBrand.slug}</p>
                                        </div>
                                    </div>
                                    {renderStatusIndicator(selectedBrand.status)}
                                </div>

                                {/* Flat Metrics Grid */}
                                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200">
                                    <div>
                                        <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sản phẩm</dt>
                                        <dd className="text-base font-semibold text-slate-900 mt-0.5 tabular-nums">{selectedBrand.productsCount}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Danh mục bán</dt>
                                        <dd className="text-base font-semibold text-slate-900 mt-0.5 tabular-nums">{selectedBrand.categoriesCount}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Mã ID</dt>
                                        <dd className="text-sm font-semibold text-slate-900 mt-1 font-mono tabular-nums">#{selectedBrand.id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Ngày tạo</dt>
                                        <dd className="text-sm font-medium text-slate-800 mt-1 tabular-nums">{selectedBrand.createdAt}</dd>
                                    </div>
                                </dl>

                                {/* Categories the brand sells */}
                                <div>
                                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 tabular-nums">
                                        Danh mục sản phẩm đang phân phối ({selectedBrand.categoriesCount})
                                    </h4>
                                    {selectedBrand.categoryNames.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedBrand.categoryNames.map((cat, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                                >
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400">Thương hiệu này hiện chưa có sản phẩm thuộc danh mục nào.</p>
                                    )}
                                </div>

                                {/* Fast Copy Meta Identifiers */}
                                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                                    <div className="px-3.5 py-2.5 flex items-center justify-between text-xs gap-2">
                                        <span className="text-slate-500 font-medium">Mã nhận diện (ID):</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono tabular-nums text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                {selectedBrand.id}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedBrand.id, 'ID thương hiệu')}
                                                className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                                title="Sao chép ID"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="px-3.5 py-2.5 flex items-center justify-between text-xs gap-2">
                                        <span className="text-slate-500 font-medium">Đường dẫn tĩnh (Slug):</span>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <code className="font-mono text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 truncate">
                                                /thuong-hieu/{selectedBrand.slug}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(`/thuong-hieu/${selectedBrand.slug}`, 'Đường dẫn thương hiệu')}
                                                className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                                                title="Sao chép link"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Brand Description */}
                                <div>
                                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Mô tả chi tiết
                                    </h4>
                                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-md border border-slate-200">
                                        {selectedBrand.description}
                                    </p>
                                </div>

                                {/* Audit Information from Database */}
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs text-slate-600">
                                    <div className="space-y-0.5">
                                        <dt className="text-[11px] font-medium text-slate-500">Ngày tạo</dt>
                                        <dd className="text-slate-800 tabular-nums">
                                            {selectedBrand.createdAt}
                                            {selectedBrand.createdBy ? ` (ID #${selectedBrand.createdBy})` : ''}
                                        </dd>
                                    </div>

                                    <div className="space-y-0.5">
                                        <dt className="text-[11px] font-medium text-slate-500">Cập nhật gần nhất</dt>
                                        <dd className="text-slate-800 tabular-nums">
                                            {selectedBrand.lastModifiedDate}
                                            {selectedBrand.lastModifiedBy ? ` (ID #${selectedBrand.lastModifiedBy})` : ''}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        )}

                        {/* TAB 2: SẢN PHẨM THUỘC THƯƠNG HIỆU TỪ API */}
                        {activeDetailTab === 'products' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-600">
                                        Danh sách sản phẩm của <strong className="font-semibold text-slate-900">{selectedBrand.name}</strong>
                                    </p>
                                    <span className="text-xs font-medium text-slate-600 tabular-nums">
                                        {brandProducts.length} sản phẩm
                                    </span>
                                </div>

                                {isLoadingProducts ? (
                                    <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        <span className="text-xs">Đang tải sản phẩm từ máy chủ...</span>
                                    </div>
                                ) : brandProducts.length > 0 ? (
                                    <div className="border border-slate-200 rounded-md divide-y divide-slate-200/80 max-h-96 overflow-y-auto bg-white">
                                        {brandProducts.map((prod: any, idx: number) => (
                                            <div
                                                key={prod.id || idx}
                                                className="px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-10 h-10 aspect-square rounded-md bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                                    <img
                                                        src={prod.imageUrl || 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=100&q=80'}
                                                        alt={prod.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=100&q=80';
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-0.5 flex-1 min-w-0">
                                                    <div className="text-xs font-medium text-slate-900 truncate" title={prod.name}>
                                                        {prod.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                                                        {prod.code || `PROD-${prod.id}`}
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 shrink-0">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${prod.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {prod.status === 'ACTIVE' ? 'Đang bán' : prod.status || 'Tạm ẩn'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 border border-dashed border-slate-200 rounded-md flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
                                        <Package className="w-6 h-6 text-slate-400 mb-2" />
                                        <h5 className="text-xs font-semibold text-slate-800">Chưa có sản phẩm nào thuộc hãng này</h5>
                                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                            Hiện tại chưa có sản phẩm nào trong hệ thống được gán cho thương hiệu <strong>{selectedBrand.name}</strong>.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DELETE BRAND CONFIRMATION MODAL                                           */}
            {/* ========================================================================= */}
            <AdminConfirmModal
                isOpen={Boolean(deleteTargetBrand)}
                onClose={() => !isDeleting && setDeleteTargetBrand(null)}
                onConfirm={handleConfirmDelete}
                variant="danger"
                icon={Trash2}
                title="Xác nhận xóa thương hiệu"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa thương hiệu{' '}
                        <strong className="text-gray-900 font-bold">
                            "{deleteTargetBrand?.name}"
                        </strong>{' '}
                        khỏi hệ thống?
                    </span>
                }
                description="Thao tác này sẽ thực hiện đánh dấu xóa mềm thương hiệu khỏi hệ thống cơ sở dữ liệu."
                confirmText="Xác nhận xóa"
                cancelText="Hủy bỏ"
                isLoading={isDeleting}
                itemPreview={
                    deleteTargetBrand
                        ? {
                            title: deleteTargetBrand.name,
                            subtitle: `/${deleteTargetBrand.slug} • ${deleteTargetBrand.productsCount} sản phẩm • ${deleteTargetBrand.categoriesCount} danh mục`,
                            badge: deleteTargetBrand.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang ẩn',
                        }
                        : undefined
                }
            />

            {/* ========================================================================= */}
            {/* TOGGLE STATUS CONFIRMATION MODAL                                          */}
            {/* ========================================================================= */}
            <AdminConfirmModal
                isOpen={Boolean(statusTargetBrand)}
                onClose={() => !isTogglingStatus && setStatusTargetBrand(null)}
                onConfirm={handleConfirmToggleStatus}
                variant={statusTargetBrand?.status === 'ACTIVE' ? 'warning' : 'success'}
                icon={statusTargetBrand?.status === 'ACTIVE' ? EyeOff : Eye}
                title={
                    statusTargetBrand?.status === 'ACTIVE'
                        ? 'Xác nhận tạm ẩn thương hiệu'
                        : 'Xác nhận kích hoạt thương hiệu'
                }
                message={
                    <span>
                        Bạn có chắc chắn muốn{' '}
                        <strong>
                            {statusTargetBrand?.status === 'ACTIVE' ? 'tạm ẩn' : 'kích hoạt'}
                        </strong>{' '}
                        thương hiệu{' '}
                        <strong className="text-gray-900 font-bold">
                            "{statusTargetBrand?.name}"
                        </strong>?
                    </span>
                }
                description={
                    statusTargetBrand?.status === 'ACTIVE'
                        ? 'Khi tạm ẩn, thương hiệu sẽ không hiển thị trên danh mục hãng và bộ lọc ngoài trang người dùng.'
                        : 'Khi kích hoạt, thương hiệu sẽ hiển thị trực tuyến và người dùng có thể tra cứu bình thường.'
                }
                confirmText={
                    statusTargetBrand?.status === 'ACTIVE' ? 'Tạm ẩn thương hiệu' : 'Kích hoạt thương hiệu'
                }
                cancelText="Hủy bỏ"
                isLoading={isTogglingStatus}
                itemPreview={
                    statusTargetBrand
                        ? {
                            title: statusTargetBrand.name,
                            subtitle: `/${statusTargetBrand.slug} • ${statusTargetBrand.productsCount} sản phẩm`,
                            badge: statusTargetBrand.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang ẩn',
                        }
                        : undefined
                }
            />
        </div>
    );
}
