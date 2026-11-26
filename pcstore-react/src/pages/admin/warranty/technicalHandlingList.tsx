import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Wrench,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    Search,
    RefreshCw,
    Download,
    Eye,
    Edit,
    User,
    UserCheck,
    Cpu,
    Component,
    FileText,
    Barcode,
    Sparkles,
    ShieldCheck,
    Plus,
    Trash2,
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
import { useToast } from '../../../components/admin/common/toast';
import { adminWarrantyService } from '../../../services/adminWarrantyService';
import { adminProductService } from '../../../services/adminProductService';
import { adminUserService } from '../../../services/adminUserService';
import type {
    WarrantyRequestItem,
    WarrantyRequestStatus,
    TechnicalHandlingUpdateInput,
} from '../../../types/adminWarranty';

const DEFAULT_TECHNICIANS = [
    { id: 12, name: 'Trịnh Quốc Bảo (Kỹ thuật trưởng)', phone: '0981122334' },
    { id: 14, name: 'Đặng Tuấn Anh (Kỹ thuật viên phần cứng)', phone: '0977223344' },
    { id: 15, name: 'Lê Hoàng Long (Kỹ thuật viên VGA & Main)', phone: '0966334455' },
    { id: 16, name: 'Nguyễn Văn Minh (Kỹ thuật viên hệ thống)', phone: '0933445566' },
];

