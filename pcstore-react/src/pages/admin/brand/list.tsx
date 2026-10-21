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
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
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
                { label: 'Đang hoạt động (ACTIVE)', value: 'ACTIVE' },
                { label: 'Đang ẩn (HIDDEN)', value: 'HIDDEN' },
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

    // Table Columns Configuration
    const columns: Column<BrandItem>[] = [
        {
            key: 'brand',
            header: 'Thương hiệu',
            render: (brand) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {brand.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {brand.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                            <span>/{brand.slug}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Mô tả',
            render: (brand) => (
                <div className="max-w-xs text-xs text-gray-600 line-clamp-2" title={brand.description}>
                    {brand.description || <span className="italic text-gray-400">Chưa có mô tả</span>}
                </div>
            ),
        },
        {
            key: 'productsCount',
            header: 'Số sản phẩm',
            align: 'center',
            render: (brand) => (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    {brand.productsCount} sản phẩm
                </span>
            ),
        },
        {
            key: 'categoriesCount',
            header: 'Số danh mục bán',
            align: 'center',
            render: (brand) => (
                <div className="flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <FolderTree className="w-3.5 h-3.5 text-purple-500" />
                        {brand.categoriesCount} danh mục
                    </span>
                    {brand.categoryNames.length > 0 && (
                        <span
                            className="text-[11px] text-gray-400 line-clamp-1 max-w-[160px] text-center"
                            title={brand.categoryNames.join(', ')}
                        >
                            {brand.categoryNames.slice(0, 2).join(', ')}
                            {brand.categoryNames.length > 2 ? '...' : ''}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'center',
            render: (brand) => (
                <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${brand.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                >
                    {brand.status === 'ACTIVE' ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang hoạt động
                        </>
                    ) : (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Đang ẩn
                        </>
                    )}
                </span>
            ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            align: 'center',
            render: (brand) => (
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{brand.createdAt}</span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (brand) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(brand)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        title="Xem chi tiết thương hiệu"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenEdit(brand, e)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                        title="Chỉnh sửa thông tin"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleToggleStatus(brand, e)}
                        className={`p-1.5 rounded-lg transition-colors border ${brand.status === 'ACTIVE'
                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                        title={brand.status === 'ACTIVE' ? 'Ẩn thương hiệu' : 'Kích hoạt thương hiệu'}
                    >
                        {brand.status === 'ACTIVE' ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleDeleteBrand(brand, e)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-600 transition-colors"
                        title="Xóa thương hiệu"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Detail Modal Tabs
    const detailModalTabs: ModalTab[] = [
        { id: 'info', label: 'Thông tin chung', icon: Building2 },
        { id: 'products', label: 'Sản phẩm thuộc thương hiệu', icon: Package, badge: selectedBrand?.productsCount || 0 },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Award className="w-7 h-7 text-blue-600" />
                        Quản lý thương hiệu
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Quản lý hệ thống các hãng sản xuất và nhà cung cấp linh kiện máy tính trong cơ sở dữ liệu
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => loadBrands(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm disabled:opacity-50"
                        title="Tải lại dữ liệu từ máy chủ"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
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
                            setAddForm({
                                name: '',
                                slug: '',
                                description: '',
                                status: 'ACTIVE',
                            });
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm thương hiệu
                    </button>
                </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-rose-900">Không thể kết nối đến máy chủ</h4>
                        <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadBrands(false)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-sm"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng thương hiệu</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalElements}</h3>
                        <p className="text-xs text-blue-600 font-medium mt-1">Hãng trong cơ sở dữ liệu</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Award className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đang hoạt động</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {brands.filter((b) => b.status === 'ACTIVE').length}
                        </h3>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Hiển thị trực tuyến</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng sản phẩm liên kết</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {brands.reduce((acc, curr) => acc + curr.productsCount, 0)}
                        </h3>
                        <p className="text-xs text-indigo-600 font-medium mt-1">Sản phẩm thuộc các hãng</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng danh mục phủ sóng</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {new Set(brands.flatMap((b) => b.categoryNames)).size}
                        </h3>
                        <p className="text-xs text-purple-600 font-medium mt-1">Nhóm ngành hàng phân phối</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm kiếm theo tên thương hiệu, đường dẫn slug hoặc mô tả..."
            />

            {/* Brands Data Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
            </div>

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
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleAddSubmit}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Tạo thương hiệu
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Tên thương hiệu <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
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
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                        />
                    </div>

                    {/* Slug URL */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">
                                Đường dẫn tĩnh (Slug URL)
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
                                /thuong-hieu/
                            </span>
                            <input
                                type="text"
                                placeholder="asus"
                                value={addForm.slug}
                                onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Mô tả thương hiệu
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Mô tả thông tin hãng sản xuất, lịch sử phát triển..."
                            value={addForm.description}
                            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                        />
                    </div>

                    {/* Status checkbox */}
                    <div className="pt-2">
                        <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                            <div>
                                <span className="text-sm font-medium text-gray-900 block">
                                    Kích hoạt trạng thái hoạt động (ACTIVE)
                                </span>
                                <span className="text-xs text-gray-500">
                                    Thương hiệu sẽ hiển thị trực tuyến và sản phẩm thuộc hãng này được phép bán
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={addForm.status === 'ACTIVE'}
                                onChange={(e) => setAddForm({ ...addForm, status: e.target.checked ? 'ACTIVE' : 'HIDDEN' })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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
                        <div className="flex items-center justify-end gap-3 w-full">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleSaveEdit}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang lưu...
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
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Tên thương hiệu <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all"
                            />
                        </div>

                        {/* Slug */}
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
                                    /thuong-hieu/
                                </span>
                                <input
                                    type="text"
                                    value={editForm.slug}
                                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                    className="w-full px-3.5 py-2.5 text-sm font-mono text-gray-800 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mô tả thương hiệu
                            </label>
                            <textarea
                                rows={3}
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all resize-none"
                            />
                        </div>

                        {/* Status Checkbox */}
                        <div className="pt-2">
                            <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-colors">
                                <div>
                                    <span className="text-sm font-medium text-gray-900 block">
                                        Kích hoạt trạng thái hoạt động (ACTIVE)
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Thương hiệu sẽ hiển thị trực tuyến trên cửa hàng
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={editForm.status === 'ACTIVE'}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.checked ? 'ACTIVE' : 'HIDDEN' })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>Thêm vào hệ thống: {selectedBrand.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedBrand);
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
                        {/* TAB 1: THÔNG TIN CHUNG */}
                        {activeDetailTab === 'info' && (
                            <div className="space-y-5">
                                {/* Brand Header Card */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50/50 border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                            {selectedBrand.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{selectedBrand.name}</h3>
                                            <p className="text-xs text-blue-600 font-mono">/thuong-hieu/{selectedBrand.slug}</p>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${selectedBrand.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}
                                    >
                                        {selectedBrand.status === 'ACTIVE' ? (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Đang hoạt động
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                Đang ẩn
                                            </>
                                        )}
                                    </span>
                                </div>

                                {/* Stats Metrics */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Số lượng sản phẩm</span>
                                        <span className="text-lg font-bold text-blue-600 mt-0.5 block">{selectedBrand.productsCount} sản phẩm</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Số danh mục bán</span>
                                        <span className="text-lg font-bold text-purple-600 mt-0.5 block">{selectedBrand.categoriesCount} danh mục</span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Trạng thái</span>
                                        <span className={`text-sm font-bold mt-1 block ${selectedBrand.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-500'}`}>
                                            {selectedBrand.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang ẩn'}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-400 block uppercase">Mã ID</span>
                                        <span className="text-sm font-bold text-gray-800 mt-1 block font-mono">
                                            #{selectedBrand.id}
                                        </span>
                                    </div>
                                </div>

                                {/* Categories the brand sells */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FolderTree className="w-3.5 h-3.5 text-purple-600" />
                                        Danh mục sản phẩm thương hiệu này đang bán ({selectedBrand.categoriesCount})
                                    </h4>
                                    {selectedBrand.categoryNames.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedBrand.categoryNames.map((cat, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-sm"
                                                >
                                                    <Tag className="w-3 h-3 text-purple-500" />
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Thương hiệu này hiện chưa có sản phẩm thuộc danh mục nào.</p>
                                    )}
                                </div>

                                {/* Fast Copy Meta Identifiers */}
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Mã nhận diện thương hiệu (ID):</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                {selectedBrand.id}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedBrand.id, 'ID thương hiệu')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép ID"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Đường dẫn tĩnh website (Slug):</span>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                                /thuong-hieu/{selectedBrand.slug}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(`/thuong-hieu/${selectedBrand.slug}`, 'Đường dẫn thương hiệu')}
                                                className="p-1 hover:bg-white rounded text-blue-600 transition-colors"
                                                title="Sao chép link"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Brand Description */}
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Mô tả chi tiết thương hiệu
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                                        {selectedBrand.description}
                                    </p>
                                </div>

                                {/* Audit Information from Database */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 space-y-1">
                                        <div className="flex items-center gap-1.5 font-medium text-gray-700">
                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            Ngày tạo:
                                        </div>
                                        <div className="pl-5 text-gray-500">
                                            {selectedBrand.createdAt}
                                            {selectedBrand.createdBy ? ` (Người tạo ID: #${selectedBrand.createdBy})` : ''}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 space-y-1">
                                        <div className="flex items-center gap-1.5 font-medium text-gray-700">
                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                            Lần cập nhật gần nhất:
                                        </div>
                                        <div className="pl-5 text-gray-500">
                                            {selectedBrand.lastModifiedDate}
                                            {selectedBrand.lastModifiedBy ? ` (Người sửa ID: #${selectedBrand.lastModifiedBy})` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SẢN PHẨM THUỘC THƯƠNG HIỆU TỪ API */}
                        {activeDetailTab === 'products' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Danh sách các sản phẩm của <strong className="text-gray-900">{selectedBrand.name}</strong> trong hệ thống
                                    </p>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                        {brandProducts.length} sản phẩm
                                    </span>
                                </div>

                                {isLoadingProducts ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        <span className="text-xs">Đang tải sản phẩm từ máy chủ...</span>
                                    </div>
                                ) : brandProducts.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                                        {brandProducts.map((prod: any, idx: number) => (
                                            <div
                                                key={prod.id || idx}
                                                className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-300 transition-all bg-white shadow-sm flex items-center gap-3"
                                            >
                                                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 p-1 flex items-center justify-center shrink-0 overflow-hidden">
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
                                                    <div className="text-xs font-semibold text-gray-900 line-clamp-1" title={prod.name}>
                                                        {prod.name}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 font-mono truncate">
                                                        Mã: {prod.code || `PROD-${prod.id}`}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-medium">
                                                        {prod.productType === 'COMPONENT' ? 'Linh kiện PC' : prod.productType || 'Sản phẩm'}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${prod.status === 'ACTIVE'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                                            }`}
                                                    >
                                                        {prod.status === 'ACTIVE' ? 'Đang bán' : prod.status || 'Tạm ẩn'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <h5 className="text-sm font-semibold text-gray-800">Chưa có sản phẩm nào thuộc hãng này</h5>
                                        <p className="text-xs text-gray-500 mt-1 max-w-sm">
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
