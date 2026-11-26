import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileCheck,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    XCircle,
    Calendar,
    Download,
    RefreshCw,
    Tag,
    ShieldCheck,
    Layers,
    Building2,
    Package,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
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
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import { adminCategoryService } from '../../../services/adminCategoryService';
import { adminBrandService } from '../../../services/adminBrandService';
import { adminProductService } from '../../../services/adminProductService';
import type {
    WarrantyPolicyResponse,
    WarrantyPolicyCreateRequest,
    WarrantyPolicyUpdateRequest,
} from '../../../types/adminWarranty';

interface PolicyUI {
    id: string;
    numericId: number;
    name: string;
    durationDays: number;
    durationMonths: number;
    description: string;
    targetType: any;
    targetTypeName: string;
    targetId: number | null;
    targetName: string;
    status: number;
    statusText: 'ACTIVE' | 'INACTIVE';
    createdDate: string;
    raw: WarrantyPolicyResponse;
}

// Fallback seed catalog reference data
const DEFAULT_CATEGORIES = [
    { id: 1, name: 'Bo mạch chủ (Mainboard)' },
    { id: 2, name: 'Bộ vi xử lý (CPU)' },
    { id: 3, name: 'Card màn hình (VGA)' },
    { id: 4, name: 'Nguồn máy tính (PSU)' },
    { id: 5, name: 'Bộ nhớ RAM' },
    { id: 6, name: 'Ổ cứng SSD / HDD' },
    { id: 7, name: 'Vỏ Case' },
    { id: 8, name: 'Tản nhiệt & Fan' },
    { id: 21001, name: 'Linh kiện Demo BH' },
];

const DEFAULT_BRANDS = [
    { id: 1, name: 'ASUS' },
    { id: 2, name: 'MSI' },
    { id: 3, name: 'Gigabyte' },
    { id: 4, name: 'Intel' },
    { id: 5, name: 'AMD' },
    { id: 6, name: 'Corsair' },
    { id: 7, name: 'Kingston' },
    { id: 21001, name: 'Warranty Test Brand' },
];

const DEFAULT_PRODUCTS = [
    { id: 101, name: 'Card Màn Hình ASUS ROG Strix GeForce RTX 4080 Super 16GB OC', code: 'VGA-ASUS-4080S' },
    { id: 102, name: 'CPU Intel Core i9-14900K (Up to 6.0GHz, 24 nhân 32 luồng)', code: 'CPU-INTEL-14900K' },
    { id: 103, name: 'RAM Corsair Dominator Titanium RGB 32GB (2x16GB) DDR5 6000MHz', code: 'RAM-COR-32G6000' },
    { id: 104, name: 'Nguồn máy tính Seasonic Prime TX-1000 1000W 80 Plus Titanium', code: 'PSU-SEA-1000TX' },
    { id: 105, name: 'Mainboard MSI MAG B660M MORTAR WIFI DDR4', code: 'MAIN-MSI-B660' },
    { id: 21001, name: 'Warranty Test Product', code: 'DEMO-BH-PRODUCT' },
];