export default function TechnicalHandlingList() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Data State
    const [loading, setLoading] = useState<boolean>(true);
    const [requests, setRequests] = useState<WarrantyRequestItem[]>([]);
    const [totalElements, setTotalElements] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);

    // Filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filters, setFilters] = useState<Record<string, string>>({
        status: '',
    });
    const [quickStatusTab, setQuickStatusTab] = useState<string>('ALL');

    // Modals
    const [selectedRequest, setSelectedRequest] = useState<WarrantyRequestItem | null>(null);
    const [isHandlingOpen, setIsHandlingOpen] = useState<boolean>(false);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [detailTab, setDetailTab] = useState<string>('diagnostic');

    // Handling Form State
    const [techId, setTechId] = useState<string>('');
    const [faultType, setFaultType] = useState<string>('MANUFACTURER');
    const [inspectionNotes, setInspectionNotes] = useState<string>('');
    const [solution, setSolution] = useState<string>('');
    const [status, setStatus] = useState<string>('IN_PROGRESS');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Technicians & Spare parts state
    const [technicians, setTechnicians] = useState<Array<{ id: number; name: string; phone?: string }>>(DEFAULT_TECHNICIANS);
    const [sparePartProductId, setSparePartProductId] = useState<string>('');
    const [sparePartQty, setSparePartQty] = useState<number>(1);
    const [sparePartCost, setSparePartCost] = useState<number>(0);
    const [isAddingPart, setIsAddingPart] = useState<boolean>(false);
    const [catalogProducts, setCatalogProducts] = useState<Array<{ id: number; name: string; code?: string; price?: number }>>([]);

    // Load catalog products & real technicians
    useEffect(() => {
        adminProductService.getAllProducts({ size: 100 })
            .then((res: any) => {
                if (res?.content) {
                    setCatalogProducts(
                        res.content.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            code: p.code,
                            price: Number(p.price) || 0,
                        }))
                    );
                }
            })
            .catch(() => { });

        adminUserService.getAllUsers({ size: 100 })
            .then((res: any) => {
                if (res?.content && Array.isArray(res.content)) {
                    const staff = res.content
                        .filter((u: any) => {
                            const role = String(u.role || '').toUpperCase();
                            return role !== 'CUSTOMER' && role !== 'USER';
                        })
                        .map((u: any) => ({
                            id: Number(u.id),
                            name: u.fullName || u.username || `Nhân viên #${u.id}`,
                            phone: u.phone || undefined,
                        }));
                    if (staff.length > 0) {
                        setTechnicians(staff);
                    }
                }
            })
            .catch(() => { });
    }, []);

    // Fetch requests
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminWarrantyService.getAllRequests({
                keyword: searchQuery || undefined,
                status: filters.status ? (filters.status as WarrantyRequestStatus) : undefined,
                page: page - 1,
                size: pageSize,
            });

            setRequests(res.content || []);
            const total = res.totalElements || res.content?.length || 0;
            setTotalElements(total);
            setTotalPages(Math.max(1, res.totalPages || Math.ceil(total / pageSize)));
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Lỗi tải dữ liệu',
                message: error.message || 'Không thể tải danh sách ca kỹ thuật',
            });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.status, page, pageSize, addToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = totalElements || requests.length;
        const pending = requests.filter((r) => r.status === 'PENDING' || r.status === 0).length;
        const inProgress = requests.filter((r) => r.status === 'IN_PROGRESS' || r.status === 1).length;
        const completed = requests.filter((r) => r.status === 'COMPLETED' || r.status === 3).length;
        return { total, pending, inProgress, completed };
    }, [requests, totalElements]);

    // Open Handling Modal
    const handleOpenHandling = (r: WarrantyRequestItem) => {
        setSelectedRequest(r);
        setTechId(r.technicianId ? String(r.technicianId) : (technicians[0] ? String(technicians[0].id) : ''));
        setFaultType(r.faultType || 'MANUFACTURER');
        setInspectionNotes(r.inspectionNotes || '');
        setSolution(r.solution || '');
        setStatus(String(r.status));
        setSparePartProductId('');
        setSparePartQty(1);
        setSparePartCost(0);
        setIsHandlingOpen(true);
    };

    // Submit Handling Update
    const handleSubmitHandling = async () => {
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
            const tech = technicians.find((t) => String(t.id) === techId);
            const input: TechnicalHandlingUpdateInput = {
                requestId: selectedRequest.id,
                technicianId: tech ? tech.id : (techId ? Number(techId) : undefined),
                technicianName: tech ? tech.name : undefined,
                faultType: faultType as any,
                inspectionNotes: inspectionNotes.trim(),
                solution: solution.trim(),
                status: status as any,
            };

            await adminWarrantyService.updateTechnicalHandling(input);
            addToast({
                type: 'success',
                title: 'Cập nhật thành công',
                message: `Đã lưu biên bản xử lý kỹ thuật cho ca ${selectedRequest.requestCode}`,
            });
            setIsHandlingOpen(false);
            fetchRequests();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Cập nhật thất bại',
                message: error.message || 'Lỗi lưu thông tin kỹ thuật',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add Spare Part to Request
    const handleAddPart = async () => {
        if (!selectedRequest) return;
        const parsedProductId = Number(sparePartProductId);
        if (!sparePartProductId || isNaN(parsedProductId) || parsedProductId <= 0) {
            addToast({ type: 'warning', title: 'Cảnh báo', message: 'Vui lòng chọn linh kiện thay thế từ danh mục sản phẩm' });
            return;
        }
        if (!sparePartQty || sparePartQty < 1) {
            addToast({ type: 'warning', title: 'Cảnh báo', message: 'Số lượng linh kiện phải lớn hơn hoặc bằng 1' });
            return;
        }

        setIsAddingPart(true);
        try {
            const updated = await adminWarrantyService.addPartToRequest(selectedRequest.id, {
                productId: parsedProductId,
                quantity: Number(sparePartQty),
                unitCost: Math.max(0, Number(sparePartCost) || 0),
            });

            setSelectedRequest({ ...updated });
            setSparePartProductId('');
            setSparePartQty(1);
            setSparePartCost(0);
            addToast({ type: 'success', title: 'Đã thêm linh kiện', message: 'Linh kiện đã được xuất cho ca này' });
            fetchRequests();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Lỗi', message: error.message || 'Không thể thêm linh kiện' });
        } finally {
            setIsAddingPart(false);
        }
    };

    // Export CSV
    const handleExport = () => {
        if (requests.length === 0) {
            addToast({ type: 'warning', title: 'Thông báo', message: 'Không có dữ liệu để xuất' });
            return;
        }

        const headers = ['Mã phiếu', 'Serial máy', 'Sản phẩm', 'Khách hàng', 'Kỹ thuật viên', 'Phân loại lỗi', 'Chẩn đoán', 'Biện pháp giải quyết', 'Trạng thái'];
        const csvRows = requests.map((r) => [
            `"${r.requestCode}"`,
            `"${r.serialNumber}"`,
            `"${r.productName.replace(/"/g, '""')}"`,
            `"${r.customerName}"`,
            `"${r.technicianName || 'Chưa phân công'}"`,
            r.faultType === 'MANUFACTURER'
                ? 'Lỗi nhà sản xuất'
                : r.faultType === 'USER_DAMAGE'
                    ? 'Lỗi người dùng / Ngoại lực'
                    : 'Lỗi phần mềm / BIOS',
            `"${(r.inspectionNotes || '').replace(/"/g, '""')}"`,
            `"${(r.solution || '').replace(/"/g, '""')}"`,
            r.status === 'COMPLETED' || r.status === 3 ? 'Hoàn tất' : 'Đang xử lý',
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xu-ly-ky-thuat-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Thành công', message: 'Đã xuất file báo cáo kỹ thuật' });
    };

    const formatVND = (amount?: number | null) => {
        if (!amount || isNaN(amount)) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Restrained 6px status dot indicator (no colorful rounded-full pills)
    const renderStatusIndicator = (st: WarrantyRequestItem['status']) => {
        if (st === 'PENDING' || st === 0) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Chờ nhận ca</span>
                </span>
            );
        }
        if (st === 'IN_PROGRESS' || st === 1) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span>Đang xử lý</span>
                </span>
            );
        }
        if (st === 'COMPLETED' || st === 3) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Đã xử lý xong</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Từ chối BH</span>
            </span>
        );
    };

    // Table Columns
    const columns: Column<WarrantyRequestItem>[] = [
        {
            key: 'requestCode',
            header: 'Phiếu & Serial',
            render: (item) => (
                <div className="space-y-0.5 min-w-[145px]">
                    <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {item.requestCode}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        SN: {item.serialNumber}
                    </div>
                </div>
            ),
        },
        {
            key: 'productName',
            header: 'Sản phẩm & Chẩn đoán',
            render: (item) => (
                <div className="max-w-[280px] space-y-0.5">
                    <div className="text-xs font-medium text-slate-900 truncate" title={item.productName}>
                        {item.productName}
                    </div>
                    <div
                        className="text-xs text-slate-500 line-clamp-2"
                        title={item.inspectionNotes || item.issueDescription}
                    >
                        {item.inspectionNotes || `Lỗi: ${item.issueDescription}`}
                    </div>
                    {item.solution && (
                        <div className="text-[11px] text-slate-600 truncate" title={item.solution}>
                            Giải pháp: {item.solution}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'technicianName',
            header: 'Kỹ thuật viên & Phân loại',
            render: (item) => {
                const faultBadge =
                    item.faultType === 'MANUFACTURER'
                        ? { label: 'Lỗi NSX (Miễn phí)', cls: 'bg-slate-50 text-slate-700 border-slate-200' }
                        : item.faultType === 'USER_DAMAGE'
                        ? { label: 'Lỗi ngoại lực', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                        : item.faultType === 'SOFTWARE'
                        ? { label: 'Lỗi phần mềm / BIOS', cls: 'bg-slate-50 text-slate-700 border-slate-200' }
                        : { label: 'Chưa kết luận', cls: 'bg-slate-50 text-slate-500 border-slate-200' };

                return (
                    <div className="space-y-1">
                        <div className="text-xs">
                            {item.technicianName ? (
                                <span className="font-medium text-slate-900">{item.technicianName}</span>
                            ) : (
                                <span className="text-amber-700 font-medium">Chờ phân công</span>
                            )}
                        </div>
                        <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border ${faultBadge.cls}`}
                        >
                            {faultBadge.label}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'partsSummary',
            header: 'Linh kiện / Chi phí',
            align: 'right',
            render: (item) => {
                const parts = item.parts || [];
                const totalCost = parts.reduce(
                    (sum, p) => sum + (Number(p.unitCost) || 0) * (Number(p.quantity) || 1),
                    0
                );
                return (
                    <div className="space-y-0.5 text-right tabular-nums whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                            {formatVND(totalCost)}
                        </div>
                        <div className="text-[11px] text-slate-500">{parts.length} linh kiện</div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            header: 'Tiến độ',
            render: (item) => renderStatusIndicator(item.status),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={async () => {
                        setSelectedRequest(item);
                        setDetailTab('diagnostic');
                        setIsDetailOpen(true);
                        try {
                            const fresh = await adminWarrantyService.getRequestById(item.id);
                            setSelectedRequest((prev) =>
                                prev && prev.id === fresh.id ? { ...prev, ...fresh } : prev
                            );
                        } catch {
                            // Keep optimistic row data if detail fetch fails
                        }
                    }}
                    viewLabel="Xem chi tiết"
                    onEdit={() => handleOpenHandling(item)}
                    editLabel="Cập nhật xử lý kỹ thuật"
                />
            ),
        },
    ];

    // Filter fields
    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Tiến độ xử lý',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Tất cả tiến độ', value: '' },
                { label: 'Chờ nhận ca', value: 'PENDING' },
                { label: 'Đang xử lý kỹ thuật', value: 'IN_PROGRESS' },
                { label: 'Đã hoàn tất', value: 'COMPLETED' },
                { label: 'Từ chối bảo hành', value: 'REJECTED' },
            ],
        },
    ];

    const quickTabs = [
        { key: 'ALL', label: 'Tất cả ca xử lý', count: stats.total },
        { key: 'PENDING', label: 'Chờ nhận ca', count: stats.pending },
        { key: 'IN_PROGRESS', label: 'Đang xử lý', count: stats.inProgress },
        { key: 'COMPLETED', label: 'Đã hoàn tất', count: stats.completed },
    ];

    const handleTabChange = (key: string) => {
        setQuickStatusTab(key);
        setFilters((prev) => ({
            ...prev,
            status: key === 'ALL' ? '' : key,
        }));
        setPage(1);
    };

    const detailTabs: ModalTab[] = [
        { id: 'diagnostic', label: 'Kết quả chẩn đoán', icon: Wrench },
        { id: 'parts', label: 'Linh kiện thay thế', icon: Component },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                        Quản lý thông tin xử lý kỹ thuật
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                        {stats.total} ca · {stats.pending} chờ nhận ca · {stats.inProgress} đang xử lý
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <AdminButton
                        variant="secondary"
                        icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />}
                        onClick={fetchRequests}
                    >
                        Làm mới
                    </AdminButton>
                    <AdminButton variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                        Xuất báo cáo
                    </AdminButton>
                    <AdminButton
                        variant="primary"
                        icon={<Component className="w-4 h-4" />}
                        onClick={() => navigate('/admin/warranty/spare-parts')}
                    >
                        Kho linh kiện bảo hành
                    </AdminButton>
                </div>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200">
                {quickTabs.map((tab) => {
                    const isActive = quickStatusTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabChange(tab.key)}
                            className={`pb-2.5 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-px cursor-pointer focus-visible:outline-none focus-visible:text-blue-600 ${
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
                    searchPlaceholder="Tìm theo mã phiếu WR, số serial, tên thiết bị, kỹ thuật..."
                    searchQuery={searchQuery}
                    onSearchChange={(v) => {
                        setSearchQuery(v);
                        setPage(1);
                    }}
                    values={filters}
                    onFilterChange={(vals) => {
                        const nextFilters = { ...filters, ...vals };
                        setFilters(nextFilters);
                        setQuickStatusTab(nextFilters.status || 'ALL');
                        setPage(1);
                    }}
                    onReset={() => {
                        setSearchQuery('');
                        setFilters({ status: '' });
                        setQuickStatusTab('ALL');
                        setPage(1);
                    }}
                />

                <AdminTable
                    columns={columns}
                    data={requests}
                    rowKey="id"
                    loading={loading}
                    totalItems={totalElements}
                    currentPage={page}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    pageSizeOptions={[5, 10, 15, 20, 50]}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                    emptyText="Chưa có ca xử lý kỹ thuật nào"
                />
            </div>

            {/* Modal Handling Update */}
            <AdminModal
                isOpen={isHandlingOpen}
                onClose={() => setIsHandlingOpen(false)}
                title={`Cập nhật thông tin xử lý kỹ thuật: ${selectedRequest?.requestCode}`}
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <AdminButton variant="secondary" onClick={() => setIsHandlingOpen(false)} disabled={isSubmitting}>
                            Hủy
                        </AdminButton>
                        <AdminButton variant="primary" onClick={handleSubmitHandling} isLoading={isSubmitting}>
                            Lưu thông tin kỹ thuật
                        </AdminButton>
                    </div>
                }
            >
                <div className="space-y-4">
                    <dl className="p-3.5 bg-slate-50 rounded-md border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <dt className="text-slate-500">Thiết bị &amp; Serial</dt>
                            <dd className="font-medium text-slate-900 mt-0.5">{selectedRequest?.productName}</dd>
                            <dd className="font-mono text-slate-600 tabular-nums">
                                SN: {selectedRequest?.serialNumber}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Khách hàng &amp; Lỗi ban đầu</dt>
                            <dd className="font-medium text-slate-900 mt-0.5">{selectedRequest?.customerName}</dd>
                            <dd className="text-slate-600 line-clamp-2">{selectedRequest?.issueDescription}</dd>
                        </div>
                    </dl>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <AdminLabel required>Kỹ thuật viên phụ trách</AdminLabel>
                            <AdminSelect
                                value={techId}
                                onChange={(e) => setTechId(e.target.value)}
                                options={[
                                    { label: '-- Chọn kỹ thuật viên --', value: '' },
                                    ...technicians.map((t) => ({ label: t.name, value: String(t.id) })),
                                ]}
                            />
                        </div>

                        <div>
                            <AdminLabel required>Phân loại nguồn gốc lỗi</AdminLabel>
                            <AdminSelect
                                value={faultType}
                                onChange={(e) => setFaultType(e.target.value)}
                                options={[
                                    { label: 'Lỗi nhà sản xuất (Bảo hành miễn phí)', value: 'MANUFACTURER' },
                                    { label: 'Lỗi do người dùng / Rơi vỡ / Sét đánh (Sửa tính phí)', value: 'USER_DAMAGE' },
                                    { label: 'Lỗi phần mềm / Xung đột driver / BIOS', value: 'SOFTWARE' },
                                    { label: 'Khác', value: 'OTHER' },
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <AdminLabel required>Biên bản kiểm tra &amp; Giám định kỹ thuật</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Mô tả nguyên nhân chẩn đoán: Đo xung clock bị mất, tụ đường nguồn chập, cháy chip IO..."
                            value={inspectionNotes}
                            onChange={(e) => setInspectionNotes(e.target.value)}
                        />
                    </div>

                    <div>
                        <AdminLabel required>Biện pháp xử lý &amp; Kết quả kiểm thử</AdminLabel>
                        <AdminTextarea
                            rows={3}
                            placeholder="Đã thay thế linh kiện gì, chạy thử nghiệm bằng phần mềm test tải bao nhiêu lâu..."
                            value={solution}
                            onChange={(e) => setSolution(e.target.value)}
                        />
                    </div>

                    <div>
                        <AdminLabel required>Cập nhật trạng thái ca</AdminLabel>
                        <AdminSelect
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            options={[
                                { label: 'Chờ tiếp nhận / phân công (PENDING)', value: 'PENDING' },
                                { label: 'Đang kiểm tra & xử lý (IN_PROGRESS)', value: 'IN_PROGRESS' },
                                { label: 'Đã xử lý xong hoàn tất (COMPLETED)', value: 'COMPLETED' },
                                { label: 'Từ chối bảo hành (REJECTED)', value: 'REJECTED' },
                            ]}
                        />
                    </div>

                    {/* Section Add Spare Part quickly */}
                    <div className="border-t border-slate-200 pt-4">
                        <div className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>Linh kiện xuất dùng cho ca này</span>
                            <span className="text-slate-500 font-normal normal-case tabular-nums">
                                Đã có: {selectedRequest?.parts?.length || 0} món
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                            <div className="sm:col-span-6">
                                <AdminLabel>Chọn linh kiện từ kho</AdminLabel>
                                <AdminSelect
                                    value={sparePartProductId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSparePartProductId(val);
                                        const matched = catalogProducts.find((p) => String(p.id) === val);
                                        if (matched && matched.price !== undefined) {
                                            setSparePartCost(matched.price);
                                        }
                                    }}
                                    options={[
                                        { label: '-- Chọn sản phẩm / linh kiện --', value: '' },
                                        ...catalogProducts.map((p) => ({
                                            label: `${p.code ? `[${p.code}] ` : ''}${p.name}`,
                                            value: String(p.id),
                                        })),
                                    ]}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <AdminLabel>SL</AdminLabel>
                                <AdminInput
                                    type="number"
                                    min={1}
                                    value={sparePartQty}
                                    onChange={(e) => setSparePartQty(Math.max(1, Number(e.target.value) || 1))}
                                    className="font-mono tabular-nums"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <AdminLabel>Đơn giá (₫)</AdminLabel>
                                <AdminInput
                                    type="number"
                                    min={0}
                                    value={sparePartCost}
                                    onChange={(e) => setSparePartCost(Math.max(0, Number(e.target.value) || 0))}
                                    className="font-mono tabular-nums"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <AdminButton
                                    variant="secondary"
                                    icon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={handleAddPart}
                                    isLoading={isAddingPart}
                                    className="w-full"
                                >
                                    Thêm
                                </AdminButton>
                            </div>
                        </div>

                        {selectedRequest?.parts && selectedRequest.parts.length > 0 && (
                            <div className="mt-3 divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                {selectedRequest.parts.map((p) => (
                                    <div
                                        key={p.id}
                                        className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <span className="font-medium text-slate-900 truncate">{p.productName}</span>
                                        <span className="text-slate-600 font-mono text-[11px] tabular-nums shrink-0">
                                            SL {p.quantity} · {p.serialNumbers?.join(', ') || 'Chưa gắn serial'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </AdminModal>

            {/* Modal Detail */}
            <AdminModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Hồ sơ kỹ thuật thiết bị bảo hành"
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
                {selectedRequest && (
                    <div className="space-y-4">
                        {detailTab === 'diagnostic' && (
                            <div className="space-y-4 text-xs">
                                <div className="px-4 py-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                                            {selectedRequest.requestCode}
                                        </span>
                                        {renderStatusIndicator(selectedRequest.status)}
                                    </div>
                                    <div className="text-slate-500">
                                        Kỹ thuật viên phụ trách:{' '}
                                        <span className="font-medium text-slate-900">
                                            {selectedRequest.technicianName || 'Chưa phân công'}
                                        </span>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                    <div className="px-4 py-3 space-y-1">
                                        <div className="text-slate-500 font-medium">Kết quả giám định</div>
                                        <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                                            {selectedRequest.inspectionNotes || 'Chưa ghi nhận kết quả giám định'}
                                        </p>
                                    </div>
                                    <div className="px-4 py-3 space-y-1">
                                        <div className="text-slate-500 font-medium">Giải pháp xử lý</div>
                                        <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                                            {selectedRequest.solution || 'Chưa ghi nhận giải pháp'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {detailTab === 'parts' && (
                            <div>
                                {selectedRequest.parts && selectedRequest.parts.length > 0 ? (
                                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                        {selectedRequest.parts.map((part) => (
                                            <div
                                                key={part.id}
                                                className="px-4 py-3 text-xs space-y-1"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-medium text-slate-900">{part.productName}</span>
                                                    <span className="font-mono text-slate-700 tabular-nums shrink-0">
                                                        SL: {part.quantity}
                                                    </span>
                                                </div>
                                                <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                                    Serial linh kiện: {part.serialNumbers?.join(', ') || 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
                                        Không có linh kiện thay thế cho ca này
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>
        </div>
    );
}
