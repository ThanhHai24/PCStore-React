import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    Download,
    Package,
    Phone,
    Mail,
    MapPin,
    Copy,
    RefreshCw,
    Loader2,
    AlertCircle,
    User,
    Calendar,
    Clock,
    XCircle,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { adminSupplierService } from '../../../services/adminSupplierService';
import type {
    SupplierResponse,
    SupplierCreateRequest,
    SupplierUpdateRequest,
    BackendSupplierStatus,
} from '../../../types/adminSupplier';

export interface SupplierItem {
    id: string; // Used as table rowKey
    numericId: number;
    code: string;
    name: string;
    companyName: string;
    taxCode: string;
    logo: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    contactPerson: {
        name: string;
        phone: string;
        email: string;
        role: string;
    };
    status: BackendSupplierStatus;
    createdDate?: string | null;
    createdBy?: number | null;
    lastModifiedDate?: string | null;
    lastModifiedBy?: number | null;
}
/**
 * Format ngày giờ hiển thị kiểu Việt Nam
 */
function formatDateTime(isoString?: string | null): string {
    if (!isoString) return 'Chưa cập nhật';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return isoString;
    }
}

/**
 * Chuyển đổi dữ liệu từ Backend sang Model hiển thị
 */
export const mapBackendSupplierToItem = (b: SupplierResponse): SupplierItem => {
    const city = b.address?.trim() || '';
    const cleanPhone = b.phoneNumber?.trim() || '';

    // Tạo avatar hiển thị nhận diện cho nhà cung cấp
    const initials = (b.name || b.code || 'NC')
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        initials || b.name
    )}&background=0284c7&color=ffffff&bold=true&size=160`;

    return {
        id: String(b.id),
        numericId: b.id,
        code: b.code,
        name: b.name,
        companyName: b.name,
        taxCode: b.taxCode?.trim() || '---',
        logo: avatarUrl,
        email: b.email,
        phone: cleanPhone || '---',
        address: b.address?.trim() || 'Chưa cập nhật địa chỉ',
        city,
        contactPerson: {
            name: b.contactPerson?.trim() || 'Chưa có thông tin',
            phone: cleanPhone || '---',
            email: b.email,
            role: 'Đại diện kinh doanh',
        },
        status:
            b.status === 'ACTIVE' ||
                (b as any).status === 1 ||
                (b as any).status === '1'
                ? 'ACTIVE'
                : 'INACTIVE',
        createdDate: formatDateTime(b.createdDate),
        createdBy: b.createdBy,
        lastModifiedDate: formatDateTime(b.lastModifiedDate),
        lastModifiedBy: b.lastModifiedBy,
    };
};

export default function SupplierList() {
    const { toast } = useToast();

    // Data State
    const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Search, Filters & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [quickStatus, setQuickStatus] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

    // Confirmation Modals
    const [deleteTargetSupplier, setDeleteTargetSupplier] = useState<SupplierItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [statusTargetSupplier, setStatusTargetSupplier] = useState<SupplierItem | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Detail Modal Tabs & Related Orders
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'orders'>('overview');
    const [supplierOrders, setSupplierOrders] = useState<any[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

    // Add / Edit Modal Active Tab
    const [activeAddTab, setActiveAddTab] = useState('basic');
    const [activeEditTab, setActiveEditTab] = useState('basic');

    // Add Form State
    const initialAddFormState = {
        code: '',
        name: '',
        contactPerson: '',
        email: '',
        phoneNumber: '',
        address: '',
        taxCode: '',
        status: 'ACTIVE' as BackendSupplierStatus,
    };
    const [addForm, setAddForm] = useState(initialAddFormState);

    // Edit Form State
    const [editForm, setEditForm] = useState<{
        id: number;
        code: string;
        name: string;
        contactPerson: string;
        email: string;
        phoneNumber: string;
        address: string;
        taxCode: string;
        status: BackendSupplierStatus;
    } | null>(null);

    // Filter fields configuration for AdminFilter
    const filterFields: FilterField[] = [
        {
            id: 'status',
            label: 'Trạng thái hoạt động',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                { label: 'Đang hợp tác (ACTIVE)', value: 'ACTIVE' },
                { label: 'Ngừng hợp tác (INACTIVE)', value: 'INACTIVE' },
            ],
        },
    ];

    /**
     * Tải danh sách nhà cung cấp từ API
     */
    const loadSuppliers = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                // Xác định trạng thái cần lọc
                let statusParam: BackendSupplierStatus | undefined = undefined;
                if (filters.status === 'ACTIVE' || filters.status === 'INACTIVE') {
                    statusParam = filters.status;
                }

                const response = await adminSupplierService.getAllSuppliers({
                    keyword: searchQuery.trim() || undefined,
                    status: statusParam,
                    page: currentPage - 1, // API backend dùng 0-based index
                    size: pageSize,
                    sort: ['createdDate,DESC', 'id,DESC'],
                });

                const mappedItems = response.content.map(mapBackendSupplierToItem);
                setSuppliers(mappedItems);
                setTotalElements(response.totalElements);
                setTotalPages(Math.max(1, response.totalPages));
            } catch (err: any) {
                const errorMsg = err?.message || 'Không thể tải danh sách nhà cung cấp từ máy chủ';
                setError(errorMsg);
                toast.error(errorMsg, 'Lỗi kết nối');
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [searchQuery, filters.status, quickStatus, currentPage, pageSize, toast]
    );

    // Gọi loadSuppliers khi dependencies thay đổi
    useEffect(() => {
        loadSuppliers();
    }, [loadSuppliers]);

    // Summary Metrics
    const activeCount = useMemo(
        () => suppliers.filter((s) => s.status === 'ACTIVE').length,
        [suppliers]
    );
    const inactiveCount = useMemo(
        () => suppliers.filter((s) => s.status === 'INACTIVE').length,
        [suppliers]
    );

    // Handlers Tìm kiếm & Bộ lọc
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
        setQuickStatus('ALL');
        setCurrentPage(1);
        toast.info('Đã đặt lại toàn bộ bộ lọc tìm kiếm', 'Làm mới');
    };

    /**
     * Xuất danh sách hiện tại ra file CSV/Excel UTF-8
     */
    const handleExportExcel = () => {
        if (suppliers.length === 0) {
            toast.warning('Không có dữ liệu nhà cung cấp để xuất', 'Thông báo');
            return;
        }

        const headers = [
            'ID',
            'Mã NCC',
            'Tên Nhà Cung Cấp',
            'Mã Số Thuế',
            'Email',
            'Số Điện Thoại',
            'Người Đại Diện',
            'Địa Chỉ',
            'Tỉnh / TP',
            'Trạng Thái',
            'Ngày Tạo',
        ];

        const rows = suppliers.map((s) => [
            `"${s.numericId}"`,
            `"${s.code}"`,
            `"${s.name}"`,
            `"${s.taxCode}"`,
            `"${s.email}"`,
            `"${s.phone}"`,
            `"${s.contactPerson.name}"`,
            `"${s.address}"`,
            `"${s.city}"`,
            `"${s.status === 'ACTIVE' ? 'Đang hợp tác' : 'Ngừng hợp tác'}"`,
            `"${s.createdDate}"`,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,\uFEFF' +
            [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `danh_sach_nha_cung_cap_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(
            `Đã xuất thành công ${suppliers.length} nhà cung cấp ra file CSV/Excel!`,
            'Xuất file thành công'
        );
    };

    /**
     * Chuyển đổi trạng thái nhanh (ACTIVE <-> INACTIVE)
     */
    const handleToggleStatus = (supplier: SupplierItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setStatusTargetSupplier(supplier);
    };

    const handleConfirmToggleStatus = async () => {
        if (!statusTargetSupplier) return;
        const nextStatus: BackendSupplierStatus =
            statusTargetSupplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

        setIsTogglingStatus(true);
        try {
            await adminSupplierService.updateSupplierStatus(
                statusTargetSupplier.numericId,
                nextStatus
            );
            toast.success(
                `Đã chuyển trạng thái nhà cung cấp "${statusTargetSupplier.name}" sang ${nextStatus === 'ACTIVE' ? 'Đang hợp tác' : 'Ngừng hợp tác'
                }`,
                'Thành công'
            );
            setStatusTargetSupplier(null);
            loadSuppliers();
        } catch (err: any) {
            toast.error(
                err?.message || 'Không thể cập nhật trạng thái nhà cung cấp',
                'Lỗi thao tác'
            );
        } finally {
            setIsTogglingStatus(false);
        }
    };

    /**
     * Mở Modal xem chi tiết
     */
    const handleOpenDetail = async (supplier: SupplierItem) => {
        setSelectedSupplier(supplier);
        setActiveDetailTab('overview');
        setIsDetailModalOpen(true);
        setSupplierOrders([]);

        // Tải đơn nhập hàng nếu có
        setIsLoadingOrders(true);
        try {
            const orders = await adminSupplierService.getSupplierOrders(supplier.numericId);
            setSupplierOrders(orders);
        } catch {
            setSupplierOrders([]);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    /**
     * Mở Modal chỉnh sửa
     */
    const handleOpenEdit = (supplier: SupplierItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedSupplier(supplier);
        setEditForm({
            id: supplier.numericId,
            code: supplier.code,
            name: supplier.name,
            contactPerson:
                supplier.contactPerson.name === 'Chưa có thông tin'
                    ? ''
                    : supplier.contactPerson.name,
            email: supplier.email,
            phoneNumber: supplier.phone === '---' ? '' : supplier.phone,
            address:
                supplier.address === 'Chưa cập nhật địa chỉ' ? '' : supplier.address,
            taxCode: supplier.taxCode === '---' ? '' : supplier.taxCode,
            status: supplier.status,
        });
        setActiveEditTab('basic');
        setIsEditModalOpen(true);
    };

    /**
     * Mở Modal xóa
     */
    const handleOpenDelete = (supplier: SupplierItem, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDeleteTargetSupplier(supplier);
    };

    /**
     * Xác nhận xóa nhà cung cấp
     */
    const handleConfirmDelete = async () => {
        if (!deleteTargetSupplier) return;
        setIsDeleting(true);
        try {
            await adminSupplierService.deleteSupplier(deleteTargetSupplier.numericId);
            toast.success(
                `Đã xóa thành công nhà cung cấp "${deleteTargetSupplier.name}"`,
                'Xóa thành công'
            );
            setDeleteTargetSupplier(null);
            loadSuppliers();
        } catch (err: any) {
            toast.error(
                err?.message || 'Không thể xóa nhà cung cấp. Vui lòng thử lại sau.',
                'Lỗi xóa nhà cung cấp'
            );
        } finally {
            setIsDeleting(false);
        }
    };

    /**
     * Lưu thêm mới nhà cung cấp
     */
    const handleSaveAdd = async () => {
        const trimmedCode = addForm.code.trim().toUpperCase();
        const trimmedName = addForm.name.trim();
        const trimmedEmail = addForm.email.trim();
        const cleanPhone = addForm.phoneNumber.replace(/[\s\-.]/g, '');

        if (!trimmedName) {
            toast.error('Vui lòng nhập tên nhà cung cấp', 'Thiếu thông tin');
            return;
        }
        if (!trimmedCode) {
            toast.error('Vui lòng nhập mã nhà cung cấp', 'Thiếu thông tin');
            return;
        }
        if (!trimmedEmail) {
            toast.error('Vui lòng nhập email chính thức của nhà cung cấp', 'Thiếu thông tin');
            return;
        }

        // Kiểm tra định dạng email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            toast.error('Định dạng email không hợp lệ (ví dụ: contact@asus.vn)', 'Sai định dạng');
            return;
        }

        // Kiểm tra số điện thoại nếu có nhập
        if (cleanPhone) {
            const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
            if (!phoneRegex.test(cleanPhone)) {
                toast.error(
                    'Số điện thoại không hợp lệ (Phải bắt đầu bằng 0 hoặc +84 và gồm 10-11 chữ số)',
                    'Sai định dạng'
                );
                return;
            }
        }

        const payload: SupplierCreateRequest = {
            code: trimmedCode,
            name: trimmedName,
            email: trimmedEmail,
            contactPerson: addForm.contactPerson.trim() || undefined,
            phoneNumber: cleanPhone || undefined,
            address: addForm.address.trim() || undefined,
            taxCode: addForm.taxCode.trim() || undefined,
            status: addForm.status,
        };

        setIsSubmitting(true);
        try {
            const created = await adminSupplierService.createSupplier(payload);
            toast.success(
                `Đã thêm thành công nhà cung cấp "${created.name}" (${created.code})`,
                'Thêm mới thành công'
            );
            setIsAddModalOpen(false);
            setAddForm(initialAddFormState);
            loadSuppliers();
        } catch (err: any) {
            toast.error(
                err?.message || 'Không thể tạo mới nhà cung cấp. Vui lòng kiểm tra lại dữ liệu.',
                'Lỗi thêm mới'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Lưu chỉnh sửa nhà cung cấp
     */
    const handleSaveEdit = async () => {
        if (!editForm) return;

        const trimmedCode = editForm.code.trim().toUpperCase();
        const trimmedName = editForm.name.trim();
        const trimmedEmail = editForm.email.trim();
        const cleanPhone = editForm.phoneNumber.replace(/[\s\-.]/g, '');

        if (!trimmedName) {
            toast.error('Tên nhà cung cấp không được để trống', 'Thiếu thông tin');
            return;
        }
        if (!trimmedCode) {
            toast.error('Mã nhà cung cấp không được để trống', 'Thiếu thông tin');
            return;
        }
        if (!trimmedEmail) {
            toast.error('Email liên hệ không được để trống', 'Thiếu thông tin');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            toast.error('Định dạng email không hợp lệ (ví dụ: contact@asus.vn)', 'Sai định dạng');
            return;
        }

        if (cleanPhone) {
            const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
            if (!phoneRegex.test(cleanPhone)) {
                toast.error(
                    'Số điện thoại không hợp lệ (Phải bắt đầu bằng 0 hoặc +84 và gồm 10-11 chữ số)',
                    'Sai định dạng'
                );
                return;
            }
        }

        const payload: SupplierUpdateRequest = {
            code: trimmedCode,
            name: trimmedName,
            email: trimmedEmail,
            contactPerson: editForm.contactPerson.trim() || undefined,
            phoneNumber: cleanPhone || undefined,
            address: editForm.address.trim() || undefined,
            taxCode: editForm.taxCode.trim() || undefined,
            status: editForm.status,
        };

        setIsSubmitting(true);
        try {
            const updated = await adminSupplierService.updateSupplier(editForm.id, payload);
            toast.success(
                `Đã cập nhật nhà cung cấp "${updated.name}" thành công!`,
                'Cập nhật thành công'
            );
            setIsEditModalOpen(false);
            setEditForm(null);
            loadSuppliers();
        } catch (err: any) {
            toast.error(
                err?.message || 'Không thể cập nhật nhà cung cấp. Vui lòng kiểm tra lại dữ liệu.',
                'Lỗi cập nhật'
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    /**
     * Sao chép clipboard
     */
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.info(`Đã sao chép ${label}: ${text}`, 'Sao chép');
    };

    // Columns Configuration for AdminTable
    const columns: Column<SupplierItem>[] = [
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (sup) => (
                <div className="flex items-center gap-3.5 py-1">
                    <div className="relative group shrink-0">
                        <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 shadow-xs p-0.5 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-md">
                            <img
                                src={sup.logo}
                                alt={sup.name}
                                className="w-full h-full object-cover rounded-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=160&q=80';
                                }}
                            />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm truncate max-w-[240px]">
                                {sup.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {sup.code}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                            <span>
                                MST: <strong className="font-mono text-gray-600">{sup.taxCode}</strong>
                            </span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact',
            header: 'Người đại diện & Liên hệ',
            render: (sup) => (
                <div className="space-y-1 text-xs">
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{sup.contactPerson.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        {sup.phone !== '---' ? (
                            <a
                                href={`tel:${sup.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-[11px]"
                            >
                                <Phone className="w-3 h-3 text-blue-500" />
                                {sup.phone}
                            </a>
                        ) : (
                            <span className="text-[11px] text-gray-400">Chưa có SĐT</span>
                        )}
                        <a
                            href={`mailto:${sup.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600 hover:underline text-[11px] truncate max-w-[160px]"
                            title={sup.email}
                        >
                            <Mail className="w-3 h-3 text-gray-400" />
                            {sup.email}
                        </a>
                    </div>
                </div>
            ),
        },
        {
            key: 'address',
            header: 'Địa chỉ trụ sở',
            render: (sup) => (
                <div className="text-xs text-gray-600 max-w-[240px] truncate" title={sup.address}>
                    {sup.address}
                </div>
            ),
        },
        {
            key: 'dates',
            header: 'Thời gian',
            render: (sup) => (
                <div className="space-y-0.5 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1" title="Ngày tạo">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{sup.createdDate}</span>
                    </div>
                    {sup.lastModifiedDate && sup.lastModifiedDate !== sup.createdDate && (
                        <div className="flex items-center gap-1 text-gray-400 text-[10px]" title="Cập nhật gần nhất">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Sửa: {sup.lastModifiedDate}</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (sup) => {
                const isActive = sup.status === 'ACTIVE';

                return (
                    <button
                        type="button"
                        onClick={(e) => handleToggleStatus(sup, e)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:shadow-xs ${isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                            }`}
                        title="Click để đổi nhanh trạng thái"
                    >
                        {isActive ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Đang hợp tác
                            </>
                        ) : (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                Ngừng hợp tác
                            </>
                        )}
                    </button>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (sup) => (
                <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(sup)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Xem hồ sơ chi tiết NCC"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenEdit(sup, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Chỉnh sửa thông tin"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleOpenDelete(sup, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa nhà cung cấp"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Tabs for Add / Edit Modal
    const modalFormTabs: ModalTab[] = [
        { id: 'basic', label: '1. Thông tin doanh nghiệp', icon: Building2 },
        { id: 'contact', label: '2. Đại diện & Địa chỉ', icon: User },
    ];

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        { id: 'overview', label: 'Hồ sơ pháp lý & Liên hệ', icon: Building2 },
        { id: 'orders', label: 'Đơn nhập hàng liên kết', icon: Package },
    ];

    return (
        <div className="space-y-6">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        <span>Quản lý nhập hàng</span>
                        <span>/</span>
                        <span>Đối tác phân phối</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Building2 className="w-7 h-7 text-blue-600" />
                        Quản lý nhà cung cấp
                    </h1>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadSuppliers(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all shadow-xs disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw
                            className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        <span>Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs"
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        Xuất Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAddForm(initialAddFormState);
                            setActiveAddTab('basic');
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm nhà cung cấp
                    </button>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-sm">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                            <span className="font-bold">Đã xảy ra lỗi:</span> {error}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadSuppliers()}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Tổng nhà cung cấp
                        </p>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">
                            {totalElements}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Đang hợp tác (ACTIVE)
                        </p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">
                            {activeCount}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Ngừng hợp tác (INACTIVE)
                        </p>
                        <h3 className="text-2xl font-black text-gray-600 mt-1">
                            {inactiveCount}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
                        <XCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>



            {/* Filter Section */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                values={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm kiếm nhà cung cấp..."
            />

            {/* Suppliers Data Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <AdminTable
                    columns={columns}
                    data={suppliers}
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
                    itemUnitName="nhà cung cấp"
                    emptyText="Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc tìm kiếm hiện tại."
                />
            </div>

            {/* ========================================================================= */}
            {/* ADD SUPPLIER MODAL                                                        */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm nhà cung cấp mới"
                subtitle="Nhập thông tin pháp lý, mã định danh và thông tin liên hệ đại diện"
                size="lg"
                tabs={modalFormTabs}
                activeTab={activeAddTab}
                onTabChange={setActiveAddTab}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            {activeAddTab === 'contact' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveAddTab('basic')}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Quay lại
                                </button>
                            )}
                            {activeAddTab === 'basic' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveAddTab('contact')}
                                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
                                >
                                    Tiếp theo: Đại diện & Địa chỉ
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAdd}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Lưu nhà cung cấp</span>
                            </button>
                        </div>
                    </div>
                }
            >
                {activeAddTab === 'basic' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Tên nhà cung cấp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Công ty TNHH Asus Việt Nam..."
                                    value={addForm.name}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Mã nhà cung cấp <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: NCC_ASUS, NCC_FPT..."
                                    value={addForm.code}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, code: e.target.value.toUpperCase() })
                                    }
                                    className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Email chính thức <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    placeholder="contact@nhacungcap.vn"
                                    value={addForm.email}
                                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Mã số thuế doanh nghiệp (MST)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: 0312345678"
                                    value={addForm.taxCode}
                                    onChange={(e) => setAddForm({ ...addForm, taxCode: e.target.value })}
                                    className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Trạng thái hoạt động
                            </label>
                            <select
                                value={addForm.status}
                                onChange={(e) =>
                                    setAddForm({
                                        ...addForm,
                                        status: e.target.value as BackendSupplierStatus,
                                    })
                                }
                                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
                                <option value="INACTIVE">Ngừng hợp tác (INACTIVE)</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeAddTab === 'contact' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Họ và tên người đại diện liên hệ
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                    value={addForm.contactPerson}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, contactPerson: e.target.value })
                                    }
                                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Số điện thoại liên hệ
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Ví dụ: 0901234567 hoặc +84901234567"
                                    value={addForm.phoneNumber}
                                    onChange={(e) =>
                                        setAddForm({ ...addForm, phoneNumber: e.target.value })
                                    }
                                    className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Địa chỉ trụ sở / Kho xuất hàng
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                                value={addForm.address}
                                onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                                className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT SUPPLIER MODAL                                                       */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Chỉnh sửa: ${editForm.name}`}
                    subtitle={`Cập nhật thông tin chi tiết nhà cung cấp mã [${editForm.code}]`}
                    size="lg"
                    tabs={modalFormTabs}
                    activeTab={activeEditTab}
                    onTabChange={setActiveEditTab}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Lưu thay đổi</span>
                            </button>
                        </div>
                    }
                >
                    {activeEditTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Tên nhà cung cấp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Mã nhà cung cấp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.code}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                code: e.target.value.toUpperCase(),
                                            })
                                        }
                                        className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Email chính thức <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, email: e.target.value })
                                        }
                                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Mã số thuế doanh nghiệp (MST)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.taxCode}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, taxCode: e.target.value })
                                        }
                                        className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Trạng thái hoạt động
                                </label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            status: e.target.value as BackendSupplierStatus,
                                        })
                                    }
                                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
                                    <option value="INACTIVE">Ngừng hợp tác (INACTIVE)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeEditTab === 'contact' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Họ và tên người đại diện
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.contactPerson}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, contactPerson: e.target.value })
                                        }
                                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Số điện thoại liên hệ
                                    </label>
                                    <input
                                        type="tel"
                                        value={editForm.phoneNumber}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, phoneNumber: e.target.value })
                                        }
                                        className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Địa chỉ trụ sở / Kho xuất
                                </label>
                                <textarea
                                    rows={3}
                                    value={editForm.address}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, address: e.target.value })
                                    }
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* DETAIL SUPPLIER MODAL                                                     */}
            {/* ========================================================================= */}
            {selectedSupplier && (
                <AdminModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title={
                        <div className="flex items-center gap-3">
                            <span className="truncate">{selectedSupplier.name}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {selectedSupplier.code}
                            </span>
                        </div>
                    }
                    subtitle={`Hồ sơ chi tiết nhà cung cấp [${selectedSupplier.name}]`}
                    size="xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(tabId) => setActiveDetailTab(tabId as 'overview' | 'orders')}
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                    Thêm vào hệ thống: <strong>{selectedSupplier.createdDate}</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedSupplier);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    Chỉnh sửa hồ sơ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    }
                >
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-5">
                            {/* Company Summary Banner */}
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/60 border border-blue-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white p-1 border border-blue-200 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selectedSupplier.logo}
                                            alt={selectedSupplier.name}
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {selectedSupplier.name}
                                            </h3>
                                            <span
                                                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${selectedSupplier.status === 'ACTIVE'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                                    }`}
                                            >
                                                {selectedSupplier.status === 'ACTIVE'
                                                    ? 'Đang hợp tác'
                                                    : 'Ngừng hợp tác'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
                                            <span>
                                                Mã số thuế:{' '}
                                                <strong className="font-mono text-gray-800">
                                                    {selectedSupplier.taxCode}
                                                </strong>
                                            </span>

                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCopy(selectedSupplier.taxCode, 'Mã số thuế')
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs inline-flex items-center gap-1.5"
                                    >
                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                        Copy MST
                                    </button>
                                </div>
                            </div>

                            {/* Contact Details Card */}
                            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-blue-600" />
                                        Thông tin đầu mối đại diện & Liên hệ
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-center ">
                                        <span className="text-gray-500 mr-3">Người đại diện:</span>
                                        <span className="font-bold text-gray-900">
                                            {selectedSupplier.contactPerson.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center ">
                                        <span className="text-gray-500 mr-3">Số điện thoại:</span>
                                        {selectedSupplier.phone !== '---' ? (
                                            <a
                                                href={`tel:${selectedSupplier.phone}`}
                                                className="font-mono font-bold text-blue-600 hover:underline"
                                            >
                                                {selectedSupplier.phone}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">Chưa cập nhật</span>
                                        )}
                                    </div>
                                    <div className="flex items-center ">
                                        <span className="text-gray-500 mr-3">Email:</span>
                                        <a
                                            href={`mailto:${selectedSupplier.email}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {selectedSupplier.email}
                                        </a>
                                    </div>
                                    <div className="flex items-center ">
                                        <span className="text-gray-500 mr-3">Mã định danh NCC:</span>
                                        <span className="font-mono font-bold text-gray-800">
                                            {selectedSupplier.code}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Address Card */}
                            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                                <span className="text-xs font-bold text-gray-600 uppercase block">
                                    Trụ sở doanh nghiệp & Kho giao hàng:
                                </span>
                                <p className="text-xs text-gray-700 flex items-start gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                    <span>{selectedSupplier.address}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'orders' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase">
                                    Lịch sử đơn nhập hàng từ NCC này ({supplierOrders.length} đơn)
                                </span>
                            </div>

                            {isLoadingOrders ? (
                                <div className="p-8 text-center bg-gray-50 rounded-2xl flex items-center justify-center gap-2 text-xs text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span>Đang tải lịch sử đơn nhập hàng...</span>
                                </div>
                            ) : supplierOrders.length > 0 ? (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-2.5">Mã đơn nhập</th>
                                                <th className="px-4 py-2.5">Tên đơn</th>
                                                <th className="px-4 py-2.5">Thời điểm đặt</th>
                                                <th className="px-4 py-2.5">Tổng giá trị</th>
                                                <th className="px-4 py-2.5">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {supplierOrders.map((order: any) => (
                                                <tr key={order.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                                                        {order.code}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-800 font-medium">
                                                        {order.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatDateTime(order.orderDate)}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-900">
                                                        {Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${order.status === 'RECEIVED'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : order.status === 'APPROVED'
                                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                    : order.status === 'CANCELLED'
                                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                }`}
                                                        >
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">
                                        Chưa có đơn nhập hàng nào liên kết với nhà cung cấp này trong hệ thống.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </AdminModal>
            )}

            {/* ========================================================================= */}
            {/* TOGGLE STATUS CONFIRMATION MODAL                                          */}
            {/* ========================================================================= */}
            <AdminConfirmModal
                isOpen={Boolean(statusTargetSupplier)}
                onClose={() => setStatusTargetSupplier(null)}
                onConfirm={handleConfirmToggleStatus}
                title="Thay đổi trạng thái nhà cung cấp"
                message={
                    statusTargetSupplier
                        ? `Bạn có chắc chắn muốn chuyển trạng thái nhà cung cấp "${statusTargetSupplier.name
                        }" sang ${statusTargetSupplier.status === 'ACTIVE'
                            ? 'Ngừng hợp tác (INACTIVE)'
                            : 'Đang hợp tác (ACTIVE)'
                        }?`
                        : ''
                }
                confirmText={
                    statusTargetSupplier?.status === 'ACTIVE'
                        ? 'Ngừng hợp tác'
                        : 'Kích hoạt hợp tác'
                }
                variant={statusTargetSupplier?.status === 'ACTIVE' ? 'warning' : 'success'}
                isLoading={isTogglingStatus}
            />

            {/* ========================================================================= */}
            {/* DELETE CONFIRMATION MODAL                                                 */}
            {/* ========================================================================= */}
            <AdminConfirmModal
                isOpen={Boolean(deleteTargetSupplier)}
                onClose={() => setDeleteTargetSupplier(null)}
                onConfirm={handleConfirmDelete}
                title="Xác nhận xóa nhà cung cấp?"
                message={
                    deleteTargetSupplier
                        ? `Bạn có chắc chắn muốn xóa nhà cung cấp "${deleteTargetSupplier.name}" (${deleteTargetSupplier.code})? Hành động này sẽ thực hiện xóa mềm đối tác khỏi hệ thống.`
                        : ''
                }
                confirmText="Xác nhận xóa"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