export default function WarrantyPolicyList() {
    const { addToast } = useToast();

    // Data State
    const [loading, setLoading] = useState<boolean>(true);
    const [policies, setPolicies] = useState<PolicyUI[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [quickStatusTab, setQuickStatusTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    // Reference data for target selection
    const [categories, setCategories] = useState<Array<{ id: number; name: string }>>(DEFAULT_CATEGORIES);
    const [brands, setBrands] = useState<Array<{ id: number; name: string }>>(DEFAULT_BRANDS);
    const [products, setProducts] = useState<Array<{ id: number; name: string; code?: string }>>(DEFAULT_PRODUCTS);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState<boolean>(false);

    const [selectedPolicy, setSelectedPolicy] = useState<PolicyUI | null>(null);
    const [detailTab, setDetailTab] = useState<string>('info');

    // Form State
    const [formData, setFormData] = useState<{
        name: string;
        durationDays: number;
        description: string;
        targetType: string;
        targetId: string;
        status: number;
    }>({
        name: '',
        durationDays: 365,
        description: '',
        targetType: 'ALL',
        targetId: '',
        status: 1,
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Load reference catalog data
    useEffect(() => {
        async function loadRefData() {
            try {
                const [catRes, brandRes, prodRes] = await Promise.allSettled([
                    adminCategoryService.getAllCategories({ size: 100 }),
                    adminBrandService.getAllBrands({ size: 100 }),
                    adminProductService.getAllProducts({ size: 100 }),
                ]);

                if (catRes.status === 'fulfilled' && catRes.value?.content && catRes.value.content.length > 0) {
                    setCategories(catRes.value.content.map((c: any) => ({ id: c.id, name: c.name })));
                }
                if (brandRes.status === 'fulfilled' && brandRes.value?.content && brandRes.value.content.length > 0) {
                    setBrands(brandRes.value.content.map((b: any) => ({ id: b.id, name: b.name })));
                }
                if (prodRes.status === 'fulfilled' && prodRes.value?.content && prodRes.value.content.length > 0) {
                    setProducts(prodRes.value.content.map((p: any) => ({ id: p.id, name: p.name, code: p.code })));
                }
            } catch {
                // Keep default catalog reference data
            }
        }
        loadRefData();
    }, []);

    // Format target type label
    const getTargetTypeName = useCallback((type: any) => {
        if (type === null || type === undefined || type === '' || type === 'ALL' || type === 'GENERAL') {
            return 'Áp dụng toàn bộ (Chung)';
        }
        const strType = String(type).toUpperCase();
        if (strType === '0' || strType === 'CATEGORY') {
            return 'Danh mục sản phẩm';
        }
        if (strType === '1' || strType === 'PRODUCT') {
            return 'Sản phẩm cụ thể';
        }
        if (strType === '2' || strType === 'BRAND') {
            return 'Thương hiệu';
        }
        return 'Áp dụng chung';
    }, []);

    // Format target name
    const getTargetDisplayName = useCallback((type: any, targetId: any, itemTargetName?: string | null) => {
        if (type === null || type === undefined || type === '' || type === 'ALL' || type === 'GENERAL') {
            return itemTargetName && itemTargetName !== 'Tất cả sản phẩm' ? itemTargetName : 'Toàn bộ sản phẩm & linh kiện';
        }

        const strType = String(type).toUpperCase();
        const idNum = Number(targetId);

        if (strType === '0' || strType === 'CATEGORY') {
            const cat = categories.find((c) => Number(c.id) === idNum);
            if (cat) return cat.name;
            if (itemTargetName && itemTargetName !== 'Tất cả sản phẩm') return itemTargetName;
            return targetId ? `Danh mục #${targetId}` : 'Tất cả danh mục';
        }

        if (strType === '1' || strType === 'PRODUCT') {
            const prod = products.find((p) => Number(p.id) === idNum);
            if (prod) return `${prod.name} (${prod.code || prod.id})`;
            if (itemTargetName && itemTargetName !== 'Tất cả sản phẩm') return itemTargetName;
            return targetId ? `Sản phẩm #${targetId}` : 'Tất cả sản phẩm';
        }

        if (strType === '2' || strType === 'BRAND') {
            const brand = brands.find((b) => Number(b.id) === idNum);
            if (brand) return brand.name;
            if (itemTargetName && itemTargetName !== 'Tất cả sản phẩm') return itemTargetName;
            return targetId ? `Thương hiệu #${targetId}` : 'Tất cả thương hiệu';
        }

        return itemTargetName || 'Toàn bộ sản phẩm & linh kiện';
    }, [categories, products, brands]);

    // Fetch Policies
    const fetchPolicies = useCallback(async () => {
        setLoading(true);
        try {
            // Determine effective status filter
            let effectiveStatus: string | undefined = filters.status;
            if (quickStatusTab === 'ACTIVE') {
                effectiveStatus = 'ACTIVE';
            } else if (quickStatusTab === 'INACTIVE') {
                effectiveStatus = 'INACTIVE';
            }

            const res = await adminWarrantyService.getAllPolicies({
                keyword: searchQuery.trim() || undefined,
                status: effectiveStatus,
                targetType: filters.targetType || undefined,
                page: currentPage - 1,
                size: pageSize,
            });

            const mapped: PolicyUI[] = (res.content || []).map((p) => {
                const statusNum = Number(p.status) === 1 || p.status === 'ACTIVE' ? 1 : 0;
                const dDays = Number(p.durationDays) || 365;
                const dMonths = Math.round(dDays / 30);
                let createdFormatted = 'Chưa cập nhật';
                if (p.createdDate) {
                    try {
                        createdFormatted = new Date(p.createdDate).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        });
                    } catch {
                        createdFormatted = p.createdDate;
                    }
                }

                return {
                    id: String(p.id),
                    numericId: p.id,
                    name: p.name,
                    durationDays: dDays,
                    durationMonths: dMonths,
                    description: p.description || 'Không có mô tả',
                    targetType: p.targetType ?? null,
                    targetTypeName: getTargetTypeName(p.targetType),
                    targetId: p.targetId || null,
                    targetName: getTargetDisplayName(p.targetType, p.targetId, p.targetName),
                    status: statusNum,
                    statusText: statusNum === 1 ? 'ACTIVE' : 'INACTIVE',
                    createdDate: createdFormatted,
                    raw: p,
                };
            });

            setPolicies(mapped);
            const total = res.totalElements || mapped.length;
            setTotalElements(total);
            setTotalPages(Math.max(1, res.totalPages || Math.ceil(total / pageSize)));
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: error.message || 'Không thể tải danh sách chính sách bảo hành',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters, quickStatusTab, currentPage, pageSize, getTargetTypeName, getTargetDisplayName, addToast]);

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = totalElements || policies.length;
        const active = policies.filter((p) => p.status === 1).length;
        const inactive = policies.filter((p) => p.status === 0).length;
        const categoryScoped = policies.filter((p) => {
            const t = String(p.targetType).toUpperCase();
            return t === '0' || t === 'CATEGORY';
        }).length;
        return { total, active, inactive, categoryScoped };
    }, [policies, totalElements]);

    // Validation
    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) {
            errors.name = 'Vui lòng nhập tên chính sách bảo hành';
        } else if (formData.name.trim().length > 255) {
            errors.name = 'Tên chính sách không vượt quá 255 ký tự';
        }

        if (!formData.durationDays || formData.durationDays <= 0) {
            errors.durationDays = 'Thời hạn bảo hành phải lớn hơn 0 ngày';
        }

        if (formData.targetType !== 'ALL' && !formData.targetId) {
            errors.targetId = 'Vui lòng chọn đối tượng áp dụng cụ thể';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setFormData({
            name: '',
            durationDays: 365,
            description: '',
            targetType: 'ALL',
            targetId: '',
            status: 1,
        });
        setFormErrors({});
        setIsCreateOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (p: PolicyUI) => {
        setSelectedPolicy(p);
        let tType = 'ALL';
        if (p.targetType !== null && p.targetType !== undefined && p.targetType !== 'ALL') {
            const str = String(p.targetType).toUpperCase();
            if (str === '0' || str === 'CATEGORY') tType = '0';
            else if (str === '1' || str === 'PRODUCT') tType = '1';
            else if (str === '2' || str === 'BRAND') tType = '2';
        }
        setFormData({
            name: p.name,
            durationDays: p.durationDays,
            description: p.raw.description || '',
            targetType: tType,
            targetId: p.targetId ? String(p.targetId) : '',
            status: p.status,
        });
        setFormErrors({});
        setIsEditOpen(true);
    };

    // Open Detail Modal
    const handleOpenDetail = async (p: PolicyUI) => {
        setSelectedPolicy(p);
        setDetailTab('info');
        setIsDetailOpen(true);

        try {
            const fresh = await adminWarrantyService.getPolicyById(p.numericId);
            const active = fresh.status === 'ACTIVE' || fresh.status === 1;
            setSelectedPolicy((prev) =>
                prev && prev.numericId === fresh.id
                    ? {
                          ...prev,
                          name: fresh.name,
                          durationDays: fresh.durationDays,
                          description: fresh.description || prev.description,
                          status: active ? 1 : 0,
                          isActive: active,
                      }
                    : prev
            );
        } catch {
            // Keep optimistic row data if detail fetch fails
        }
    };

    // Submit Create
    const handleSubmitCreate = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const targetTypeMap: Record<string, 'CATEGORY' | 'PRODUCT' | 'BRAND'> = {
                '0': 'CATEGORY',
                '1': 'PRODUCT',
                '2': 'BRAND',
                CATEGORY: 'CATEGORY',
                PRODUCT: 'PRODUCT',
                BRAND: 'BRAND',
            };
            const targetTypeVal = formData.targetType === 'ALL' ? null : (targetTypeMap[formData.targetType] ?? null);
            const targetIdVal = !targetTypeVal || !formData.targetId ? null : Number(formData.targetId);

            const req: WarrantyPolicyCreateRequest = {
                name: formData.name.trim(),
                durationDays: Number(formData.durationDays),
                description: formData.description.trim() || undefined,
                targetType: targetTypeVal,
                targetId: targetIdVal,
                status: formData.status === 1 ? 'ACTIVE' : 'INACTIVE',
            };

            await adminWarrantyService.createPolicy(req);
            addToast({
                type: 'success',
                title: 'Thành công',
                message: `Đã tạo chính sách bảo hành "${formData.name}"`,
            });
            setIsCreateOpen(false);
            fetchPolicies();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Tạo chính sách thất bại',
                message: error.message || 'Không thể tạo mới chính sách bảo hành',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit Edit
    const handleSubmitEdit = async () => {
        if (!selectedPolicy || !validateForm()) return;
        setIsSubmitting(true);
        try {
            const targetTypeMap: Record<string, 'CATEGORY' | 'PRODUCT' | 'BRAND'> = {
                '0': 'CATEGORY',
                '1': 'PRODUCT',
                '2': 'BRAND',
                CATEGORY: 'CATEGORY',
                PRODUCT: 'PRODUCT',
                BRAND: 'BRAND',
            };
            const targetTypeVal = formData.targetType === 'ALL' ? null : (targetTypeMap[formData.targetType] ?? null);
            const targetIdVal = !targetTypeVal || !formData.targetId ? null : Number(formData.targetId);

            const req: WarrantyPolicyUpdateRequest = {
                name: formData.name.trim(),
                durationDays: Number(formData.durationDays),
                description: formData.description.trim() || undefined,
                targetType: targetTypeVal,
                targetId: targetIdVal,
                status: formData.status === 1 ? 'ACTIVE' : 'INACTIVE',
            };

            await adminWarrantyService.updatePolicy(selectedPolicy.numericId, req);
            addToast({
                type: 'success',
                title: 'Thành công',
                message: `Đã cập nhật chính sách bảo hành #${selectedPolicy.numericId}`,
            });
            setIsEditOpen(false);
            fetchPolicies();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Cập nhật thất bại',
                message: error.message || 'Không thể cập nhật chính sách bảo hành',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle Status
    const handleToggleStatus = (p: PolicyUI) => {
        setSelectedPolicy(p);
        setIsStatusConfirmOpen(true);
    };

    const handleConfirmStatusChange = async () => {
        if (!selectedPolicy) return;
        try {
            const newStatus = selectedPolicy.status === 1 ? 0 : 1;
            await adminWarrantyService.updatePolicyStatus(selectedPolicy.numericId, newStatus);
            addToast({
                type: 'success',
                title: 'Thành công',
                message: `Đã chuyển trạng thái chính sách sang ${newStatus === 1 ? 'Đang áp dụng' : 'Ngừng áp dụng'}`,
            });
            setIsStatusConfirmOpen(false);
            fetchPolicies();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Đổi trạng thái thất bại',
                message: error.message || 'Lỗi cập nhật trạng thái',
            });
        }
    };

    // Delete Policy
    const handleDeleteClick = (p: PolicyUI) => {
        setSelectedPolicy(p);
        setIsDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedPolicy) return;
        try {
            await adminWarrantyService.deletePolicy(selectedPolicy.numericId);
            addToast({
                type: 'success',
                title: 'Đã xóa',
                message: `Đã xóa chính sách bảo hành "${selectedPolicy.name}"`,
            });
            setIsDeleteOpen(false);
            fetchPolicies();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Xóa thất bại',
                message: error.message || 'Không thể xóa chính sách bảo hành',
            });
        }
    };

    // Export CSV
    const handleExport = () => {
        if (policies.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }
        const headers = ['Mã ID', 'Tên chính sách', 'Thời hạn (ngày)', 'Thời hạn (tháng)', 'Phạm vi áp dụng', 'Đối tượng cụ thể', 'Trạng thái', 'Mô tả', 'Ngày tạo'];
        const csvRows = policies.map((p) => [
            p.numericId,
            `"${p.name.replace(/"/g, '""')}"`,
            p.durationDays,
            p.durationMonths,
            `"${p.targetTypeName}"`,
            `"${p.targetName}"`,
            p.status === 1 ? 'Đang áp dụng' : 'Ngừng áp dụng',
            `"${p.description.replace(/"/g, '""')}"`,
            p.createdDate,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chinh-sach-bao-hanh-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã tải xuống file CSV chính sách bảo hành' });
    };

    // Table Columns
    const columns: Column<PolicyUI>[] = [
        {
            key: 'name',
            header: 'Mã & Tên chính sách',
            render: (item) => (
                <div className="max-w-md space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-slate-500 tabular-nums shrink-0">
                            #{item.numericId}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                            {item.name}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2">{item.description}</div>
                </div>
            ),
        },
        {
            key: 'targetTypeName',
            header: 'Phạm vi áp dụng',
            render: (item) => {
                const typeStr = String(item.targetType ?? '').toUpperCase();
                let scopeLabel = 'Toàn bộ (Chung)';
                if (typeStr === '0' || typeStr === 'CATEGORY') scopeLabel = 'Danh mục';
                else if (typeStr === '1' || typeStr === 'PRODUCT') scopeLabel = 'Sản phẩm';
                else if (typeStr === '2' || typeStr === 'BRAND') scopeLabel = 'Thương hiệu';

                return (
                    <div className="space-y-1 max-w-[260px]">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
                            {scopeLabel}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium text-slate-900 truncate" title={item.targetName}>
                                {item.targetName}
                            </span>
                            {item.targetId && (
                                <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                                    #{item.targetId}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'durationDays',
            header: 'Thời hạn bảo hành',
            align: 'right',
            render: (item) => (
                <div className="text-right tabular-nums whitespace-nowrap">
                    <div className="text-xs font-semibold text-slate-900">
                        {item.durationMonths} tháng
                    </div>
                    <div className="text-[11px] text-slate-500">{item.durationDays} ngày</div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => (
                <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    title="Nhấn để đổi trạng thái"
                    className="inline-flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.status === 1 ? 'bg-emerald-600' : 'bg-slate-400'
                        }`}
                    />
                    <span>{item.status === 1 ? 'Đang áp dụng' : 'Ngừng áp dụng'}</span>
                </button>
            ),
        },
        {
            key: 'createdDate',
            header: 'Ngày tạo',
            align: 'right',
            render: (item) => (
                <span className="text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {item.createdDate}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(item)}
                    viewLabel="Xem chi tiết chính sách"
                    onEdit={() => handleOpenEdit(item)}
                    editLabel="Chỉnh sửa chính sách"
                    onDelete={() => handleDeleteClick(item)}
                    deleteLabel="Xóa chính sách"
                    deleteDescription="Xóa chính sách bảo hành này"
                />
            ),
        },
    ];

    // Filter Fields for AdminFilter
    const filterFields: FilterField[] = [
        {
            name: 'targetType',
            label: 'Đối tượng áp dụng',
            type: 'select',
            placeholder: 'Tất cả đối tượng',
            options: [
                { label: 'Tất cả đối tượng', value: '' },
                { label: 'Theo danh mục sản phẩm', value: 'CATEGORY' },
                { label: 'Theo sản phẩm cụ thể', value: 'PRODUCT' },
                { label: 'Theo thương hiệu', value: 'BRAND' },
            ],
        },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang áp dụng', value: 'ACTIVE' },
                { label: 'Ngừng áp dụng', value: 'INACTIVE' },
            ],
        },
    ];

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleFilterChange = (newFilters: Record<string, any>) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handleFilterReset = () => {
        setSearchQuery('');
        setFilters({});
        setQuickStatusTab('ALL');
        setCurrentPage(1);
        addToast({ type: 'info', title: 'Đặt lại bộ lọc', message: 'Đã xóa toàn bộ bộ lọc chính sách bảo hành' });
    };

    const detailTabs: ModalTab[] = [
        { id: 'info', label: 'Thông tin chung', icon: FileCheck },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý chính sách bảo hành
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.total} chính sách · {stats.active} đang áp dụng · {stats.inactive} ngừng áp dụng
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />}
                        onClick={fetchPolicies}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất file
                    </AdminButton>
                    <AdminButton variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
                        Thêm chính sách
                    </AdminButton>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto">
                {(
                    [
                        { id: 'ALL', label: 'Tất cả chính sách', count: stats.total },
                        { id: 'ACTIVE', label: 'Đang áp dụng', count: stats.active },
                        { id: 'INACTIVE', label: 'Ngừng áp dụng', count: stats.inactive },
                    ] as const
                ).map((tab) => {
                    const isActive = quickStatusTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setQuickStatusTab(tab.id);
                                setCurrentPage(1);
                            }}
                            className={`pb-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-blue-600 ${
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.5 rounded-md text-xs font-medium tabular-nums ${
                                    isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Table */}
            <div className="space-y-4">
                <AdminFilter
                    fields={filterFields}
                    searchPlaceholder="Tìm theo tên chính sách hoặc mô tả..."
                    searchQuery={searchQuery}
                    onSearchChange={handleSearch}
                    values={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleFilterReset}
                />

                <AdminTable
                    columns={columns}
                    data={policies}
                    rowKey="id"
                    loading={loading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalElements}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 15, 20, 50]}
                    onPageChange={(page) => setCurrentPage(page)}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    showPagination={true}
                    showPageSizeSelector={true}
                    itemUnitName="chính sách"
                    emptyText="Chưa có chính sách bảo hành nào phù hợp với bộ lọc"
                />
            </div>

            {/* Modal Create Policy */}
            <AdminModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Thêm mới chính sách bảo hành"
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleSubmitCreate} isLoading={isSubmitting}>
                            Lưu chính sách
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <AdminLabel required>Tên chính sách bảo hành</AdminLabel>
                        <AdminInput
                            placeholder="Ví dụ: Bảo hành Tiêu chuẩn VGA 36 Tháng..."
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={formErrors.name}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel required>Thời hạn bảo hành (Số ngày)</AdminLabel>
                            <AdminInput
                                type="number"
                                min="1"
                                placeholder="365"
                                value={formData.durationDays}
                                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                                error={formErrors.durationDays}
                                className="font-mono tabular-nums"
                            />
                            <p className="text-xs text-slate-500 mt-1 tabular-nums">
                                Tương đương: ~{Math.round(formData.durationDays / 30)} tháng
                            </p>
                        </div>

                        <div>
                            <AdminLabel>Trạng thái kích hoạt</AdminLabel>
                            <AdminSelect
                                value={String(formData.status)}
                                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                                options={[
                                    { label: 'Đang áp dụng (Hoạt động)', value: '1' },
                                    { label: 'Tạm dừng (Ngừng áp dụng)', value: '0' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel>Phạm vi đối tượng áp dụng</AdminLabel>
                            <AdminSelect
                                value={formData.targetType}
                                onChange={(e) =>
                                    setFormData({ ...formData, targetType: e.target.value, targetId: '' })
                                }
                                options={[
                                    { label: 'Áp dụng toàn bộ linh kiện (Chung)', value: 'ALL' },
                                    { label: 'Áp dụng theo danh mục sản phẩm', value: '0' },
                                    { label: 'Áp dụng cho sản phẩm cụ thể', value: '1' },
                                    { label: 'Áp dụng theo thương hiệu', value: '2' },
                                ]}
                            />
                        </div>

                        {formData.targetType !== 'ALL' && (
                            <div>
                                <AdminLabel required>
                                    {formData.targetType === '0'
                                        ? 'Chọn danh mục mục tiêu áp dụng'
                                        : formData.targetType === '1'
                                            ? 'Chọn sản phẩm mục tiêu áp dụng'
                                            : 'Chọn thương hiệu mục tiêu áp dụng'}
                                </AdminLabel>
                                <AdminSelect
                                    value={formData.targetId}
                                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                                    options={[
                                        { label: '-- Vui lòng chọn đối tượng mục tiêu --', value: '' },
                                        ...(formData.targetType === '0'
                                            ? categories.map((c) => ({ label: `Danh mục: ${c.name}`, value: String(c.id) }))
                                            : formData.targetType === '1'
                                                ? products.map((p) => ({
                                                    label: `${p.name} (${p.code || p.id})`,
                                                    value: String(p.id),
                                                }))
                                                : brands.map((b) => ({ label: `Thương hiệu: ${b.name}`, value: String(b.id) }))),
                                    ]}
                                    error={formErrors.targetId}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <AdminLabel>Mô tả và cam kết điều khoản bảo hành</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Chi tiết về chính sách 1 đổi 1, điều kiện tiếp nhận và phạm vi bảo hành..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </AdminModal>

            {/* Modal Edit Policy */}
            <AdminModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title={`Chỉnh sửa chính sách #${selectedPolicy?.numericId}`}
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleSubmitEdit} isLoading={isSubmitting}>
                            Cập nhật
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <AdminLabel required>Tên chính sách bảo hành</AdminLabel>
                        <AdminInput
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={formErrors.name}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel required>Thời hạn bảo hành (Số ngày)</AdminLabel>
                            <AdminInput
                                type="number"
                                min="1"
                                value={formData.durationDays}
                                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                                error={formErrors.durationDays}
                                className="font-mono tabular-nums"
                            />
                            <p className="text-xs text-slate-500 mt-1 tabular-nums">
                                Tương đương: ~{Math.round(formData.durationDays / 30)} tháng
                            </p>
                        </div>

                        <div>
                            <AdminLabel>Trạng thái kích hoạt</AdminLabel>
                            <AdminSelect
                                value={String(formData.status)}
                                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                                options={[
                                    { label: 'Đang áp dụng (Hoạt động)', value: '1' },
                                    { label: 'Tạm dừng (Ngừng áp dụng)', value: '0' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel>Phạm vi đối tượng áp dụng</AdminLabel>
                            <AdminSelect
                                value={formData.targetType}
                                onChange={(e) =>
                                    setFormData({ ...formData, targetType: e.target.value, targetId: '' })
                                }
                                options={[
                                    { label: 'Áp dụng toàn bộ linh kiện (Chung)', value: 'ALL' },
                                    { label: 'Áp dụng theo danh mục sản phẩm', value: '0' },
                                    { label: 'Áp dụng cho sản phẩm cụ thể', value: '1' },
                                    { label: 'Áp dụng theo thương hiệu', value: '2' },
                                ]}
                            />
                        </div>

                        {formData.targetType !== 'ALL' && (
                            <div>
                                <AdminLabel required>
                                    {formData.targetType === '0'
                                        ? 'Chọn danh mục mục tiêu áp dụng'
                                        : formData.targetType === '1'
                                            ? 'Chọn sản phẩm mục tiêu áp dụng'
                                            : 'Chọn thương hiệu mục tiêu áp dụng'}
                                </AdminLabel>
                                <AdminSelect
                                    value={formData.targetId}
                                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                                    options={[
                                        { label: '-- Vui lòng chọn đối tượng mục tiêu --', value: '' },
                                        ...(formData.targetType === '0'
                                            ? categories.map((c) => ({ label: `Danh mục: ${c.name}`, value: String(c.id) }))
                                            : formData.targetType === '1'
                                                ? products.map((p) => ({
                                                    label: `${p.name} (${p.code || p.id})`,
                                                    value: String(p.id),
                                                }))
                                                : brands.map((b) => ({ label: `Thương hiệu: ${b.name}`, value: String(b.id) }))),
                                    ]}
                                    error={formErrors.targetId}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <AdminLabel>Mô tả và cam kết điều khoản bảo hành</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </AdminModal>

            {/* Modal Detail Policy */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Chi tiết chính sách bảo hành"
                size="md"
                tabs={detailTabs}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                footer={
                    <AdminButton variant="secondary" onClick={() => setIsDetailOpen(false)}>
                        Đóng
                    </AdminButton>
                }
            >
                {selectedPolicy && (
                    <div className="space-y-4">
                        {detailTab === 'info' && (
                            <div className="space-y-4">
                                {/* Flat summary header strip */}
                                <div className="px-4 py-3 bg-slate-50 rounded-md border border-slate-200 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                                            ID #{selectedPolicy.numericId}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    selectedPolicy.status === 1 ? 'bg-emerald-600' : 'bg-slate-400'
                                                }`}
                                            />
                                            {selectedPolicy.status === 1 ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                                        </span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {selectedPolicy.name}
                                    </div>
                                </div>

                                {/* Flat 2-column metadata grid (no card-in-card) */}
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-1">
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Thời hạn bảo hành</dt>
                                        <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                                            {selectedPolicy.durationMonths} tháng ({selectedPolicy.durationDays} ngày)
                                        </dd>
                                    </div>
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Ngày tạo chính sách</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                                            {selectedPolicy.createdDate}
                                        </dd>
                                    </div>
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Loại phạm vi</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900">
                                            {selectedPolicy.targetTypeName}
                                        </dd>
                                    </div>
                                    <div className="border-b border-slate-100 pb-2">
                                        <dt className="text-slate-500">Đối tượng mục tiêu</dt>
                                        <dd className="mt-0.5 font-medium text-slate-900">
                                            {selectedPolicy.targetName}
                                            {selectedPolicy.targetId && (
                                                <span className="ml-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
                                                    #{selectedPolicy.targetId}
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                {/* Flat description block */}
                                <div className="p-3.5 rounded-md border border-slate-200 bg-white space-y-1">
                                    <div className="text-xs font-medium text-slate-500">
                                        Mô tả &amp; điều khoản bảo hành
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                        {selectedPolicy.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {detailTab === 'scope' && (
                            <div className="space-y-4 text-xs">
                                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                                        <span className="text-slate-500">Phân loại phạm vi</span>
                                        <span className="font-medium text-slate-900">{selectedPolicy.targetTypeName}</span>
                                    </div>
                                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                                        <span className="text-slate-500 shrink-0">Đối tượng mục tiêu</span>
                                        <span className="font-medium text-slate-900 text-right">{selectedPolicy.targetName}</span>
                                    </div>
                                    {selectedPolicy.targetId && (
                                        <div className="px-3.5 py-2.5 flex items-center justify-between">
                                            <span className="text-slate-500">Mã định danh đối tượng</span>
                                            <span className="font-mono font-medium text-slate-900 tabular-nums">
                                                #{selectedPolicy.targetId}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-amber-50 rounded-md border border-amber-200 flex gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-800 leading-relaxed">
                                        Khi đơn hàng giao hoàn tất hoặc xuất kho thành công, hệ thống tự động dò tìm chính sách phù hợp nhất (thứ tự ưu tiên: Sản phẩm cụ thể &gt; Danh mục &gt; Thương hiệu &gt; Toàn bộ hệ thống) để kích hoạt thời hạn bảo hành cho từng số Serial linh kiện.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* Modal Confirm Status Change */}
            <AdminConfirmModal
                isOpen={isStatusConfirmOpen}
                onClose={() => setIsStatusConfirmOpen(false)}
                onConfirm={handleConfirmStatusChange}
                title="Xác nhận thay đổi trạng thái"
                message={`Bạn có chắc chắn muốn chuyển trạng thái chính sách "${selectedPolicy?.name}" sang ${selectedPolicy?.status === 1 ? '"Ngừng áp dụng"' : '"Đang áp dụng"'
                    }?`}
                confirmText="Xác nhận"
                cancelText="Hủy"
                variant="warning"
            />

            {/* Modal Confirm Delete */}
            <AdminConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Xác nhận xóa chính sách bảo hành"
                message={`Bạn có chắc chắn muốn xóa chính sách bảo hành "${selectedPolicy?.name}"? Các sản phẩm đã áp dụng trước đó vẫn được bảo lưu thời hạn.`}
                confirmText="Xóa chính sách"
                cancelText="Hủy"
                variant="danger"
            />
        </div>
    );
}
