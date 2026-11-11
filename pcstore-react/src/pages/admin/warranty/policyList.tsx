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
import { AdminTable, type Column } from '../../../components/admin/common/table';
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
                effectiveStatus = '1';
            } else if (quickStatusTab === 'INACTIVE') {
                effectiveStatus = '0';
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
    const handleOpenDetail = (p: PolicyUI) => {
        setSelectedPolicy(p);
        setDetailTab('info');
        setIsDetailOpen(true);
    };

    // Submit Create
    const handleSubmitCreate = async () => {
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const targetTypeVal = formData.targetType === 'ALL' ? null : Number(formData.targetType);
            const targetIdVal = formData.targetType === 'ALL' || !formData.targetId ? null : Number(formData.targetId);
            const targetNameVal = getTargetDisplayName(targetTypeVal, targetIdVal);

            const req: any = {
                name: formData.name.trim(),
                durationDays: Number(formData.durationDays),
                description: formData.description.trim() || undefined,
                targetType: targetTypeVal as any,
                targetId: targetIdVal,
                targetName: targetNameVal,
                status: formData.status as any,
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
            const targetTypeVal = formData.targetType === 'ALL' ? null : Number(formData.targetType);
            const targetIdVal = formData.targetType === 'ALL' || !formData.targetId ? null : Number(formData.targetId);
            const targetNameVal = getTargetDisplayName(targetTypeVal, targetIdVal);

            const req: any = {
                name: formData.name.trim(),
                durationDays: Number(formData.durationDays),
                description: formData.description.trim() || undefined,
                targetType: targetTypeVal as any,
                targetId: targetIdVal,
                targetName: targetNameVal,
                status: formData.status as any,
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
            key: 'numericId',
            header: 'Mã ID',
            render: (item) => (
                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                    <span className="font-semibold text-indigo-600">#{item.numericId}</span>
                </div>
            ),
        },
        {
            key: 'name',
            header: 'Tên chính sách bảo hành',
            render: (item) => (
                <div className="max-w-md">
                    <div className="font-medium text-slate-900 line-clamp-1">{item.name}</div>
                    <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</div>
                </div>
            ),
        },
        {
            key: 'durationDays',
            header: 'Thời hạn bảo hành',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" />
                        {item.durationDays} ngày ({item.durationMonths} tháng)
                    </span>
                </div>
            ),
        },
        {
            key: 'targetTypeName',
            header: 'Đối tượng mục tiêu bảo hành',
            render: (item) => {
                const typeStr = String(item.targetType ?? '').toUpperCase();
                const isGeneral = item.targetType === null || item.targetType === undefined || typeStr === '' || typeStr === 'ALL';
                const isCategory = typeStr === '0' || typeStr === 'CATEGORY';
                const isProduct = typeStr === '1' || typeStr === 'PRODUCT';
                const isBrand = typeStr === '2' || typeStr === 'BRAND';

                return (
                    <div className="space-y-1.5 max-w-xs">
                        <div>
                            {isGeneral && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    <Layers className="w-3 h-3 text-slate-500" />
                                    Áp dụng toàn bộ (Chung)
                                </span>
                            )}
                            {isCategory && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Layers className="w-3 h-3 text-blue-600" />
                                    Theo Danh mục
                                </span>
                            )}
                            {isProduct && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                    <Package className="w-3 h-3 text-purple-600" />
                                    Theo Sản phẩm
                                </span>
                            )}
                            {isBrand && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Building2 className="w-3 h-3 text-emerald-600" />
                                    Theo Thương hiệu
                                </span>
                            )}
                        </div>

                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="text-slate-900 line-clamp-2">{item.targetName}</span>
                            {item.targetId && (
                                <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100 shrink-0">
                                    #{item.targetId}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => (
                <button
                    onClick={() => handleToggleStatus(item)}
                    title="Nhấn để đổi trạng thái"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${item.status === 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                >
                    {item.status === 1 ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Đang áp dụng
                        </>
                    ) : (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Ngừng áp dụng
                        </>
                    )}
                </button>
            ),
        },
        {
            key: 'createdDate',
            header: 'Ngày tạo',
            render: (item) => <span className="text-xs text-slate-600">{item.createdDate}</span>,
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => handleOpenDetail(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Xem chi tiết"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        title="Chỉnh sửa"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Xóa chính sách"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
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
                { label: 'Toàn bộ hệ thống (Chung)', value: 'null' },
                { label: 'Theo danh mục sản phẩm', value: '0' },
                { label: 'Theo sản phẩm cụ thể', value: '1' },
                { label: 'Theo thương hiệu', value: '2' },
            ],
        },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang áp dụng', value: '1' },
                { label: 'Ngừng áp dụng', value: '0' },
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
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                            <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Quản lý chính sách bảo hành</h1>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
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

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng chính sách</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang áp dụng</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tạm dừng áp dụng</p>
                        <p className="text-2xl font-bold text-slate-600 mt-1">{stats.inactive}</p>
                    </div>
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                        <XCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Theo danh mục</p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.categoryScoped}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <button
                    onClick={() => {
                        setQuickStatusTab('ALL');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${quickStatusTab === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    Tất cả chính sách ({stats.total})
                </button>
                <button
                    onClick={() => {
                        setQuickStatusTab('ACTIVE');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${quickStatusTab === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đang áp dụng ({stats.active})
                </button>
                <button
                    onClick={() => {
                        setQuickStatusTab('INACTIVE');
                        setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${quickStatusTab === 'INACTIVE'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                >
                    <XCircle className="w-3.5 h-3.5" />
                    Ngừng áp dụng ({stats.inactive})
                </button>
            </div>

            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                searchPlaceholder="Tìm theo tên chính sách hoặc mô tả..."
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                values={filters}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
            />

            {/* Table with Pagination */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                            />
                            <p className="text-xs text-slate-500 mt-1">
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
                            />
                            <p className="text-xs text-slate-500 mt-1">
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
                            <div className="space-y-3">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500 uppercase font-semibold">Tên chính sách</div>
                                    <div className="text-base font-bold text-slate-900 mt-1">{selectedPolicy.name}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                            ID: #{selectedPolicy.numericId}
                                        </span>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedPolicy.status === 1
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-200 text-slate-700'
                                                }`}
                                        >
                                            {selectedPolicy.status === 1 ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500">Thời hạn</div>
                                        <div className="text-lg font-bold text-slate-900 mt-0.5">
                                            {selectedPolicy.durationDays} ngày ({selectedPolicy.durationMonths} Tháng)
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                        <div className="text-xs text-indigo-700 font-semibold uppercase">Loại phạm vi</div>
                                        <div className="text-base font-bold text-slate-900 mt-1">
                                            {selectedPolicy.targetTypeName}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border border-slate-200">
                                        <div className="text-xs text-slate-500">Đối tượng mục tiêu được bảo hành</div>
                                        <div className="text-sm font-semibold text-indigo-700 mt-1">
                                            {selectedPolicy.targetName}
                                        </div>
                                        {selectedPolicy.targetId && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Mã định danh đối tượng: #{selectedPolicy.targetId}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-500 font-medium">Mô tả chi tiết</div>
                                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">
                                        {selectedPolicy.description}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                                    Ngày tạo chính sách: {selectedPolicy.createdDate}
                                </div>
                            </div>
                        )}

                        {detailTab === 'scope' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                                    <div className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                        Quy tắc đối tượng được bảo hành
                                    </div>
                                    <p className="text-xs text-indigo-900 leading-relaxed">
                                        Chính sách này sẽ được hệ thống tự động gán cho các thiết bị &amp; linh kiện thỏa mãn:
                                    </p>
                                    <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-600">Phân loại phạm vi:</span>
                                        <span className="font-bold text-indigo-700">{selectedPolicy.targetTypeName}</span>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-600">Đối tượng mục tiêu cụ thể:</span>
                                        <span className="font-bold text-slate-900">{selectedPolicy.targetName}</span>
                                    </div>
                                    {selectedPolicy.targetId && (
                                        <div className="p-3 bg-white rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-600">Mã định danh đối tượng (Target ID):</span>
                                            <span className="font-mono font-bold text-slate-700">#{selectedPolicy.targetId}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2.5">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
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
