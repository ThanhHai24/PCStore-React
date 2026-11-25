import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FolderTree,
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
    Camera,
    Copy,
    Sparkles,
    Globe,
    Layers,
    RefreshCw,
    AlertCircle,
    Loader2
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
    type ModalTab,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminCategoryService } from '../../../services/adminCategoryService';
import type {
    CategoryResponse,
    CategoryCreateRequest,
    CategoryUpdateRequest
} from '../../../types/adminCategory';

export interface CategoryItem {
    id: string;
    numericId: number;
    name: string;
    slug: string;
    description: string;
    parentId: string | null;
    parentNumericId: number | null;
    parentName: string;
    image: string;
    order: number;
    productsCount: number;
    status: 'ACTIVE' | 'HIDDEN';
    statusNumber: number; // 1 = ACTIVE, 0 = INACTIVE
    isFeatured: boolean;
    showOnMenu: boolean;
    createdAt: string;
    createdDateRaw?: string | null;
    lastModifiedDate?: string | null;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
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

// Curated Category Image Mapper
export const getCategoryImage = (name: string = '', slug: string = ''): string => {
    const s = `${slug} ${name}`.toLowerCase();
    if (s.includes('cpu') || s.includes('vi xu ly') || s.includes('chip') || s.includes('intel') || s.includes('amd')) {
        return 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('vga') || s.includes('card') || s.includes('do hoa') || s.includes('rtx') || s.includes('geforce')) {
        return 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('main') || s.includes('bo mach') || s.includes('motherboard') || s.includes('asus') || s.includes('msi')) {
        return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('ram') || s.includes('bo nho') || s.includes('ddr')) {
        return 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('ssd') || s.includes('hdd') || s.includes('o cung') || s.includes('nvme') || s.includes('storage')) {
        return 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('psu') || s.includes('nguon') || s.includes('power')) {
        return 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('case') || s.includes('vo may') || s.includes('thung may')) {
        return 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('tan') || s.includes('cooling') || s.includes('fan') || s.includes('cooler') || s.includes('aio')) {
        return 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('man hinh') || s.includes('monitor') || s.includes('display')) {
        return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('phim') || s.includes('chuot') || s.includes('keyboard') || s.includes('mouse')) {
        return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('gaming') || s.includes('game')) {
        return 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('van phong') || s.includes('office')) {
        return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('workstation') || s.includes('ai') || s.includes('server')) {
        return 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('ngoai vi') || s.includes('tai nghe') || s.includes('loa') || s.includes('gear') || s.includes('audio')) {
        return 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80';
    }
    if (s.includes('linh kien') || s.includes('phu kien')) {
        return 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';
};

// Backend Response Mapper
export const mapBackendCategoryToItem = (c: CategoryResponse): CategoryItem => {
    let formattedDate = 'Chưa cập nhật';
    if (c.createdDate) {
        try {
            formattedDate = new Date(c.createdDate).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            formattedDate = c.createdDate.split('T')[0] || 'Chưa cập nhật';
        }
    }

    const isStatusActive = c.status === 'ACTIVE' || c.status === 1 || (c.status as any) === '1';

    return {
        id: String(c.id),
        numericId: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || 'Chưa có mô tả chi tiết.',
        parentId: c.parentId !== null && c.parentId !== undefined ? String(c.parentId) : null,
        parentNumericId: c.parentId ?? null,
        parentName: c.parentName || 'Danh mục gốc',
        image: getCategoryImage(c.name, c.slug),
        order: c.id,
        productsCount: 0,
        status: isStatusActive ? 'ACTIVE' : 'HIDDEN',
        statusNumber: isStatusActive ? 1 : 0,
        isFeatured: false,
        showOnMenu: true,
        createdAt: formattedDate,
        createdDateRaw: c.createdDate,
        lastModifiedDate: c.lastModifiedDate,
        metaTitle: `${c.name} Chính Hãng - Giá Rẻ | PCStore`,
        metaDescription: c.description || `Mua ${c.name} chính hãng chất lượng cao tại PCStore.`,
        metaKeywords: `${c.slug}, ${c.name.toLowerCase()}`,
    };
};

export const CategoryList: React.FC = () => {
    const { toast } = useToast();

    // Data states
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [allParentOptions, setAllParentOptions] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Search, Filter & Pagination states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailCategory, setDetailCategory] = useState<CategoryItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Modal Confirmation States
    const [deleteTargetCategory, setDeleteTargetCategory] = useState<CategoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [statusTargetCategory, setStatusTargetCategory] = useState<CategoryItem | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Products in category detail tab
    const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

    // Form state for Add
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '' as string | null,
        image: '',
        status: 'ACTIVE' as CategoryItem['status'],
        isFeatured: false,
        showOnMenu: true,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
    });

    // Form state for Edit
    const [editFormData, setEditFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '' as string | null,
        image: '',
        status: 'ACTIVE' as CategoryItem['status'],
        isFeatured: false,
        showOnMenu: true,
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
    });

    // Image upload refs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const editImageInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [isDraggingEditImage, setIsDraggingEditImage] = useState(false);

    // Load Categories from Backend API
    const loadCategories = useCallback(async (isSilent = false) => {
        if (!isSilent) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError(null);

        try {
            let statusParam: number | string | undefined = undefined;
            if (filterValues.status === 'ACTIVE') {
                statusParam = 'ACTIVE';
            } else if (filterValues.status === 'HIDDEN') {
                statusParam = 'INACTIVE';
            }

            let parentIdParam: number | string | undefined = undefined;
            if (filterValues.parent && filterValues.parent !== 'ROOT') {
                parentIdParam = filterValues.parent;
            }

            const pageIndex = Math.max(0, currentPage - 1);
            const response = await adminCategoryService.getAllCategories({
                keyword: searchQuery.trim() || undefined,
                status: statusParam,
                parentId: parentIdParam,
                page: pageIndex,
                size: pageSize,
                sort: ['id,DESC'],
            });

            let items = (response.content || []).map(mapBackendCategoryToItem);

            // Client-side filter for 'ROOT' categories if parent filter is set to ROOT
            if (filterValues.parent === 'ROOT') {
                items = items.filter((item) => item.parentId === null);
            }

            setCategories(items);
            setTotalElements(response.totalElements || items.length);
            setTotalPages(Math.max(1, response.totalPages || 1));
        } catch (err: any) {
            console.error('Error fetching categories:', err);
            setError(err.message || 'Không thể tải danh sách danh mục từ máy chủ.');
            toast.error(err.message || 'Không thể tải danh sách danh mục từ máy chủ.', 'Lỗi tải dữ liệu');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [currentPage, pageSize, searchQuery, filterValues.status, filterValues.parent, toast]);

    // Load all categories for Parent dropdown choices
    const loadParentOptions = useCallback(async () => {
        try {
            const res = await adminCategoryService.getAllCategories({
                page: 0,
                size: 100,
                sort: ['name,ASC'],
            });
            const items = (res.content || []).map(mapBackendCategoryToItem);
            setAllParentOptions(items);
        } catch (err) {
            console.warn('Could not load parent options:', err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        loadParentOptions();
    }, [loadParentOptions]);

    // Load category products when detail modal opens
    useEffect(() => {
        if (isDetailModalOpen && detailCategory) {
            setIsLoadingProducts(true);
            adminCategoryService
                .getProductsByCategory(detailCategory.numericId, 0, 10)
                .then((res) => {
                    const list = res?.content || [];
                    setCategoryProducts(list);
                })
                .catch(() => {
                    setCategoryProducts([]);
                })
                .finally(() => {
                    setIsLoadingProducts(false);
                });
        } else {
            setCategoryProducts([]);
        }
    }, [isDetailModalOpen, detailCategory]);

    // Copy to clipboard helper
    const handleCopyText = (text: string, fieldKey: string, label: string = 'thông tin') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        toast.info(`Đã sao chép ${label}: "${text}" vào bộ nhớ tạm!`, 'Sao chép thành công');
        setTimeout(() => {
            setCopiedField(null);
        }, 2000);
    };

    // Open detail modal
    const handleOpenDetailModal = (category: CategoryItem) => {
        setDetailCategory(category);
        setIsDetailModalOpen(true);
    };

    // Open edit modal
    const handleOpenEditModal = (category: CategoryItem) => {
        setEditingCategory(category);
        setEditFormData({
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parentId || '',
            image: category.image,
            status: category.status,
            isFeatured: category.isFeatured,
            showOnMenu: category.showOnMenu,
            metaTitle: category.metaTitle || '',
            metaDescription: category.metaDescription || '',
            metaKeywords: category.metaKeywords || '',
        });
        if (editImageInputRef.current) {
            editImageInputRef.current.value = '';
        }
        setIsEditModalOpen(true);
    };

    // Open Toggle Status confirmation modal
    const handleOpenToggleStatusModal = (category: CategoryItem) => {
        setStatusTargetCategory(category);
    };

    // Confirm Toggle status (ACTIVE <-> INACTIVE) via Real API
    const handleConfirmToggleStatus = async () => {
        if (!statusTargetCategory) return;

        setIsTogglingStatus(true);
        const target = statusTargetCategory;
        const willBeActive = target.statusNumber !== 1;
        const nextStatusNumber = willBeActive ? 1 : 0;

        try {
            await adminCategoryService.updateCategoryStatus(target.numericId, nextStatusNumber);

            if (willBeActive) {
                toast.success(`Danh mục "${target.name}" đã được hiển thị trên hệ thống.`, 'Hiển thị danh mục');
            } else {
                toast.warning(`Danh mục "${target.name}" đã được tạm ẩn khỏi giao diện khách hàng.`, 'Tạm ẩn danh mục');
            }

            // Update in-memory categories state
            setCategories((prev) =>
                prev.map((c) =>
                    c.id === target.id
                        ? {
                            ...c,
                            status: willBeActive ? 'ACTIVE' : 'HIDDEN',
                            statusNumber: nextStatusNumber,
                        }
                        : c
                )
            );

            if (detailCategory && detailCategory.id === target.id) {
                setDetailCategory({
                    ...detailCategory,
                    status: willBeActive ? 'ACTIVE' : 'HIDDEN',
                    statusNumber: nextStatusNumber,
                });
            }

            setStatusTargetCategory(null);
        } catch (err: any) {
            toast.error(err.message || 'Không thể thay đổi trạng thái danh mục.', 'Lỗi cập nhật');
        } finally {
            setIsTogglingStatus(false);
        }
    };

    // Open Delete confirmation modal
    const handleOpenDeleteModal = (category: CategoryItem) => {
        setDeleteTargetCategory(category);
    };

    // Confirm Delete category via Real API
    const handleConfirmDelete = async () => {
        if (!deleteTargetCategory) return;

        setIsDeleting(true);
        const target = deleteTargetCategory;

        try {
            await adminCategoryService.deleteCategory(target.numericId);
            toast.success(`Đã xóa danh mục "${target.name}" thành công!`, 'Xóa danh mục');

            if (detailCategory && detailCategory.id === target.id) {
                setIsDetailModalOpen(false);
                setDetailCategory(null);
            }

            setDeleteTargetCategory(null);
            loadCategories(true);
            loadParentOptions();
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa danh mục này.', 'Lỗi xóa danh mục');
        } finally {
            setIsDeleting(false);
        }
    };

    // Image Upload Handlers (Add Modal)
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã chọn hình ảnh danh mục thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropImage = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingImage(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng kéo thả tệp hình ảnh hợp lệ', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã tải hình ảnh danh mục lên thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setFormData((prev) => ({ ...prev, image: '' }));
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        toast.info('Đã xóa hình ảnh danh mục.', 'Xóa ảnh');
    };

    // Image Upload Handlers (Edit Modal)
    const handleEditImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã cập nhật hình ảnh danh mục thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropEditImage = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingEditImage(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng kéo thả tệp hình ảnh hợp lệ', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData((prev) => ({ ...prev, image: event.target?.result as string }));
                toast.success('Đã cập nhật hình ảnh danh mục thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveEditImage = () => {
        setEditFormData((prev) => ({ ...prev, image: '' }));
        if (editImageInputRef.current) {
            editImageInputRef.current.value = '';
        }
        toast.info('Đã xóa hình ảnh danh mục.', 'Xóa ảnh');
    };

    // Submit Add Category via Real API
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên danh mục.', 'Thiếu thông tin');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CategoryCreateRequest = {
                name: formData.name.trim(),
                slug: formData.slug.trim() || generateSlug(formData.name),
                description: formData.description.trim() || undefined,
                status: formData.status === 'ACTIVE' ? 1 : 0,
                parentId: formData.parentId ? Number(formData.parentId) : null,
            };

            const created = await adminCategoryService.createCategory(payload);
            toast.success(`Đã thêm mới danh mục "${created.name}" thành công!`, 'Thêm danh mục');

            setIsAddModalOpen(false);
            setFormData({
                name: '',
                slug: '',
                description: '',
                parentId: '',
                image: '',
                status: 'ACTIVE',
                isFeatured: false,
                showOnMenu: true,
                metaTitle: '',
                metaDescription: '',
                metaKeywords: '',
            });

            loadCategories(true);
            loadParentOptions();
        } catch (err: any) {
            toast.error(err.message || 'Không thể tạo danh mục.', 'Lỗi tạo danh mục');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit Edit Category via Real API
    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        if (!editFormData.name.trim()) {
            toast.error('Vui lòng nhập tên danh mục.', 'Thiếu thông tin');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CategoryUpdateRequest = {
                name: editFormData.name.trim(),
                slug: editFormData.slug.trim() || generateSlug(editFormData.name),
                description: editFormData.description.trim() || undefined,
                status: editFormData.status === 'ACTIVE' ? 1 : 0,
                parentId: editFormData.parentId ? Number(editFormData.parentId) : null,
            };

            const updated = await adminCategoryService.updateCategory(editingCategory.numericId, payload);
            toast.success(`Đã cập nhật danh mục "${updated.name}" thành công!`, 'Cập nhật thành công');

            const mappedItem = mapBackendCategoryToItem(updated);

            if (detailCategory && detailCategory.id === editingCategory.id) {
                setDetailCategory(mappedItem);
            }

            setIsEditModalOpen(false);
            setEditingCategory(null);

            loadCategories(true);
            loadParentOptions();
        } catch (err: any) {
            toast.error(err.message || 'Không thể cập nhật danh mục.', 'Lỗi cập nhật');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Export Categories to CSV
    const handleExportCSV = () => {
        if (!categories || categories.length === 0) {
            toast.warning('Không có dữ liệu danh mục để xuất file.', 'Thông báo');
            return;
        }

        const headers = ['ID', 'Tên danh mục', 'Slug', 'Danh mục cha', 'Trạng thái', 'Ngày tạo', 'Mô tả'];
        const rows = categories.map((c) => [
            c.id,
            `"${(c.name || '').replace(/"/g, '""')}"`,
            `"${(c.slug || '').replace(/"/g, '""')}"`,
            `"${(c.parentName || 'Danh mục gốc').replace(/"/g, '""')}"`,
            c.status === 'ACTIVE' ? 'Đang hiển thị' : 'Tạm ẩn',
            c.createdAt,
            `"${(c.description || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `danh_muc_pcstore_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Danh sách danh mục sản phẩm đã được xuất ra file CSV thành công!', 'Xuất file thành công');
    };

    // Modal Tabs Definition
    const categoryModalTabs: ModalTab[] = [
        {
            id: 'basic',
            label: 'Thông tin cơ bản',
            icon: FolderTree,
        },
        {
            id: 'display',
            label: 'Hiển thị & Trạng thái',
            icon: Sparkles,
        },
    ];

    // Detail Modal Tabs
    const detailModalTabs: ModalTab[] = [
        {
            id: 'info',
            label: 'Thông tin chung',
            icon: FolderTree,
        },
        {
            id: 'products',
            label: 'Sản phẩm thuộc nhóm',
            icon: Package,
            badge: categoryProducts.length,
        },
        {
            id: 'status',
            label: 'Trạng thái & Vị trí',
            icon: Sparkles,
        },
    ];

    // Root categories for filters
    const rootCategories = allParentOptions.filter((c) => c.parentId === null);

    // Filter Fields Definition
    const filterFields: FilterField[] = [
        {
            id: 'parent',
            label: 'Nhóm danh mục',
            placeholder: 'Tất cả nhóm',
            icon: Layers,
            options: [
                { label: 'Tất cả nhóm', value: '' },
                { label: 'Danh mục gốc (Cấp 1)', value: 'ROOT' },
                ...rootCategories.map((rc) => ({
                    label: rc.name,
                    value: rc.id,
                })),
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái',
            placeholder: 'Tất cả trạng thái',
            icon: Eye,
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Hiển thị', value: 'ACTIVE' },
                { label: 'Ẩn', value: 'HIDDEN' },
            ],
        },
    ];

    // Helper: Restrained Status Indicator (small dot + neutral text)
    const renderStatusIndicator = (status: CategoryItem['status']) =>
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

    // Table Columns Definition
    const categoryTableColumns: Column<CategoryItem>[] = [
        {
            key: 'category',
            header: 'Danh mục',
            align: 'left',
            render: (cat) => (
                <div className={`flex items-center gap-3 min-w-0 max-w-[320px] ${cat.parentId ? 'pl-3' : ''}`}>
                    <div className="w-9 h-9 aspect-square rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
                        <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-slate-900 text-[13px] leading-snug truncate" title={cat.name}>
                                {cat.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                                #{cat.id}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 min-w-0">
                            <span className="font-mono truncate">/{cat.slug}</span>
                            {cat.parentId && (
                                <>
                                    <span className="text-slate-300 shrink-0">·</span>
                                    <span className="truncate text-slate-500" title={`Thuộc: ${cat.parentName}`}>
                                        Thuộc: {cat.parentName}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Mô tả',
            align: 'left',
            render: (cat) => (
                <p className="text-xs text-slate-600 line-clamp-2 max-w-[280px]">
                    {cat.description && cat.description !== 'Chưa có mô tả chi tiết.' ? (
                        cat.description
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </p>
            ),
        },
        {
            key: 'order',
            header: 'Thứ tự',
            align: 'right',
            render: (cat) => (
                <span className="text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                    {cat.order}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'left',
            render: (cat) => renderStatusIndicator(cat.status),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            align: 'right',
            render: (cat) => (
                <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {cat.createdAt}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (cat) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetailModal(cat)}
                    viewLabel="Xem chi tiết danh mục"
                    onEdit={() => handleOpenEditModal(cat)}
                    editLabel="Chỉnh sửa danh mục"
                    moreActions={[
                        {
                            key: 'toggle-status',
                            label:
                                cat.status === 'ACTIVE'
                                    ? 'Tạm ẩn danh mục'
                                    : 'Hiển thị danh mục',
                            description:
                                cat.status === 'ACTIVE'
                                    ? 'Ẩn danh mục trên thanh menu'
                                    : 'Kích hoạt hiển thị danh mục',
                            icon: cat.status === 'ACTIVE' ? EyeOff : Eye,
                            variant: cat.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: () => handleOpenToggleStatusModal(cat),
                        },
                    ]}
                    onDelete={() => handleOpenDeleteModal(cat)}
                    deleteLabel="Xóa danh mục"
                    deleteDescription="Xóa danh mục khỏi hệ thống"
                />
            ),
        },
    ];

    const handleOpenAddModal = () => {
        setFormData({
            name: '',
            slug: '',
            description: '',
            parentId: '',
            image: '',
            status: 'ACTIVE',
            isFeatured: false,
            showOnMenu: true,
            metaTitle: '',
            metaDescription: '',
            metaKeywords: '',
        });
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
        setIsAddModalOpen(true);
    };

    return (
        <div className="w-full space-y-4 min-w-0 font-sans">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-baseline gap-2.5">
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight truncate">
                            Quản lý danh mục
                        </h1>
                        <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                            {totalElements} danh mục
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Hệ thống phân cấp danh mục sản phẩm và trạng thái hiển thị
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            loadCategories(true);
                            loadParentOptions();
                        }}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs rounded-md border border-slate-200 transition-colors disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                        title="Làm mới dữ liệu từ máy chủ"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs rounded-md border border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                        title="Xuất dữ liệu ra file CSV"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Xuất CSV</span>
                    </button>
                </div>
            </div>

            {/* Error Banner (if any) */}
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
                        onClick={() => loadCategories()}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-md transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Unified Toolbar: Search + Filter (Parent, Status) + Add Category */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(query) => {
                    setSearchQuery(query);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm kiếm tên danh mục, slug, mô tả..."
                fields={filterFields}
                values={filterValues}
                onChange={(vals) => {
                    setFilterValues(vals);
                    setCurrentPage(1);
                }}
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md border border-blue-600 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span>Thêm danh mục</span>
                    </button>
                }
            />

            {/* Category Data Table */}
            <AdminTable
                columns={categoryTableColumns}
                data={categories}
                loading={isLoading}
                rowKey="id"
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20, 50]}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                onRowClick={(cat) => handleOpenDetailModal(cat)}
                itemUnitName="danh mục"
                emptyText="Không tìm thấy danh mục sản phẩm nào thỏa mãn điều kiện."
            />

            {/* MODAL 1: THÊM DANH MỤC MỚI (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => !isSubmitting && setIsAddModalOpen(false)}
                title="Thêm danh mục sản phẩm mới"
                subtitle="Tạo mới danh mục phân cấp trên máy chủ backend API"
                icon={Plus}
                size="lg"
                tabs={categoryModalTabs}
                onSubmit={handleAddCategory}
                submitText={isSubmitting ? 'Đang tạo...' : 'Tạo danh mục'}
                isSubmitting={isSubmitting}
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <AdminInput
                                    label="Tên danh mục sản phẩm"
                                    required
                                    value={formData.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({
                                            ...formData,
                                            name: val,
                                            slug: generateSlug(val),
                                            metaTitle: `${val} Chính Hãng - Giá Rẻ | PCStore`,
                                        });
                                    }}
                                    placeholder="vd: PC Gaming Khủng"
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <AdminInput
                                        label="Đường dẫn tĩnh (Slug)"
                                        required
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="vd: pc-gaming-khung"
                                        action={
                                            <AdminButton
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setFormData({ ...formData, slug: generateSlug(formData.name) })}
                                                icon={RefreshCw}
                                            >
                                                Tạo lại slug
                                            </AdminButton>
                                        }
                                        helperText="Đường dẫn thân thiện hiển thị trên thanh địa chỉ URL"
                                        className="font-mono"
                                    />

                                    <AdminSelect
                                        label="Nhóm danh mục cha"
                                        value={formData.parentId || ''}
                                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                                        helperText="Chọn danh mục cha để tạo cấu trúc phân cấp đa tầng"
                                    >
                                        <option value="">— Không có (Danh mục gốc cấp 1) —</option>
                                        {allParentOptions.map((rc) => (
                                            <option key={rc.id} value={rc.id}>
                                                {rc.name} {rc.parentName && rc.parentName !== 'Danh mục gốc' ? `(thuộc ${rc.parentName})` : ''}
                                            </option>
                                        ))}
                                    </AdminSelect>
                                </div>

                                <AdminTextarea
                                    label="Mô tả chi tiết danh mục"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mô tả công năng, đối tượng người dùng hoặc đặc tính nổi bật của nhóm sản phẩm..."
                                />
                            </div>
                        )}
                        {/* Tab 2: Hiển thị & Trạng thái */}
                        {activeTab === 'display' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                                        Trạng thái hiển thị danh mục
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${formData.status === 'ACTIVE'
                                                ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-semibold'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={formData.status === 'ACTIVE'}
                                                onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                                                className="sr-only"
                                            />
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                            <div>
                                                <div className="text-xs font-semibold">Hiển thị</div>
                                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Khách hàng có thể xem và lọc sản phẩm</div>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${formData.status === 'HIDDEN'
                                                ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-semibold'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={formData.status === 'HIDDEN'}
                                                onChange={() => setFormData({ ...formData, status: 'HIDDEN' })}
                                                className="sr-only"
                                            />
                                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                            <div>
                                                <div className="text-xs font-semibold">Ẩn</div>
                                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Ẩn khỏi menu và bộ lọc tìm kiếm</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
                                    <label className="flex items-start gap-3 py-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-slate-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-900 block">
                                                Đánh dấu là danh mục nổi bật
                                            </span>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Danh mục sẽ được hiển thị ưu tiên tại mục "Danh mục nổi bật" trên trang chủ Store.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 py-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.showOnMenu}
                                            onChange={(e) => setFormData({ ...formData, showOnMenu: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-slate-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-900 block">
                                                Ghim danh mục lên thanh điều hướng chính
                                            </span>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Hiển thị nút truy cập nhanh trên Mega Menu thanh Header của trang web.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 2: XEM CHI TIẾT DANH MỤC (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={detailCategory ? `Chi tiết: ${detailCategory.name}` : 'Chi tiết danh mục'}
                subtitle={detailCategory ? `/${detailCategory.slug} • Mã: ${detailCategory.id}` : undefined}
                icon={Eye}
                size="lg"
                tabs={detailModalTabs}
                footer={
                    detailCategory && (
                        <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-slate-500 hidden sm:block tabular-nums">
                                Khởi tạo ngày: <span className="font-semibold text-slate-700">{detailCategory.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Đóng
                                </AdminButton>
                                <AdminButton
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEditModal(detailCategory);
                                    }}
                                    icon={Edit}
                                >
                                    Chỉnh sửa danh mục
                                </AdminButton>
                            </div>
                        </div>
                    )
                }
            >
                {(activeTab) => {
                    if (!detailCategory) return null;

                    return (
                        <div>
                            {/* Tab 1: Thông tin chung */}
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    {/* Flat Category Summary */}
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-slate-200">
                                        <img
                                            src={detailCategory.image}
                                            alt={detailCategory.name}
                                            className="w-16 h-16 aspect-square rounded-md object-cover border border-slate-200 shrink-0 bg-slate-50"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=400&q=80';
                                            }}
                                        />
                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                                                    {detailCategory.name}
                                                </h3>
                                                {renderStatusIndicator(detailCategory.status)}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5 font-mono tabular-nums">
                                                <span>/{detailCategory.slug}</span>
                                                <span>·</span>
                                                <span>ID: #{detailCategory.id}</span>
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1.5 font-normal line-clamp-2">
                                                {detailCategory.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Flat Properties Grid */}
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        <div className="space-y-1">
                                            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                                Đường dẫn tĩnh (Slug)
                                            </dt>
                                            <dd className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                                <span className="text-xs font-medium text-slate-900 font-mono truncate">
                                                    /{detailCategory.slug}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailCategory.slug, 'slug', 'Đường dẫn slug')}
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                                                    title="Sao chép slug"
                                                >
                                                    {copiedField === 'slug' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </dd>
                                        </div>

                                        <div className="space-y-1">
                                            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                                Mã định danh (ID)
                                            </dt>
                                            <dd className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                                <span className="text-xs font-medium text-slate-900 font-mono tabular-nums">
                                                    {detailCategory.id}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailCategory.id, 'id', 'Mã danh mục')}
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                                                    title="Sao chép ID"
                                                >
                                                    {copiedField === 'id' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </dd>
                                        </div>

                                        <div className="space-y-1">
                                            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                                Nhóm danh mục cha
                                            </dt>
                                            <dd className="pb-2 border-b border-slate-100 text-xs font-medium text-slate-900">
                                                {detailCategory.parentName}
                                            </dd>
                                        </div>

                                        <div className="space-y-1">
                                            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                                                Thời gian khởi tạo
                                            </dt>
                                            <dd className="pb-2 border-b border-slate-100 text-xs font-medium text-slate-900 tabular-nums">
                                                {detailCategory.createdAt}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            )}

                            {/* Tab 2: Sản phẩm thuộc nhóm */}
                            {activeTab === 'products' && (
                                <div className="space-y-4">
                                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                                        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-800">
                                                Sản phẩm trong danh mục
                                            </span>
                                            <span className="text-xs text-slate-500 tabular-nums">
                                                {isLoadingProducts ? 'Đang tải...' : `${categoryProducts.length} sản phẩm`}
                                            </span>
                                        </div>

                                        {isLoadingProducts ? (
                                            <div className="p-8 text-center">
                                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                                                <p className="text-xs text-slate-500">Đang truy vấn sản phẩm thuộc danh mục...</p>
                                            </div>
                                        ) : categoryProducts.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-xs">
                                                <Package className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                                                Chưa có sản phẩm nào thuộc danh mục này trong hệ thống.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-200/80 max-h-80 overflow-y-auto">
                                                {categoryProducts.map((prod) => (
                                                    <div key={prod.id} className="px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <img
                                                                src={prod.imageUrl || getCategoryImage(prod.name, prod.slug)}
                                                                alt={prod.name}
                                                                className="w-9 h-9 aspect-square rounded-md object-cover border border-slate-200 bg-slate-50 shrink-0"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src =
                                                                        'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=100&q=80';
                                                                }}
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-slate-900 truncate">{prod.name}</p>
                                                                <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                                                                    {prod.code || `PROD-${prod.id}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 shrink-0">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${prod.status === 'INACTIVE' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                                                            {prod.status || 'ACTIVE'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Trạng thái & Vị trí */}
                            {activeTab === 'status' && (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-900">Trạng thái công khai danh mục</h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Khi ẩn, khách hàng sẽ không thấy danh mục này trên thanh menu và bộ lọc.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenToggleStatusModal(detailCategory)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${detailCategory.status === 'ACTIVE'
                                                ? 'border-rose-200 text-rose-700 bg-white hover:bg-rose-50'
                                                : 'border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50'
                                                }`}
                                        >
                                            {detailCategory.status === 'ACTIVE' ? (
                                                <>
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                    <span>Tạm ẩn danh mục</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Hiện danh mục</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
                                        <div className="space-y-1 pb-2 border-b border-slate-100">
                                            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Ghim Menu chính</dt>
                                            <dd className="flex items-center gap-2 text-xs font-medium text-slate-800">
                                                <span className={`w-1.5 h-1.5 rounded-full ${detailCategory.showOnMenu ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                <span>{detailCategory.showOnMenu ? 'Đang hiển thị trên Menu' : 'Không ghim trên Menu'}</span>
                                            </dd>
                                        </div>

                                        <div className="space-y-1 pb-2 border-b border-slate-100">
                                            <dt className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Trang chủ Store</dt>
                                            <dd className="flex items-center gap-2 text-xs font-medium text-slate-800">
                                                <span className={`w-1.5 h-1.5 rounded-full ${detailCategory.isFeatured ? 'bg-amber-500' : 'bg-slate-400'}`} />
                                                <span>{detailCategory.isFeatured ? 'Nổi bật tại trang chủ' : 'Hiển thị bình thường'}</span>
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* MODAL 3: CHỈNH SỬA DANH MỤC (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isEditModalOpen}
                onClose={() => !isSubmitting && setIsEditModalOpen(false)}
                title={editingCategory ? `Chỉnh sửa: ${editingCategory.name}` : 'Chỉnh sửa danh mục'}
                subtitle="Cập nhật cấu trúc phân nhóm và mô tả trên backend API"
                icon={Edit}
                size="lg"
                tabs={categoryModalTabs}
                onSubmit={handleUpdateCategory}
                submitText={isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                isSubmitting={isSubmitting}
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <AdminInput
                                    label="Tên danh mục sản phẩm"
                                    required
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    placeholder="vd: PC Gaming Khủng"
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <AdminInput
                                        label="Đường dẫn tĩnh (Slug)"
                                        required
                                        value={editFormData.slug}
                                        onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value })}
                                        placeholder="vd: pc-gaming-khung"
                                        action={
                                            <AdminButton
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setEditFormData({ ...editFormData, slug: generateSlug(editFormData.name) })}
                                                icon={RefreshCw}
                                            >
                                                Tạo lại từ tên danh mục
                                            </AdminButton>
                                        }
                                        className="font-mono"
                                    />

                                    <AdminSelect
                                        label="Nhóm danh mục cha"
                                        value={editFormData.parentId || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, parentId: e.target.value || null })}
                                    >
                                        <option value="">— Không có (Danh mục gốc cấp 1) —</option>
                                        {allParentOptions
                                            .filter((rc) => rc.id !== editingCategory?.id)
                                            .map((rc) => (
                                                <option key={rc.id} value={rc.id}>
                                                    {rc.name} {rc.parentName && rc.parentName !== 'Danh mục gốc' ? `(thuộc ${rc.parentName})` : ''}
                                                </option>
                                            ))}
                                    </AdminSelect>
                                </div>

                                <AdminTextarea
                                    label="Mô tả chi tiết danh mục"
                                    rows={3}
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    placeholder="Mô tả công năng hoặc đặc tính nổi bật của danh mục..."
                                />
                            </div>
                        )}
                        {/* Tab 2: Hiển thị & Trạng thái */}
                        {activeTab === 'display' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                                        Trạng thái hiển thị danh mục
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${editFormData.status === 'ACTIVE'
                                                ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-semibold'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="edit-status"
                                                checked={editFormData.status === 'ACTIVE'}
                                                onChange={() => setEditFormData({ ...editFormData, status: 'ACTIVE' })}
                                                className="sr-only"
                                            />
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                            <div>
                                                <div className="text-xs font-semibold">Hiển thị</div>
                                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Khách hàng có thể xem và lọc sản phẩm</div>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${editFormData.status === 'HIDDEN'
                                                ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-semibold'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="edit-status"
                                                checked={editFormData.status === 'HIDDEN'}
                                                onChange={() => setEditFormData({ ...editFormData, status: 'HIDDEN' })}
                                                className="sr-only"
                                            />
                                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                            <div>
                                                <div className="text-xs font-semibold">Ẩn</div>
                                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">Ẩn khỏi menu và bộ lọc tìm kiếm</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
                                    <label className="flex items-start gap-3 py-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editFormData.isFeatured}
                                            onChange={(e) => setEditFormData({ ...editFormData, isFeatured: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-slate-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-900 block">
                                                Đánh dấu là danh mục nổi bật
                                            </span>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Hiển thị tại khu vực danh mục nổi bật trên trang chủ Store.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 py-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editFormData.showOnMenu}
                                            onChange={(e) => setEditFormData({ ...editFormData, showOnMenu: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-slate-300 mt-0.5"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-900 block">
                                                Ghim danh mục lên thanh điều hướng chính
                                            </span>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Hiển thị nút điều hướng trên Mega Menu Header.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 4: XÁC NHẬN XÓA DANH MỤC (AdminConfirmModal) */}
            <AdminConfirmModal
                isOpen={Boolean(deleteTargetCategory)}
                onClose={() => !isDeleting && setDeleteTargetCategory(null)}
                onConfirm={handleConfirmDelete}
                variant="danger"
                title="Xác nhận xóa danh mục"
                message={
                    <span>
                        Bạn có chắc chắn muốn xóa danh mục{' '}
                        <strong className="text-gray-900 font-bold">
                            "{deleteTargetCategory?.name}"
                        </strong>{' '}
                        khỏi hệ thống?
                    </span>
                }
                description="Hành động này sẽ thực hiện xóa mềm danh mục. Lưu ý: Chỉ danh mục không còn chứa danh mục con nào mới có thể xóa thành công."
                confirmText="Xác nhận xóa"
                cancelText="Hủy bỏ"
                isLoading={isDeleting}
                itemPreview={
                    deleteTargetCategory
                        ? {
                            title: deleteTargetCategory.name,
                            subtitle: `/${deleteTargetCategory.slug} • Nhóm: ${deleteTargetCategory.parentName}`,
                            badge: deleteTargetCategory.status === 'ACTIVE' ? 'Đang hiển thị' : 'Tạm ẩn',
                            avatar: deleteTargetCategory.image,
                        }
                        : undefined
                }
            />

            {/* MODAL 5: XÁC NHẬN CHUYỂN TRẠNG THÁI DANH MỤC (AdminConfirmModal) */}
            <AdminConfirmModal
                isOpen={Boolean(statusTargetCategory)}
                onClose={() => !isTogglingStatus && setStatusTargetCategory(null)}
                onConfirm={handleConfirmToggleStatus}
                variant={statusTargetCategory?.status === 'ACTIVE' ? 'warning' : 'success'}
                icon={statusTargetCategory?.status === 'ACTIVE' ? EyeOff : Eye}
                title={
                    statusTargetCategory?.status === 'ACTIVE'
                        ? 'Xác nhận tạm ẩn danh mục'
                        : 'Xác nhận hiển thị danh mục'
                }
                message={
                    <span>
                        Bạn có chắc chắn muốn{' '}
                        <strong>
                            {statusTargetCategory?.status === 'ACTIVE' ? 'tạm ẩn' : 'hiển thị'}
                        </strong>{' '}
                        danh mục{' '}
                        <strong className="text-gray-900 font-bold">
                            "{statusTargetCategory?.name}"
                        </strong>?
                    </span>
                }
                description={
                    statusTargetCategory?.status === 'ACTIVE'
                        ? 'Khi tạm ẩn, khách hàng sẽ không nhìn thấy danh mục này trên thanh menu và các bộ lọc tìm kiếm sản phẩm.'
                        : 'Khi kích hoạt, danh mục sẽ được hiển thị công khai trên giao diện người dùng và khách hàng có thể tra cứu bình thường.'
                }
                confirmText={
                    statusTargetCategory?.status === 'ACTIVE' ? 'Tạm ẩn danh mục' : 'Hiển thị danh mục'
                }
                cancelText="Hủy bỏ"
                isLoading={isTogglingStatus}
                itemPreview={
                    statusTargetCategory
                        ? {
                            title: statusTargetCategory.name,
                            subtitle: `/${statusTargetCategory.slug} • Nhóm: ${statusTargetCategory.parentName}`,
                            badge: statusTargetCategory.status === 'ACTIVE' ? 'Đang hiển thị' : 'Tạm ẩn',
                            avatar: statusTargetCategory.image,
                        }
                        : undefined
                }
            />
        </div>
    );
};

export default CategoryList;
