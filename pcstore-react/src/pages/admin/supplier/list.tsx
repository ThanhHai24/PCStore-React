import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Building2,
    Plus,
    Edit,
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
    XCircle,
    ArrowUpDown,
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
    AdminTextarea,
    type AdminSelectOption,
    type ModalTab,
} from '../../../components/admin/common/modal';
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

    // Options cho Select Dropdown trạng thái NCC
    const supplierStatusOptions: AdminSelectOption[] = [
        {
            label: 'Đang hợp tác (ACTIVE)',
            value: 'ACTIVE',
            dotColor: 'bg-emerald-500',
            badge: 'ACTIVE',
            description: 'Cho phép tạo đơn đặt hàng (PO) và phiếu nhập kho từ đối tác này',
        },
        {
            label: 'Ngừng hợp tác (INACTIVE)',
            value: 'INACTIVE',
            dotColor: 'bg-gray-400',
            badge: 'INACTIVE',
            description: 'Tạm khóa giao dịch đặt hàng mới với nhà cung cấp này',
        },
    ];

    // Options cho Select Dropdown sắp xếp danh sách NCC
    const supplierSortOptions: AdminSelectOption[] = [
        {
            label: 'Mới thêm gần nhất',
            value: 'createdDate,DESC',
            description: 'Sắp xếp theo ngày tạo từ mới đến cũ',
        },
        {
            label: 'Cũ nhất trước',
            value: 'createdDate,ASC',
            description: 'Sắp xếp theo ngày tạo từ cũ đến mới',
        },
        {
            label: 'Tên nhà cung cấp (A → Z)',
            value: 'name,ASC',
            description: 'Sắp xếp theo bảng chữ cái tăng dần',
        },
        {
            label: 'Tên nhà cung cấp (Z → A)',
            value: 'name,DESC',
            description: 'Sắp xếp theo bảng chữ cái giảm dần',
        },
        {
            label: 'Mã nhà cung cấp (A → Z)',
            value: 'code,ASC',
            description: 'Sắp xếp theo mã định danh NCC',
        },
    ];

    // Filter fields configuration for AdminFilter (hiển thị bên trong popover khi bấm nút Bộ lọc)
    const filterFields: FilterField[] = [
        {
            id: 'status',
            label: 'Trạng thái hoạt động',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả trạng thái', value: '' },
                {
                    label: 'Đang hợp tác',
                    value: 'ACTIVE',
                    dotColor: 'bg-emerald-500',
                    badge: 'ACTIVE',
                    description: 'Đang hoạt động giao dịch nhập hàng',
                },
                {
                    label: 'Ngừng hợp tác',
                    value: 'INACTIVE',
                    dotColor: 'bg-gray-400',
                    badge: 'INACTIVE',
                    description: 'Tạm dừng hợp tác phân phối',
                },
            ],
        },
        {
            id: 'sort',
            label: 'Sắp xếp theo',
            type: 'select',
            icon: ArrowUpDown,
            placeholder: 'Mặc định (Mới nhất)',
            options: supplierSortOptions,
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

                const activeSort = filters.sort || 'createdDate,DESC';

                const response = await adminSupplierService.getAllSuppliers({
                    keyword: searchQuery.trim() || undefined,
                    status: statusParam,
                    page: currentPage - 1, // API backend dùng 0-based index
                    size: pageSize,
                    sort: [activeSort, 'id,DESC'],
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
        [searchQuery, filters.status, filters.sort, quickStatus, currentPage, pageSize, toast]
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

        // Tải chi tiết NCC mới nhất và đơn nhập hàng song song
        setIsLoadingOrders(true);
        try {
            const [fresh, orders] = await Promise.all([
                adminSupplierService.getSupplierById(supplier.numericId).catch(() => null),
                adminSupplierService.getSupplierOrders(supplier.numericId).catch(() => []),
            ]);
            if (fresh) {
                setSelectedSupplier(mapBackendSupplierToItem(fresh));
            }
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

    const getInitials = (name: string, code: string) =>
        (name || code || 'NC')
            .split(' ')
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();

    const renderOrderStatusIndicator = (status?: string) => {
        const s = (status || '').toUpperCase();
        if (s === 'RECEIVED') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    Đã nhập kho
                </span>
            );
        }
        if (s === 'APPROVED') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    Đã duyệt
                </span>
            );
        }
        if (s === 'CANCELLED') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    Đã hủy
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {status || 'Chờ xử lý'}
            </span>
        );
    };

    // Columns Configuration for AdminTable
    const columns: Column<SupplierItem>[] = [
        {
            key: 'supplier',
            header: 'Nhà cung cấp',
            render: (sup) => (
                <div className="flex items-center gap-3 py-0.5 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        {getInitials(sup.name, sup.code)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                className="font-medium text-slate-900 text-sm truncate max-w-[240px]"
                                title={sup.name}
                            >
                                {sup.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[11px] font-mono tabular-nums font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {sup.code}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 min-w-0">
                            <span className="tabular-nums shrink-0">
                                MST: <span className="text-slate-700 font-medium">{sup.taxCode}</span>
                            </span>
                            <span className="text-slate-300">·</span>
                            <a
                                href={`mailto:${sup.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate max-w-[180px] text-slate-500 hover:text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm"
                                title={sup.email}
                            >
                                {sup.email}
                            </a>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact',
            header: 'Liên hệ',
            render: (sup) => (
                <div className="space-y-0.5 text-xs">
                    <div className="font-medium text-slate-800 truncate max-w-[160px]" title={sup.contactPerson.name}>
                        {sup.contactPerson.name}
                    </div>
                    <div>
                        {sup.phone !== '---' ? (
                            <a
                                href={`tel:${sup.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 hover:underline font-mono tabular-nums text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm"
                            >
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                {sup.phone}
                            </a>
                        ) : (
                            <span className="text-slate-400">Chưa có SĐT</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'address',
            header: 'Địa chỉ',
            render: (sup) => (
                <div
                    className="text-xs text-slate-600 max-w-[230px] line-clamp-2 leading-relaxed"
                    title={sup.address}
                >
                    {sup.address}
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
                        className="inline-flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 whitespace-nowrap"
                        title="Click để đổi nhanh trạng thái"
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                        />
                        <span className={isActive ? 'text-slate-700' : 'text-slate-500'}>
                            {isActive ? 'Đang hợp tác' : 'Ngừng hợp tác'}
                        </span>
                    </button>
                );
            },
        },
        {
            key: 'dates',
            header: 'Ngày tạo',
            align: 'right',
            render: (sup) => (
                <div className="space-y-0.5 text-right tabular-nums">
                    <div className="text-xs text-slate-700 whitespace-nowrap" title="Ngày tạo">
                        {sup.createdDate}
                    </div>
                    {sup.lastModifiedDate && sup.lastModifiedDate !== sup.createdDate && (
                        <div className="text-[11px] text-slate-400 whitespace-nowrap" title="Cập nhật gần nhất">
                            Sửa: {sup.lastModifiedDate}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (sup) => (
                <AdminActionDropdown
                    onView={() => handleOpenDetail(sup)}
                    viewLabel="Xem hồ sơ chi tiết NCC"
                    onEdit={(e) => handleOpenEdit(sup, e)}
                    editLabel="Chỉnh sửa thông tin"
                    moreActions={[
                        {
                            key: 'toggle-status',
                            label:
                                sup.status === 'ACTIVE'
                                    ? 'Ngừng hợp tác'
                                    : 'Kích hoạt hợp tác',
                            description:
                                sup.status === 'ACTIVE'
                                    ? 'Tạm dừng giao dịch nhập hàng'
                                    : 'Mở lại giao dịch với đối tác',
                            icon: sup.status === 'ACTIVE' ? XCircle : CheckCircle2,
                            variant: sup.status === 'ACTIVE' ? 'warning' : 'success',
                            onClick: (e) => handleToggleStatus(sup, e),
                        },
                        {
                            key: 'copy-code',
                            label: 'Sao chép mã NCC',
                            badge: sup.code,
                            icon: Copy,
                            onClick: () => handleCopy(sup.code, 'Mã nhà cung cấp'),
                        },
                    ]}
                    onDelete={(e) => handleOpenDelete(sup, e)}
                    deleteLabel="Xóa nhà cung cấp"
                    deleteDescription="Xóa mềm đối tác khỏi hệ thống"
                />
            ),
        },
    ];

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        { id: 'overview', label: 'Hồ sơ pháp lý & Liên hệ', icon: Building2 },
        { id: 'orders', label: 'Đơn nhập hàng liên kết', icon: Package },
    ];

    return (
        <div className="space-y-4">
            {/* Compact Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý nhà cung cấp
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
                        {totalElements.toLocaleString('vi-VN')} nhà cung cấp · {activeCount} đang hợp tác · {inactiveCount} ngừng hợp tác
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => loadSuppliers(true)}
                        disabled={isRefreshing || isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        title="Tải lại dữ liệu"
                    >
                        <RefreshCw
                            className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        <span>Làm mới</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Error Banner with Retry */}
            {error && (
                <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800 text-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                            <span className="font-semibold">Đã xảy ra lỗi:</span> {error}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadSuppliers()}
                        className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* Single-row Toolbar: Search + Filter + Primary CTA */}
            <AdminFilter
                fields={filterFields}
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                values={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
                searchPlaceholder="Tìm theo tên NCC, mã số thuế, SĐT, email..."
                actions={
                    <button
                        type="button"
                        onClick={() => {
                            setAddForm(initialAddFormState);
                            setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Thêm nhà cung cấp</span>
                    </button>
                }
            />

            {/* Suppliers Data Table (Border-first, no outer card-in-card) */}
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

            {/* ========================================================================= */}
            {/* ADD SUPPLIER MODAL (Flat 2-column form, no nested cards)                  */}
            {/* ========================================================================= */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm nhà cung cấp mới"
                subtitle="Nhập thông tin doanh nghiệp, mã số thuế và đầu mối liên hệ"
                size="lg"
                footer={
                    <div className="flex items-center justify-end gap-2.5 w-full">
                        <AdminButton
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddModalOpen(false)}
                            disabled={isSubmitting}
                        >
                            Hủy bỏ
                        </AdminButton>
                        <AdminButton
                            type="button"
                            variant="primary"
                            onClick={handleSaveAdd}
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            loadingText="Đang lưu..."
                        >
                            Lưu nhà cung cấp
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AdminInput
                            label="Tên nhà cung cấp"
                            required
                            placeholder="Ví dụ: Công ty TNHH Asus Việt Nam..."
                            value={addForm.name}
                            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        />
                        <AdminInput
                            label="Mã nhà cung cấp"
                            required
                            placeholder="Ví dụ: NCC_ASUS, NCC_FPT..."
                            value={addForm.code}
                            onChange={(e) =>
                                setAddForm({ ...addForm, code: e.target.value.toUpperCase() })
                            }
                            className="font-mono uppercase font-semibold tabular-nums"
                        />
                        <AdminInput
                            label="Mã số thuế doanh nghiệp (MST)"
                            placeholder="Ví dụ: 0312345678"
                            value={addForm.taxCode}
                            onChange={(e) => setAddForm({ ...addForm, taxCode: e.target.value })}
                            className="font-mono tabular-nums"
                        />
                        <AdminSelect
                            label="Trạng thái hoạt động"
                            value={addForm.status}
                            options={supplierStatusOptions}
                            onChange={(e) =>
                                setAddForm({
                                    ...addForm,
                                    status: e.target.value as BackendSupplierStatus,
                                })
                            }
                        />
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AdminInput
                                label="Người đại diện liên hệ"
                                placeholder="Ví dụ: Nguyễn Văn A"
                                value={addForm.contactPerson}
                                onChange={(e) =>
                                    setAddForm({ ...addForm, contactPerson: e.target.value })
                                }
                            />
                            <AdminInput
                                label="Số điện thoại liên hệ"
                                type="tel"
                                placeholder="Ví dụ: 0901234567 hoặc +84901234567"
                                value={addForm.phoneNumber}
                                onChange={(e) =>
                                    setAddForm({ ...addForm, phoneNumber: e.target.value })
                                }
                                className="font-mono tabular-nums"
                            />
                        </div>

                        <AdminInput
                            label="Email chính thức"
                            required
                            type="email"
                            placeholder="contact@nhacungcap.vn"
                            value={addForm.email}
                            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        />

                        <AdminTextarea
                            label="Địa chỉ trụ sở / Kho xuất hàng"
                            rows={3}
                            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                            value={addForm.address}
                            onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                        />
                    </div>
                </div>
            </AdminModal>

            {/* ========================================================================= */}
            {/* EDIT SUPPLIER MODAL (Flat 2-column form, no nested cards)                 */}
            {/* ========================================================================= */}
            {editForm && (
                <AdminModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Chỉnh sửa: ${editForm.name}`}
                    subtitle={`Cập nhật thông tin nhà cung cấp mã [${editForm.code}]`}
                    size="lg"
                    footer={
                        <div className="flex items-center justify-end gap-2.5 w-full">
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Hủy bỏ
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="primary"
                                onClick={handleSaveEdit}
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                                loadingText="Đang lưu..."
                            >
                                Lưu thay đổi
                            </AdminButton>
                        </div>
                    }
                >
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <AdminInput
                                label="Tên nhà cung cấp"
                                required
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                            <AdminInput
                                label="Mã nhà cung cấp"
                                required
                                value={editForm.code}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        code: e.target.value.toUpperCase(),
                                    })
                                }
                                className="font-mono uppercase font-semibold tabular-nums"
                            />
                            <AdminInput
                                label="Mã số thuế doanh nghiệp (MST)"
                                value={editForm.taxCode}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, taxCode: e.target.value })
                                }
                                className="font-mono tabular-nums"
                            />
                            <AdminSelect
                                label="Trạng thái hoạt động"
                                value={editForm.status}
                                options={supplierStatusOptions}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        status: e.target.value as BackendSupplierStatus,
                                    })
                                }
                            />
                        </div>

                        <div className="border-t border-slate-200 pt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <AdminInput
                                    label="Người đại diện liên hệ"
                                    value={editForm.contactPerson}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, contactPerson: e.target.value })
                                    }
                                />
                                <AdminInput
                                    label="Số điện thoại liên hệ"
                                    type="tel"
                                    value={editForm.phoneNumber}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, phoneNumber: e.target.value })
                                    }
                                    className="font-mono tabular-nums"
                                />
                            </div>

                            <AdminInput
                                label="Email chính thức"
                                required
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, email: e.target.value })
                                }
                            />

                            <AdminTextarea
                                label="Địa chỉ trụ sở / Kho xuất hàng"
                                rows={3}
                                value={editForm.address}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, address: e.target.value })
                                }
                            />
                        </div>
                    </div>
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
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="truncate">{selectedSupplier.name}</span>
                            <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {selectedSupplier.code}
                            </span>
                        </div>
                    }
                    subtitle={`Hồ sơ chi tiết nhà cung cấp`}
                    size="xl"
                    tabs={detailModalTabs}
                    activeTab={activeDetailTab}
                    onTabChange={(tabId) => setActiveDetailTab(tabId as 'overview' | 'orders')}
                    footer={
                        <div className="flex items-center justify-between w-full gap-3">
                            <span className="text-xs text-slate-500 tabular-nums">
                                Ngày tạo: <strong className="font-medium text-slate-700">{selectedSupplier.createdDate}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                                <AdminButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEdit(selectedSupplier);
                                    }}
                                    icon={Edit}
                                >
                                    Chỉnh sửa hồ sơ
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
                    {activeDetailTab === 'overview' && (
                        <div className="space-y-4">
                            {/* Flat Company Summary Header */}
                            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-11 h-11 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold text-sm shrink-0 flex items-center justify-center">
                                        {getInitials(selectedSupplier.name, selectedSupplier.code)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h3 className="text-base font-semibold text-slate-900">
                                                {selectedSupplier.name}
                                            </h3>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${selectedSupplier.status === 'ACTIVE'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-slate-400'
                                                        }`}
                                                />
                                                {selectedSupplier.status === 'ACTIVE'
                                                    ? 'Đang hợp tác'
                                                    : 'Ngừng hợp tác'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                                            Mã số thuế:{' '}
                                            <span className="font-mono font-medium text-slate-800">
                                                {selectedSupplier.taxCode}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleCopy(selectedSupplier.taxCode, 'Mã số thuế')
                                    }
                                    className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                >
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    Copy MST
                                </button>
                            </div>

                            {/* Flat Contact & Address Specification Table */}
                            <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200 text-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                                    <div className="p-3.5">
                                        <div className="text-xs text-slate-500">Người đại diện</div>
                                        <div className="font-medium text-slate-900 mt-0.5">
                                            {selectedSupplier.contactPerson.name}
                                        </div>
                                    </div>
                                    <div className="p-3.5">
                                        <div className="text-xs text-slate-500">Số điện thoại</div>
                                        <div className="mt-0.5">
                                            {selectedSupplier.phone !== '---' ? (
                                                <a
                                                    href={`tel:${selectedSupplier.phone}`}
                                                    className="font-mono tabular-nums font-medium text-blue-600 hover:underline"
                                                >
                                                    {selectedSupplier.phone}
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">Chưa cập nhật</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                                    <div className="p-3.5">
                                        <div className="text-xs text-slate-500">Email chính thức</div>
                                        <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <a
                                                href={`mailto:${selectedSupplier.email}`}
                                                className="text-blue-600 hover:underline truncate"
                                            >
                                                {selectedSupplier.email}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="p-3.5">
                                        <div className="text-xs text-slate-500">Mã định danh NCC</div>
                                        <div className="font-mono tabular-nums font-medium text-slate-900 mt-0.5">
                                            {selectedSupplier.code}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3.5">
                                    <div className="text-xs text-slate-500">Trụ sở doanh nghiệp & Kho giao hàng</div>
                                    <div className="text-slate-700 mt-1 flex items-start gap-1.5">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                        <span>{selectedSupplier.address}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeDetailTab === 'orders' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                                <span className="font-semibold text-slate-800">
                                    Lịch sử đơn nhập hàng ({supplierOrders.length} đơn)
                                </span>
                                {supplierOrders.length > 0 && (
                                    <span>
                                        Tổng giá trị:{' '}
                                        <strong className="text-slate-900">
                                            {supplierOrders
                                                .reduce((sum, o: any) => sum + Number(o.totalAmount || 0), 0)
                                                .toLocaleString('vi-VN')}{' '}
                                            ₫
                                        </strong>
                                    </span>
                                )}
                            </div>

                            {isLoadingOrders ? (
                                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center gap-2 text-xs text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span>Đang tải lịch sử đơn nhập hàng...</span>
                                </div>
                            ) : supplierOrders.length > 0 ? (
                                <div className="border border-slate-200 rounded-md overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="px-3.5 py-2.5">Mã đơn nhập</th>
                                                <th className="px-3.5 py-2.5">Tên đơn</th>
                                                <th className="px-3.5 py-2.5">Thời điểm đặt</th>
                                                <th className="px-3.5 py-2.5 text-right">Tổng giá trị</th>
                                                <th className="px-3.5 py-2.5">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/80 bg-white">
                                            {supplierOrders.map((order: any) => (
                                                <tr key={order.id} className="hover:bg-slate-50/80">
                                                    <td className="px-3.5 py-2.5 font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                                                        {order.code}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                                                        {order.name}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-600 tabular-nums whitespace-nowrap">
                                                        {formatDateTime(order.orderDate)}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
                                                        {Number(order.totalAmount || 0).toLocaleString('vi-VN')} ₫
                                                    </td>
                                                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                                                        {renderOrderStatusIndicator(order.status)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 rounded-md border border-dashed border-slate-300">
                                    <Package className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">
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
